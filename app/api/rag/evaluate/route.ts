import { retrieveDocuments } from '@/lib/rag/retriever'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
const model = openrouter.chat('google/gemini-2.5-flash')

/**
 * 15 个 RAG 评估测试用例
 *
 * 涵盖三种类型：
 * - Type A（知识库有答案）：能命中 → 期望 AI 引用文档正确作答
 * - Type B（知识库无答案）：不能命中 → 期望 AI 正确降级声明
 * - Type C（边界/细节）：命中率 50/50 → 检验检索精度
 *
 * 评估维度：
 * 1. Relevance（检索到的文档和问题相关吗？）
 * 2. Faithfulness（AI 回答是否忠实于检索文档，没有幻觉？）
 * 3. Coverage（检索到的文档是否覆盖了问题的关键信息点？）
 */
export const TEST_CASES = [
	// ── A 类：知识库有答案 ──────────────────────────────────────────────────
	{
		id: 'A1',
		question: 'streamText 的 toUIMessageStreamResponse() 有什么作用？',
		type: 'A' as const,
		expectedKeywords: ['UIMessage', '流式', '协议', 'useChat'],
	},
	{
		id: 'A2',
		question: 'useChat 默认请求哪个 API 路径？',
		type: 'A' as const,
		expectedKeywords: ['/api/chat', '约定大于配置'],
	},
	{
		id: 'A3',
		question: 'generateObject 和 Zod Schema 有什么关系？',
		type: 'A' as const,
		expectedKeywords: ['Schema', 'JSON Schema', 'Function Calling', '约束'],
	},
	{
		id: 'A4',
		question: 'System Prompt 的模板字符串缩进陷阱是什么问题？',
		type: 'A' as const,
		expectedKeywords: ['缩进', '空格', 'Markdown', '代码块'],
	},
	{
		id: 'A5',
		question: '什么是 RAG？它解决了什么问题？',
		type: 'A' as const,
		expectedKeywords: ['检索', '增强', '生成', '私有知识库', '幻觉'],
	},
	{
		id: 'A6',
		question: 'Embedding 和余弦相似度之间有什么关系？',
		type: 'A' as const,
		expectedKeywords: ['向量', '余弦', '语义', '相似度'],
	},
	{
		id: 'A7',
		question: '为什么要对长文档进行 Chunking（分片）处理？',
		type: 'A' as const,
		expectedKeywords: ['分片', 'Embedding', '上下文', '向量'],
	},
	{
		id: 'A8',
		question: 'Query Rewriting 解决了什么问题？',
		type: 'A' as const,
		expectedKeywords: ['代词', '多轮', '上下文', '改写', '检索'],
	},
	{
		id: 'A9',
		question: 'streamText 和 generateObject 混合模式的典型应用场景是什么？',
		type: 'A' as const,
		expectedKeywords: ['文字流', '结构化', '知识卡片', '组件'],
	},
	{
		id: 'A10',
		question: 'Supabase pgvector 的向量搜索和传统关键词搜索有什么不同？',
		type: 'A' as const,
		expectedKeywords: ['语义', '向量', 'LIKE', '余弦'],
	},
	// ── B 类：知识库无答案（期望 AI 降级声明）─────────────────────────────
	{
		id: 'B1',
		question: '如何在 Kubernetes 上部署 PostgreSQL 集群？',
		type: 'B' as const,
		expectedKeywords: ['知识库', '暂未收录', '自身知识'],
	},
	{
		id: 'B2',
		question: 'React Native 和 Flutter 哪个更适合开发 iOS 应用？',
		type: 'B' as const,
		expectedKeywords: ['知识库', '暂未收录'],
	},
	// ── C 类：边界/细节检验 ─────────────────────────────────────────────────
	{
		id: 'C1',
		question: 'useObject 的 submit() 函数有什么需要注意的坑？',
		type: 'C' as const,
		expectedKeywords: ['序列化', 'body', '对齐', '包装'],
	},
	{
		id: 'C2',
		question: 'Metadata Filter 在 RAG 检索中的作用是什么？',
		type: 'C' as const,
		expectedKeywords: ['过滤', '来源', '精准', '范围'],
	},
	{
		id: 'C3',
		question: 'LRU 缓存淘汰策略的工作原理是什么？',
		type: 'C' as const,
		expectedKeywords: ['最久未使用', '容量', '淘汰', 'Least Recently'],
	},
]

export interface EvaluationResult {
	id: string
	question: string
	type: 'A' | 'B' | 'C'
	retrievedDocs: { content: string; similarity: number; source: string }[]
	aiAnswer: string
	scores: {
		relevance: number // 0-5：检索相关度
		faithfulness: number // 0-5：回答忠实度
		coverage: number // 0-5：关键词覆盖率（自动计算）
	}
	autoScore: {
		keywordsFound: string[]
		keywordsMissed: string[]
		coverageRate: number // 0-1
	}
	durationMs: number
}

/**
 * POST /api/rag/evaluate
 * 运行一个或全部测试用例，返回评估结果
 *
 * Body: { caseId?: string }
 * - 不传 caseId → 运行所有 15 个测试用例
 * - 传 caseId → 只运行指定的测试用例（如 "A1"）
 */
export async function POST(req: Request) {
	const { caseId } = await req.json().catch(() => ({}))

	const casesToRun = caseId ? TEST_CASES.filter((c) => c.id === caseId) : TEST_CASES

	if (casesToRun.length === 0) {
		return Response.json({ error: `测试用例 "${caseId}" 不存在` }, { status: 400 })
	}

	const results: EvaluationResult[] = []

	for (const testCase of casesToRun) {
		const start = Date.now()

		// ① 检索
		let retrievedDocs: { content: string; similarity: number; source: string }[] = []
		try {
			const docs = await retrieveDocuments(testCase.question, { topK: 5, threshold: 0.5 })
			retrievedDocs = docs.map((d) => ({
				content: d.content.slice(0, 200), // 截断，避免响应过大
				similarity: d.similarity,
				source: (d.metadata?.source as string) || '未知',
			}))
		} catch (err) {
			console.error(`[Eval] 检索失败 case=${testCase.id}:`, err)
		}

		// ② 生成回答
		const context =
			retrievedDocs.length > 0
				? retrievedDocs.map((d, i) => `[参考资料 ${i + 1}]（来源: ${d.source}）\n${d.content}`).join('\n\n---\n\n')
				: '（知识库中未找到相关文档）'

		const systemPrompt =
			retrievedDocs.length > 0
				? `你是一个 AI 助手。基于以下知识库文档回答用户问题，引用具体内容，回答简洁（100字内）：\n\n${context}`
				: `你是一个 AI 助手。知识库中未找到相关内容，请先声明"知识库中暂未收录相关内容"，再简要用自身知识补充（100字内）。`

		let aiAnswer = ''
		try {
			const { text } = await generateText({
				model,
				system: systemPrompt,
				prompt: testCase.question,
			})
			aiAnswer = text
		} catch (err) {
			aiAnswer = `生成失败: ${err instanceof Error ? err.message : String(err)}`
		}

		// ③ 自动评分：关键词覆盖率
		const lowerAnswer = aiAnswer.toLowerCase()
		const keywordsFound = testCase.expectedKeywords.filter((kw) => lowerAnswer.includes(kw.toLowerCase()))
		const keywordsMissed = testCase.expectedKeywords.filter((kw) => !lowerAnswer.includes(kw.toLowerCase()))
		const coverageRate = testCase.expectedKeywords.length > 0 ? keywordsFound.length / testCase.expectedKeywords.length : 0

		// 自动计算 relevance（基于检索文档的平均相似度）
		const avgSimilarity =
			retrievedDocs.length > 0 ? retrievedDocs.reduce((sum, d) => sum + d.similarity, 0) / retrievedDocs.length : 0

		results.push({
			id: testCase.id,
			question: testCase.question,
			type: testCase.type,
			retrievedDocs,
			aiAnswer,
			scores: {
				relevance: Math.round(avgSimilarity * 5 * 10) / 10, // 0-5
				faithfulness: 0, // 需要人工打分，初始为 0
				coverage: Math.round(coverageRate * 5 * 10) / 10,
			},
			autoScore: {
				keywordsFound,
				keywordsMissed,
				coverageRate,
			},
			durationMs: Date.now() - start,
		})
	}

	return Response.json({ results, totalCases: casesToRun.length })
}

/**
 * GET /api/rag/evaluate
 * 返回所有测试用例的元信息（不执行评估）
 */
export async function GET() {
	return Response.json({
		totalCases: TEST_CASES.length,
		cases: TEST_CASES.map(({ id, question, type, expectedKeywords }) => ({
			id,
			question,
			type,
			expectedKeywords,
		})),
		typeDescription: {
			A: '知识库有答案：期望 AI 引用文档正确作答',
			B: '知识库无答案：期望 AI 正确降级声明',
			C: '边界/细节：检验检索精度',
		},
	})
}
