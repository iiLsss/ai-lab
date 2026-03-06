import { embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { supabaseAdmin } from '@/lib/supabase'

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export async function POST(req: Request) {
	try {
		const { query } = await req.json()

		if (!query) {
			return Response.json({ error: '查询内容不能为空' }, { status: 400 })
		}

		console.log(`🔍 [1] 将搜索词转化为向量: "${query}"`)

		const { embedding } = await embed({
			model: google.textEmbeddingModel('gemini-embedding-001'),
			value: query,
			providerOptions: {
				google: {
					outputDimensionality: 768, // 必须和 Supabase vector(768) 一致
					taskType: 'RETRIEVAL_QUERY',
				},
			},
		})

		console.log(`[2] 查询 Supabase match_documents 函数...`)
		// 调用我们在 Supabase 设置好的 RPC 存储过程
		const { data: documents, error } = await supabaseAdmin.rpc('match_documents', {
			query_embedding: embedding,
			match_threshold: 0.6, // 余弦相似度最小阈值 (根据实际数据调整)
			match_count: 5, // Top-K 最多取几条
		})

		if (error) {
			console.error('Supabase RPC 错误:', error)
			throw error
		}

		console.log(`[3] Ouptut - Retrieved ${documents?.length || 0} documents.`)

		// RPC 函数原本返回的结果中我们设置了 id, content, metadata 和 similarity
		// 为了和前端之前定义的接口对齐，我们做一层映射映射
		const results = (documents || []).map((doc: any) => ({
			text: doc.content,
			similarity: doc.similarity,
			metadata: doc.metadata,
		}))

		return Response.json({ results })
	} catch (error: any) {
		console.error('[Search Error]:', error)
		return Response.json({ error: error.message || '查询失败' }, { status: 500 })
	}
}
