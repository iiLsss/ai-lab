import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { retrieveDocuments } from '@/lib/rag/retriever'
import { rewriteQueryWithContext } from '@/lib/rag/query-rewriter'

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
})

/**
 * 构建 RAG 增强的 System Prompt
 * 如果检索到了相关文档，就把它们注入 Prompt 中让模型基于真实资料回答。
 * 如果没有检索到文档，明确告知模型知识库中没有相关内容。
 */
function buildRAGSystemPrompt(retrievedDocs: { content: string; similarity: number; metadata: Record<string, unknown> }[]): string {
	if (retrievedDocs.length === 0) {
		return `你是一个专业的 AI 助手，你背后连接了一个私有知识库。

## 重要提示
系统刚刚在知识库中进行了语义检索，但**没有找到与用户当前问题相关的文档**。

## 回答规则
1. 你必须**首先明确告知用户**："知识库中暂未收录与此问题相关的内容。"
2. 然后你**可以**基于自身知识进行补充回答，但必须标注这是你自身的知识，而非来自知识库。
3. 回答前，请在 <thinking> 标签中分析问题。
4. 请严格按照以下格式回答：
<thinking>
[此处进行深度思考]
</thinking>
> ⚠️ 知识库中暂未收录与此问题相关的内容。以下回答基于 AI 自身的通用知识：

[此处给出正式回答]`
	}

	// 将检索到的文档片段拼接成上下文
	const context = retrievedDocs
		.map((doc, i) => {
			const source = (doc.metadata?.source as string) || '未知来源'
			return `[参考资料 ${i + 1}]（来源: ${source}，相似度: ${(doc.similarity * 100).toFixed(1)}%）\n${doc.content}`
		})
		.join('\n\n---\n\n')

	return `你是一个专业的 AI 助手，可以结合私有知识库中的资料来回答用户问题。

## 参考资料
以下是从知识库中检索到的与用户问题最相关的文档片段：

${context}

## 回答规则
1. **优先**基于上述参考资料来回答用户问题。
2. 如果参考资料中包含答案，请引用具体内容，并在回答末尾标注引用了哪些资料（如 [参考资料 1]）。
3. 如果参考资料中**没有**与问题相关的信息，请明确告知用户"知识库中暂未收录相关内容"，然后再基于你自身的知识进行补充回答。
4. 回答前，请在 <thinking> 标签中分析：哪些资料与问题相关、如何组织回答。
5. 请严格按照以下格式回答：
<thinking>
[分析参考资料与问题的关联性，规划回答结构]
</thinking>
[此处给出正式回答]`
}

export async function POST(req: Request) {
	try {
		const { messages }: { messages: UIMessage[] } = await req.json()

		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return new Response(JSON.stringify({ error: '消息不能为空' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		// ① 提取检索查询文本
		// 如果是多轮对话 → 用 LLM 改写查询（解决代词指代问题）
		// 如果是单轮对话 → 直接用原文
		const model = openrouter.chat('google/gemini-2.5-flash')
		const lastMessage = messages[messages.length - 1]
		const lastMessageText = (lastMessage.parts || [])
			.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
			.map(p => p.text)
			.join(' ')

		let queryText = lastMessageText

		if (messages.length > 1) {
			try {
				queryText = await rewriteQueryWithContext(messages, model)
				console.log(`[RAG] 原始查询: "${lastMessageText}"`)
				console.log(`[RAG] 改写查询: "${queryText}"`)
			} catch (rewriteError) {
				// 改写失败 → 降级为原始查询
				console.warn('[RAG] 查询改写失败，使用原始查询:', rewriteError)
			}
		}

		// ② RAG 检索：从 Supabase 向量数据库中查找相关文档
		let retrievedDocs: { content: string; similarity: number; metadata: Record<string, unknown> }[] = []

		try {
			retrievedDocs = await retrieveDocuments(queryText, {
				topK: 5,
				threshold: 0.7,
			})
			console.log(`[RAG] 检索到 ${retrievedDocs.length} 条相关文档`)
			retrievedDocs.forEach((doc, i) => {
				console.log(`  [${i + 1}] 相似度: ${(doc.similarity * 100).toFixed(1)}% | 来源: ${doc.metadata?.source || '未知'} | 前50字: ${doc.content.slice(0, 50)}...`)
			})
		} catch (ragError) {
			// RAG 检索失败不应该影响聊天功能 → 降级为纯 LLM 模式
			console.warn('[RAG] 检索失败，降级为纯 LLM 模式:', ragError)
		}

		// ③ 根据是否有检索结果，构建不同的 System Prompt
		const systemPrompt = buildRAGSystemPrompt(retrievedDocs)

		// ④ 调用大模型，流式生成回答
		const result = streamText({
			model,
			system: systemPrompt,
			messages: await convertToModelMessages(messages),
			onError({ error }) {
				console.error('[StreamText Error]', error)
			},
		})

		return result.toUIMessageStreamResponse()
	} catch (error) {
		console.error('[Chat API Error]', error)

		const isUpstreamError = error instanceof Error && (error.message.includes('fetch') || error.message.includes('timeout') || error.message.includes('ECONNREFUSED'))

		return new Response(
			JSON.stringify({
				error: isUpstreamError ? 'AI 服务暂时不可用，请稍后重试' : '请求处理失败，请重试',
			}),
			{
				status: isUpstreamError ? 502 : 500,
				headers: { 'Content-Type': 'application/json' },
			},
		)
	}
}
