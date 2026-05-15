/**
 * RAG 生产化优化：Embedding 查询缓存
 *
 * 问题：每次用户提问都要调用 Embedding API（网络延迟 + 费用）。
 * 同一个 Query 被重复问到时，没必要重新生成向量。
 *
 * 解决方案：内存 LRU 缓存
 * - LRU（Least Recently Used）：超出容量时，淘汰最久未使用的条目
 * - TTL（Time To Live）：每个条目有过期时间，防止缓存永久持有陈旧数据
 *
 * 工程权衡：
 * - 这是进程内缓存（内存），重启后清空。生产环境可替换为 Redis。
 * - 缓存 Key = normalize(query)，统一大小写/空格，提高命中率。
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number // Unix timestamp (ms)
  lastUsed: number // 用于 LRU 淘汰
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly maxSize: number
  private readonly ttlMs: number

  /**
   * @param maxSize - 最大缓存条目数（超出后淘汰最久未使用的）
   * @param ttlSeconds - 每个条目的存活时间（秒）
   */
  constructor(maxSize = 100, ttlSeconds = 3600) {
    this.maxSize = maxSize
    this.ttlMs = ttlSeconds * 1000
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // TTL 检查：过期了就删除
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // LRU 更新：访问一个条目，刷新它的 lastUsed 时间
    entry.lastUsed = Date.now()
    return entry.value
  }

  set(key: string, value: T): void {
    // 容量检查：超出 maxSize 时，淘汰最久未使用的条目
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      lastUsed: Date.now(),
    })
  }

  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /** 获取当前缓存统计（用于可观测性） */
  stats() {
    const now = Date.now()
    let activeCount = 0
    for (const entry of this.cache.values()) {
      if (now <= entry.expiresAt) activeCount++
    }
    return {
      total: this.cache.size,
      active: activeCount,
      expired: this.cache.size - activeCount,
    }
  }

  clear() {
    this.cache.clear()
  }
}

/**
 * 标准化缓存 Key：统一大小写和多余空格，提高缓存命中率
 *
 * 示例：
 *   "streamText 怎么用？" → "streamtext 怎么用？"
 *   "  streamText 怎么用  " → "streamtext 怎么用？"
 */
export function normalizeCacheKey(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim()
}

// ─── 单例：全局共享的 Embedding 向量缓存 ────────────────────────────────────
// 最多缓存 200 个查询，每个条目 1 小时过期
export const embeddingCache = new LRUCache<number[]>(200, 3600)

// ─── 单例：全局共享的检索结果缓存 ──────────────────────────────────────────
// 最多缓存 100 个查询结果，每个条目 30 分钟过期（文档更新较频繁，TTL 短一些）
export const retrievalCache = new LRUCache<
  { content: string; similarity: number; metadata: Record<string, unknown> }[]
>(100, 1800)
