import { embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { supabaseAdmin } from '@/lib/supabase'
import { embeddingCache, retrievalCache, normalizeCacheKey } from './cache'

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
	skipCache?: boolean // 强制跳过缓存（调试用）
}

/**
 * 语义检索：将用户的自然语言查询转化为向量，
 * 然后在 Supabase pgvector 中查找最相关的文档片段。
 *
 * 这是 RAG Pipeline 的核心检索环节。
 *
 * 生产化优化（Week 10）：
 * - ① Embedding 缓存：同一查询不重复调用 Embedding API
 * - ② 检索结果缓存：同一查询+配置不重复查询向量库
 * - ③ 降级：向量库不可用时抛出错误，由调用方（route.ts）降级为纯 LLM
 *
 * @param query - 用户的查询文本
 * @param options.topK - 返回最相关的 K 条文档（默认 5）
 * @param options.threshold - 最低相似度阈值（默认 0.5）
 * @param options.filter - Metadata 过滤条件，如 { source: "docs/xxx.md" }
 * @param options.skipCache - 强制跳过缓存（调试时使用）
 */
export async function retrieveDocuments(query: string, options: RetrieveOptions = {}): Promise<RetrievedDocument[]> {
	const { topK = 5, threshold = 0.5, filter, skipCache = false } = options

	// ── 缓存 Key 设计 ────────────────────────────────────────────────────────
	// 检索结果缓存的 Key 包含：查询文本 + topK + threshold + filter
	// 这样不同配置的相同查询不会共享同一个缓存条目
	const cacheKey = normalizeCacheKey(`${query}|k=${topK}|t=${threshold}|f=${JSON.stringify(filter || {})}`)

	// ── ① 检索结果缓存（L1）────────────────────────────────────────────────
	if (!skipCache) {
		const cachedResult = retrievalCache.get(cacheKey)
		if (cachedResult !== null) {
			console.log(`[Retriever] 🎯 检索结果缓存命中 | query="${query.slice(0, 30)}..."`)
			return cachedResult
		}
	}

	// ── ② Embedding 缓存（L2）──────────────────────────────────────────────
	const embeddingKey = normalizeCacheKey(query)
	let embedding: number[]

	const cachedEmbedding = skipCache ? null : embeddingCache.get(embeddingKey)

	if (cachedEmbedding !== null) {
		embedding = cachedEmbedding!
		console.log(`[Retriever] ⚡ Embedding 缓存命中 | query="${query.slice(0, 30)}..."`)
	} else {
		// 未命中 → 调用 Embedding API（有网络延迟和费用）
		console.log(`[Retriever] 🔄 调用 Embedding API | query="${query.slice(0, 30)}..."`)
		const result = await embed({
			model: google.textEmbeddingModel('gemini-embedding-001'),
			value: query,
			providerOptions: {
				google: {
					outputDimensionality: 768,
					taskType: 'RETRIEVAL_QUERY',
				},
			},
		})
		embedding = result.embedding

		// 写入 Embedding 缓存
		embeddingCache.set(embeddingKey, embedding)
	}

	// ── ③ 调用 Supabase RPC 进行向量匹配 ─────────────────────────────────
	const { data: documents, error } = await supabaseAdmin.rpc('match_documents', {
		query_embedding: embedding,
		match_threshold: threshold,
		match_count: topK,
		filter_metadata: filter || null,
	})

	if (error) {
		console.error('[Retriever] Supabase RPC 错误:', error)
		throw error
	}

	// ── ④ 映射结果并写入检索结果缓存 ────────────────────────────────────
	const result: RetrievedDocument[] = (documents || []).map((doc: Record<string, unknown>) => ({
		content: doc.content as string,
		similarity: doc.similarity as number,
		metadata: (doc.metadata || {}) as Record<string, unknown>,
	}))

	if (!skipCache) {
		retrievalCache.set(cacheKey, result)
	}

	return result
}

/**
 * 获取缓存统计信息（用于可观测性 / 调试页面）
 */
export function getCacheStats() {
	return {
		embedding: embeddingCache.stats(),
		retrieval: retrievalCache.stats(),
	}
}
