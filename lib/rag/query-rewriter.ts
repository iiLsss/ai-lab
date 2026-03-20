import { generateText, UIMessage, LanguageModel } from 'ai'

/**
 * 多轮上下文查询改写（Query Condensation）
 *
 * 问题：用户在多轮对话中经常用代词（"它"、"这个"、"第二个"），
 * 如果直接用最后一句话去向量检索，会丢失上下文导致搜不到。
 *
 * 解决方案：用 LLM 将多轮对话浓缩为一个独立的、完整的检索查询。
 *
 * 示例：
 *   User: "streamText 怎么用？"
 *   AI:   "streamText 是..."
 *   User: "它的错误处理呢？"
 *            ↓ LLM 改写
 *   "streamText 的错误处理方法"  ← 上下文完整，检索更精准
 */
export async function rewriteQueryWithContext(messages: UIMessage[], model: LanguageModel): Promise<string> {
	// 取最近 6 条消息（3 轮对话），避免上下文太长
	const recentMessages = messages.slice(-6)

	// 提取每条消息的纯文本
	const conversationText = recentMessages
		.map((m) => {
			const text = (m.parts || [])
				.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
				.map((p) => p.text)
				.join(' ')
			return `${m.role === 'user' ? '用户' : 'AI'}: ${text}`
		})
		.join('\n')

	const { text } = await generateText({
		model,
		system: `你是一个查询改写助手。你的任务是根据多轮对话上下文，将用户最后提出的问题改写为一个独立的、完整的检索查询。

规则：
1. 改写后的查询必须是自包含的——不看对话历史也能完全理解
2. 将代词（"它"、"这个"、"那个"）替换为具体的实体名称
3. 保留所有关键术语、API 名称、专有名词的原始写法
4. 只输出改写后的查询，不要任何解释、引号或前缀
5. 如果最后一条消息已经足够独立完整，直接返回原文即可`,
		prompt: conversationText,
	})

	return text.trim()
}
