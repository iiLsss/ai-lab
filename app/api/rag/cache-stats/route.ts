import { getCacheStats } from '@/lib/rag/retriever'

/**
 * GET /api/rag/cache-stats
 * 返回当前的缓存统计信息（用于可观测性调试页面）
 */
export async function GET() {
	const stats = getCacheStats()

	return Response.json({
		timestamp: new Date().toISOString(),
		cache: stats,
		description: {
			embedding: 'Embedding 向量缓存（L2）：避免重复调用 Embedding API',
			retrieval: '检索结果缓存（L1）：避免重复查询 Supabase 向量库',
		},
	})
}
