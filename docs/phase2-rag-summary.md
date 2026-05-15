# 第二阶段总结：RAG 与向量数据库

> **周期**：第 5–10 周
> **目标**：让 AI 聊天机器人能基于**私有知识库**回答问题
> **完成时间**：2026-05

---

## 一、核心成果：从"AI 乱说"到"AI 引文件说"

```
改造前（纯 LLM）：
  用户: "streamText 的 onError 怎么用？"
  AI: "根据我的训练数据，大概是……" ← 可能过时/错误

改造后（RAG）：
  用户: "streamText 的 onError 怎么用？"
  ↓ 检索 docs/vercel-ai-sdk-guide.md（相似度 91%）
  AI: "根据你的学习笔记，onError 是 streamText 的回调参数..." ← 引自己的文档
```

这个转变的核心价值：**AI 的回答从"概率性猜测"变成"基于你私有数据的可信引用"**。

---

## 二、技术架构回顾

### 完整 RAG Pipeline

```
用户提问
    │
    ▼
① Query Rewriting（lib/rag/query-rewriter.ts）
   └─ 多轮对话时：LLM 将含代词的问题改写为独立查询
   └─ "它的错误处理呢？" → "streamText 的错误处理方法"
    │
    ▼
② Embedding + 缓存（lib/rag/retriever.ts + cache.ts）
   ├─ L1 检索结果缓存（30min TTL）：命中则跳过全部 API 调用
   └─ L2 Embedding 缓存（1h TTL）：命中则跳过 Embedding API
    │
    ▼
③ 向量检索（Supabase pgvector）
   └─ match_documents RPC：余弦相似度排序，支持 Metadata Filter
    │
    ▼
④ Prompt 增强（app/api/chat/route.ts → buildRAGSystemPrompt()）
   ├─ 有文档 → 注入参考资料 + 引用规则
   └─ 无文档 → 降级提示 + 允许用自身知识补充
    │
    ▼
⑤ streamText 生成回答（附带引用来源）
```

### 文件地图

```
lib/
├── supabase.ts                  ← Supabase Admin 客户端（Service Role）
└── rag/
    ├── embeddings.ts            ← embedMany 批量向量化
    ├── chunker.ts               ← Markdown 感知分片器
    ├── retriever.ts             ← 语义检索（Week 10 升级：含双层缓存）
    ├── query-rewriter.ts        ← 多轮上下文查询改写
    └── cache.ts                 ← LRU + TTL 双层缓存（Week 10 新增）

app/api/rag/
├── ingest/route.ts              ← 文档导入 API
├── evaluate/route.ts            ← RAG 评估 API（Week 10 新增）
└── cache-stats/route.ts         ← 缓存统计 API（Week 10 新增）

app/debug/
├── rag/page.tsx                 ← 语义搜索调试页
└── rag-eval/page.tsx            ← 评估面板（Week 10 新增）

scripts/
└── ingest-docs.ts               ← 批量文档导入脚本
```

---

## 三、分周掌握的核心概念

### Week 5：Embedding（嵌入向量）

| 概念 | 理解 |
|------|------|
| Embedding | 文本 → 高维向量（768维），语义相近 = 向量方向相近 |
| 余弦相似度 | 衡量两向量方向的接近程度，范围 [0, 1] |
| `embed()` | AI SDK 的 Embedding API，一次处理一条文本 |
| `cosineSimilarity()` | AI SDK 内置的余弦相似度计算函数 |

**关键认知**：Embedding 不是关键词匹配，是**语义理解**。"前端框架"能找到"React 入门指南"。

---

### Week 6：向量数据库（Supabase pgvector）

```sql
-- 核心表结构
create table documents (
  id       bigint primary key generated always as identity,
  content  text not null,       -- 原始文本片段
  metadata jsonb,               -- 来源、标题、chunk_index 等元数据
  embedding vector(768)         -- Gemini Embedding 是 768 维
);

-- 向量相似度搜索（越小越相似）
SELECT * FROM documents
ORDER BY embedding <=> $query_embedding   -- <=> 是余弦距离算子
LIMIT 5;
```

**关键认知**：`<=>` 是 pgvector 的余弦距离算子（值越小越相似）。不是 SQL 语法错误。

---

### Week 7：文档分片（Chunking）

**为什么要分片**：Embedding 对长文本表达能力弱，一篇 5000 字的文档压缩成一个向量会丢失大量细节。

**实现的分片策略**：Markdown 感知分片

```typescript
// 按 ## / ### 标题切分，保留上下文重叠
// 示例：docs/study-plan.md (≈8000字) → 47 个 chunks
```

**关键认知**：Chunk 大小是核心超参数。太大 → 相关度被稀释；太小 → 上下文断裂。300-500字+重叠是常见起点。

---

### Week 8：RAG Pipeline 集成

**核心改动**：在 `streamText` 调用之前，插入"检索 → 增强 Prompt"两步：

```typescript
// app/api/chat/route.ts 的核心改造
const retrievedDocs = await retrieveDocuments(query, { topK: 5, threshold: 0.7 })
const systemPrompt = buildRAGSystemPrompt(retrievedDocs)  // 有/无文档走不同分支
const result = streamText({ model, system: systemPrompt, messages })
```

**关键认知**：降级设计很重要。RAG 检索失败不能让整个聊天崩溃，`try/catch` 降级为纯 LLM 是必须的。

---

### Week 9：进阶检索技巧

**实现了两项进阶技巧**：

**① 多轮上下文 Query Rewriting**

```
问题场景：
  用户: "streamText 怎么用？"
  AI: "streamText 是..."
  用户: "它的错误处理呢？"  ← "它" 是什么？向量库搜不到

解决方案：
  用 LLM 将最近 6 条消息浓缩 → "streamText 的错误处理方法"
  再用改写后的 query 去检索
```

实测提升：改写前相似度 72%，改写后 90.7%。

**② Metadata Filter**

```typescript
// 精准限定搜索来源
await retrieveDocuments(query, {
  filter: { source: 'docs/vercel-ai-sdk-guide.md' }
})
```

用途：用户明确问"根据 XX 文件"时，排除其他文档的干扰。

---

### Week 10：评估与生产化

**评估框架**（`/debug/rag-eval`）：

| 测试类型 | 用例数 | 目的 |
|---------|--------|------|
| A 类（知识库有答案）| 10 | 验证能否命中并正确引用 |
| B 类（知识库无答案）| 2 | 验证降级声明是否正确 |
| C 类（边界/细节）| 3 | 验证检索精度 |

**自动评分维度**：

- **检索相关度**：检索到的文档平均余弦相似度（0-5）
- **关键词覆盖率**：AI 回答是否包含预期关键词（0-5）
- **Faithfulness**：需要人工打分（AI 是否忠实于文档，没有幻觉）

**生产化优化**（`lib/rag/cache.ts`）：

```
缓存架构（双层 LRU + TTL）：

L1 检索结果缓存（30min TTL，最多100条）
  └─ Key = normalize(query + topK + threshold + filter)
  └─ 命中 → 直接返回，跳过 Embedding API + Supabase 查询

L2 Embedding 缓存（1h TTL，最多200条）
  └─ Key = normalize(query)
  └─ 命中 → 跳过 Embedding API，但仍需查 Supabase
```

**降级机制**（`app/api/chat/route.ts`）：

```
向量库不可用
    │
    ├── catch → console.warn → retrievedDocs = []
    │
    └── buildRAGSystemPrompt([]) → 降级 Prompt
              └─ AI 会说"知识库中暂未收录相关内容，以下基于自身知识"
```

---

## 四、踩坑记录

### 1. Embedding 维度不匹配

- **现象**：向量搜索报错 `expected 1536 dimensions but got 768`
- **原因**：建表时用了 OpenAI 的 1536 维，但实际用了 Google Gemini 的 768 维
- **修复**：`ALTER TABLE documents ALTER COLUMN embedding TYPE vector(768)`

### 2. match_documents RPC 参数顺序

- **现象**：调用 RPC 时偶发报错
- **原因**：Supabase RPC 参数通过名称匹配，不是位置匹配
- **结论**：`supabase.rpc('match_documents', { query_embedding, match_threshold, match_count, filter_metadata })` 参数名必须和 SQL 函数定义完全一致

### 3. Query Rewriting 的双刃剑

- **现象**：有时改写反而更差（原始问题更精准）
- **原因**：LLM 可能过度"创造性"地改写，添加了不存在的实体
- **解决**：加强 Prompt 的"4. 只输出改写后的查询，不要任何解释"约束；改写失败时 `catch` 降级原始 query

---

## 五、第二阶段完成标志验证

> ✅ 问 **"generateObject 的三层原理是什么？"**
> → 检索命中 `docs/vercel-ai-sdk-guide.md`（相似度 ~88%）
> → AI 引用"Zod → JSON Schema → Function Calling / response_format → 受约束解码"正确作答

---

## 六、下一阶段预告

第二阶段让 AI "有知识"；第三阶段让 AI "能行动"。

```
第三阶段：进阶 Agent 与 MCP 协议
├── Function Calling：让 AI 能调用工具（查天气、搜索、执行代码）
├── MCP（Model Context Protocol）：标准化工具接入协议
└── Agent Loop：AI 自主规划 → 调用工具 → 观察结果 → 继续规划
```

RAG 与 Agent 可以组合：**Agent 获取实时数据 + RAG 引用知识库 = 更强的 AI 助手**。
