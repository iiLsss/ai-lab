import { embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { supabaseAdmin } from '@/lib/supabase'

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export interface RetrievedDocument {
	content: string
	similarity: number
	metadata: Record<string, unknown>
}

interface RetrieveOptions {
	topK?: number
	threshold?: number
	filter?: Record<string, unknown> // Metadata 过滤条件，如 { source: "docs/xxx.md" }
}

/**
 * 语义检索：将用户的自然语言查询转化为向量，
 * 然后在 Supabase pgvector 中查找最相关的文档片段。
 *
 * 这是 RAG Pipeline 的核心检索环节。
 *
 * @param query - 用户的查询文本
 * @param options.topK - 返回最相关的 K 条文档（默认 5）
 * @param options.threshold - 最低相似度阈值（默认 0.5）
 * @param options.filter - Metadata 过滤条件，如 { source: "docs/xxx.md" }
 */
export async function retrieveDocuments(query: string, options: RetrieveOptions = {}): Promise<RetrievedDocument[]> {
	const { topK = 5, threshold = 0.5, filter } = options

	// 1. 将用户查询转化为向量
	const { embedding } = await embed({
		model: google.textEmbeddingModel('gemini-embedding-001'),
		value: query,
		providerOptions: {
			google: {
				outputDimensionality: 768,
				taskType: 'RETRIEVAL_QUERY',
			},
		},
	})

	// 2. 调用 Supabase RPC 函数进行向量匹配
	const { data: documents, error } = await supabaseAdmin.rpc('match_documents', {
		query_embedding: embedding,
		match_threshold: threshold,
		match_count: topK,
		filter_metadata: filter || null, // null = 不过滤，返回所有文档
	})

	if (error) {
		console.error('[Retriever] Supabase RPC 错误:', error)
		throw error
	}

	// 3. 映射为标准结构返回
	return (documents || []).map((doc: Record<string, unknown>) => ({
		content: doc.content as string,
		similarity: doc.similarity as number,
		metadata: (doc.metadata || {}) as Record<string, unknown>,
	}))
}
