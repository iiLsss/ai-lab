import { retrieveDocuments } from '@/lib/rag/retriever'

export async function POST(req: Request) {
	try {
		const { query } = await req.json()

		if (!query) {
			return Response.json({ error: '查询内容不能为空' }, { status: 400 })
		}

		console.log(`🔍 [RAG Search] 开始语义检索: "${query}"`)

		const documents = await retrieveDocuments(query, {
			topK: 5,
			threshold: 0.6,
		})

		console.log(`[RAG Search] 检索到 ${documents.length} 条匹配文档`)

		// 前端接口兼容：映射为 { text, similarity } 格式
		const results = documents.map(doc => ({
			text: doc.content,
			similarity: doc.similarity,
			metadata: doc.metadata,
		}))

		return Response.json({ results })
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : '查询失败'
		console.error('[RAG Search Error]:', message)
		return Response.json({ error: message }, { status: 500 })
	}
}
