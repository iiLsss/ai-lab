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
}

/**
 * 语义检索：将用户的自然语言查询转化为向量，
 * 然后在 Supabase pgvector 中查找最相关的文档片段。
 *
 * 这是 RAG Pipeline 的核心检索环节。
 */
export async function retrieveDocuments(query: string, options: RetrieveOptions = {}): Promise<RetrievedDocument[]> {
	const { topK = 5, threshold = 0.5 } = options

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
