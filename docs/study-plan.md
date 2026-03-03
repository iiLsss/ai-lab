## 📅 进度概览

| 阶段         | 周期        | 主题                           | 核心任务                                                         | 状态      |
| :----------- | :---------- | :----------------------------- | :--------------------------------------------------------------- | :-------- |
| **第一阶段** | 第 1-4 周   | **思维转型：从确定性到概率性** | [DONE] Prompt Engineering, CoT 实战, Vercel AI SDK, 基础 Chatbot | ✅ 已完成 |
| **第二阶段** | 第 5-10 周  | **RAG 与向量数据库**           | 数据预处理, Embedding, Vector DB (Pinecone/Supabase), 私有知识库 | 🚀 进行中 |
| **第三阶段** | 第 11-16 周 | **进阶 Agent 与 MCP 协议**     | Function Calling, MCP 协议, LangChain/LlamaIndex 源码分析        | ⏳ 待开始 |
| **第四阶段** | 第 17-20 周 | **工程化与调优**               | RAGAS 评估, Swift Response (TTFT), 缓存, 微调基础                | ⏳ 待开始 |
| **第五阶段** | 第 21-24 周 | **实战模拟与简历**             | 高并发, 跨端 AI, 面试题准备 (幻觉, 长文本, 稳定性)               | ⏳ 待开始 |

---

## ✅ 第一阶段完成总结

> 以下是基于 `diqiu-lab` 项目实际代码的完整总结。每个知识点都有对应的代码文件和核心收获。

### 一、核心技术栈

| 技术                          | 用途                                     | 项目中的位置                                    |
| ----------------------------- | ---------------------------------------- | ----------------------------------------------- |
| `ai` (Vercel AI SDK)          | 核心 SDK：streamText、generateObject 等  | 所有 `app/api/` 路由                            |
| `@ai-sdk/react`               | 前端 Hook：useChat、useObject            | `components/chat/ChatWindow.tsx`                |
| `@openrouter/ai-sdk-provider` | 模型适配器，接入 Gemini 等模型           | `app/api/*/route.ts`                            |
| `zod`                         | Schema 定义（结构化输出的核心）          | `app/api/sentiment/`、`app/api/knowledge-card/` |
| `streamdown` + 插件           | Markdown 流式渲染（代码、数学、Mermaid） | `components/chat/ChatMessages.tsx`              |
| `zustand`                     | 轻量状态管理（会话列表）                 | `store/useChatStore.ts`                         |

---

### 二、已掌握的 5 个核心 API

#### 1️⃣ `streamText` — 流式文本生成

**文件**：[app/api/chat/route.ts](file:///Users/eeo/Documents/lsss/diqiu-lab/app/api/chat/route.ts)

```typescript
const result = streamText({
	model: openrouter.chat('google/gemini-2.5-flash'),
	system: '...', // System Prompt
	messages: await convertToModelMessages(messages), // 多轮对话
	onError({ error }) {
		console.error(error)
	}, // 错误回调
})
return result.toUIMessageStreamResponse() // 返回 UI 流式响应
```

**核心收获**：

- `streamText` 是最常用的 API，流式一个个 Token 推送给前端
- `toUIMessageStreamResponse()` 返回 `useChat` 能识别的协议格式
- `convertToModelMessages()` 把 UI 消息转成模型消息格式

---

#### 2️⃣ `useChat` — 前端聊天 Hook

**文件**：[components/chat/ChatWindow.tsx](file:///Users/eeo/Documents/lsss/diqiu-lab/components/chat/ChatWindow.tsx)

```typescript
const { messages, setMessages, sendMessage, status, error, clearError } = useChat({
	onError(error) {
		console.error('[Chat Error]', error)
	},
})
```

**核心收获**：

- `useChat` 自动管理消息列表、请求状态、流式接收
- 默认请求 `/api/chat`（约定大于配置）
- `status` 可判断是否在 streaming，用于 UI 状态展示
- `error` + `clearError` 实现前端错误处理

---

#### 3️⃣ `generateObject` — 一次性结构化输出

**文件**：[app/api/sentiment/route.ts](file:///Users/eeo/Documents/lsss/diqiu-lab/app/api/sentiment/route.ts)

```typescript
const sentimentSchema = z.object({
	emotion: z.enum(['happy', 'sad', 'angry', 'neutral', 'curious']),
	confidence: z.number().min(0).max(1),
	reason: z.string(),
})

const result = await generateObject({
	model,
	schema: sentimentSchema,
	prompt,
})
return result.toJsonResponse()
```

**核心收获**：

- Zod schema 通过 `.describe()` 给 LLM 写 "字段级 Prompt"
- SDK 内部：Zod → JSON Schema → Function Calling / response_format → 受约束解码
- **Schema 是强制约束，不是建议**。比 "请按 JSON 输出" 的 Prompt 可靠得多
- `toJsonResponse()` 直接返回类型安全的 JSON

---

#### 4️⃣ `streamObject` + `useObject` — 流式结构化输出

**曾在练习 2 中使用**（后被练习 3 混合模式替代）

```typescript
// 后端
const result = streamObject({ model, schema, prompt })
return result.toTextStreamResponse()

// 前端
const { object, submit, isLoading } = useObject({ api: '/api/...', schema })
submit({ prompt }) // ⚠️ submit 直接把参数序列化为 JSON body
```

**核心收获**：

- `useObject` 的 `submit(input)` 把 input **原样**序列化为 body，不会帮你包装
- 后端 `req.json()` 的解构必须和 `submit()` 的参数结构对齐
- `object` 是 partial 的，流式过程中字段逐步填充，需用 `?.` 可选链访问

---

#### 5️⃣ `streamText` + `generateObject` 混合模式

**文件**：[app/api/knowledge-card/route.ts](file:///Users/eeo/Documents/lsss/diqiu-lab/app/api/knowledge-card/route.ts)

```typescript
// 1. 先流式输出文字
const textResult = streamText({ model, system, prompt })

// 2. 组合成自定义流
const combinedStream = new ReadableStream({
	async start(controller) {
		// 推送文字流
		const reader = textResult.textStream.getReader()
		while (true) {
			/* ... push chunks ... */
		}

		// 3. 文字结束后，生成结构化卡片
		const cardResult = await generateObject({ model, schema, prompt })
		controller.enqueue(encode(`<!--CARD_START-->${JSON.stringify(cardResult.object)}<!--CARD_END-->`))
		controller.close()
	},
})
```

**核心收获**：

- 生产级 AI 应用的典型模式：**文字流给即时反馈，结构化数据驱动 UI 组件**
- 可以用 HTML 注释标记（`<!--...-->`）在流中嵌入结构化数据
- 错误隔离：卡片生成失败不影响文字回答

---

### 三、Prompt Engineering 实战

**文件**：[app/api/chat/route.ts](file:///Users/eeo/Documents/lsss/diqiu-lab/app/api/chat/route.ts#L21-L29)

```
System Prompt 设计要素：
├── 角色设定  →  "你是一个专业的 AI 助手"
├── 输出格式  →  "<thinking>...</thinking>"
├── CoT 思考链  →  拆解问题 → 逻辑推导 → 自我校验
└── 格式示范  →  给出完整的输出模板
```

**踩坑记录**：

- ⚠️ **模板字符串缩进陷阱**：JS 的 `` ` ` `` 会保留代码缩进中的空格，导致 LLM 模仿输出带缩进的内容，Markdown 解析为代码块
- ✅ **解决方案**：System Prompt 内容顶格写，不要随代码缩进

---

### 四、前端 `<thinking>` 标签解析

**文件**：[components/chat/ChatMessages.tsx](file:///Users/eeo/Documents/lsss/diqiu-lab/components/chat/ChatMessages.tsx#L20-L53)

```
AI 返回内容: "<thinking>思考...</thinking>正式回答..."
                  │
                  ▼
     正则解析: /<thinking\s*>/i  /<\/thinking\s*>/i
                  │
          ┌───────┴───────┐
          ▼               ▼
    thinking 段         text 段
    (折叠面板)        (Streamdown 渲染)
```

**核心收获**：

- 用**正则**替代 `indexOf` 精确匹配，处理 `<thinking >`、`<THINKING>` 等变体
- 未完成的 thinking（`isComplete: false`）显示 "深度思考中..."，自动展开
- 完成的 thinking（`isComplete: true`）显示 "思考过程"，默认折叠

---

### 五、工程化加固

#### 后端错误处理

**文件**：[app/api/chat/route.ts](file:///Users/eeo/Documents/lsss/diqiu-lab/app/api/chat/route.ts#L8-L52)

```
请求进入
  │
  ├── 参数校验 → 400（消息为空）
  │
  ├── streamText.onError → 流式错误日志
  │
  └── catch → 区分上游错误 (502) vs 通用错误 (500)
```

#### 前端错误处理

**文件**：[components/chat/ChatWindow.tsx](file:///Users/eeo/Documents/lsss/diqiu-lab/components/chat/ChatWindow.tsx)

- `useChat({ onError })` — 开发日志
- `error` 状态 → 红色 Toast 提示
- `clearError()` + 重试按钮 → 用户可操作的恢复路径

---

### 六、项目文件地图

```
app/
├── api/
│   ├── chat/route.ts              ← streamText + 完整错误处理
│   ├── sentiment/route.ts         ← generateObject (练习 1: 情绪分析)
│   └── knowledge-card/route.ts    ← streamText + generateObject 混合 (练习 3)
├── debug/
│   ├── sentiment/page.tsx         ← 情绪分析调试页 (练习 1)
│   └── knowledge-card/page.tsx    ← 混合模式调试页 (练习 3)
├── [[...chatId]]/page.tsx         ← 主聊天页（响应式）
└── globals.css                    ← 全局样式 + 移动端优化

components/chat/
├── ChatWindow.tsx                 ← useChat + 错误 UI
├── ChatMessages.tsx               ← <thinking> 解析 + Streamdown 渲染
├── ChatInput.tsx                  ← 输入框
├── Header.tsx                     ← 响应式头部
└── Sidebar.tsx                    ← 响应式侧边栏

store/
└── useChatStore.ts                ← Zustand 会话管理
```

---

### 七、关键心智模型

> 以下 3 个认知是第一阶段最重要的收获，后续阶段都建立在此基础上：

**1. AI 输出 = 概率性的，需要约束**

```
自由文本 (streamText)      ← 灵活但不可控
       ↓ 加入 Schema
结构化输出 (generateObject)  ← 受约束、可预测、可编程
```

**2. 前后端协议 = SDK 的核心价值**

```
后端 streamText → toUIMessageStreamResponse()
                        ↕  Data Stream Protocol
前端 useChat    → 自动解析流、管理状态、驱动 UI
```

**3. Prompt Engineering = 从 "写文字" 到 "写代码"**

```
System Prompt ≈ 函数签名    →  定义行为边界
.describe()   ≈ 类型注释    →  约束字段含义
Schema        ≈ 返回类型    →  强制输出格式
```

---

---

## 🚀 第二阶段：RAG 与向量数据库（第 5-10 周）

> **目标**：让你的 AI 聊天机器人能够基于**私有知识库**回答问题，而不仅仅依赖模型的预训练知识。

### 核心概念：RAG 是什么？

```
传统 LLM 回答：
  用户: "我们公司的退款政策是什么？"
  AI: "抱歉，我不了解贵公司的具体政策..." ❌（模型没见过你的数据）

RAG 增强回答：
  用户: "我们公司的退款政策是什么？"
    ↓
  [检索] 从知识库找到："退款政策.md" → "7天内无条件退款..."
    ↓
  AI: "根据公司政策，您可以在7天内无条件退款..." ✅（基于真实文档）
```

**RAG = Retrieval（检索）+ Augmented（增强）+ Generation（生成）**

---

### 📆 分周学习计划

#### Week 5：理解 Embedding（嵌入向量）

**学习目标**：理解文本如何变成向量，以及为什么向量能衡量语义相似度。

**核心概念**：

| 概念            | 一句话解释                                                            |
| --------------- | --------------------------------------------------------------------- |
| Embedding       | 把文本映射成高维向量（如 1536 维），语义相近的文本向量也相近          |
| 余弦相似度      | 衡量两个向量的"方向"有多接近（1=完全相同，0=无关）                    |
| Embedding Model | 专门用来生成向量的模型（如 `text-embedding-3-small`），不同于聊天模型 |

**实战练习**：在项目中创建一个 Embedding 调试页面

```
新建文件：
├── app/api/embed/route.ts          ← 调用 AI SDK 的 embed() 函数
└── app/debug/embedding/page.tsx    ← 输入两段文本，展示余弦相似度
```

**需要用到的 API**：

```typescript
import { embed, cosineSimilarity } from 'ai'

// AI SDK 内置了 embed 函数和余弦相似度计算
const { embedding: v1 } = await embed({ model: embeddingModel, value: '猫喜欢吃鱼' })
const { embedding: v2 } = await embed({ model: embeddingModel, value: '小猫爱吃海鲜' })

const similarity = cosineSimilarity(v1, v2) // ≈ 0.85（语义相近）
```

**需要安装**：

```bash
npm install @ai-sdk/openai  # OpenAI 的 embedding 模型最成熟
```

**本周交付**：

- [ ] 能展示任意两段文本的余弦相似度
- [ ] 理解：为什么 "猫吃鱼" 和 "小猫爱海鲜" 相似度高，但 "猫吃鱼" 和 "股票涨了" 很低

---

#### Week 6：向量数据库入门（Supabase pgvector）

**学习目标**：把 Embedding 存起来，实现"语义搜索"。

**为什么选 Supabase？**

- ✅ 免费额度够用（500MB 数据库）
- ✅ 基于 PostgreSQL + pgvector 扩展，SQL 技能可复用
- ✅ 有 JS SDK，和 Next.js 项目无缝集成
- ✅ 自带 Dashboard，可视化管理数据

**核心概念**：

```
传统数据库搜索：  WHERE title LIKE '%React%'    ← 关键词匹配
向量数据库搜索：  ORDER BY embedding <=> query   ← 语义匹配

用户搜 "前端框架" → 也能找到标题为 "React 入门指南" 的文档
```

**实战练习**：

```
新建文件：
├── lib/supabase.ts                 ← Supabase 客户端配置
├── lib/rag/embeddings.ts           ← 封装 embed + 存储逻辑
├── app/api/rag/ingest/route.ts     ← 导入文档的 API
└── app/debug/rag/page.tsx          ← 语义搜索调试页面
```

**Supabase 表结构**：

```sql
create table documents (
  id bigint primary key generated always as identity,
  content text not null,           -- 原始文本
  metadata jsonb,                  -- 来源、标题等元数据
  embedding vector(1536)           -- 向量（OpenAI text-embedding-3-small 是 1536 维）
);

-- 创建向量索引（加速搜索）
create index on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

**需要安装**：

```bash
npm install @supabase/supabase-js
```

**本周交付**：

- [ ] Supabase 项目创建完成，pgvector 扩展启用
- [ ] 能手动导入几条文档并存储 Embedding
- [ ] 输入查询语句，返回语义最相关的 Top-K 文档

---

#### Week 7：数据预处理与分片（Chunking）

**学习目标**：真实文档通常很长（几千甚至上万字），需要切成小块再做 Embedding。

**核心概念**：

```
一篇 5000 字的文档
    ↓ Chunking（分片）
[片段1: 300字] [片段2: 300字] ... [片段17: 300字]
    ↓ Embed
[向量1] [向量2] ... [向量17]
    ↓ 存入向量数据库
```

**分片策略对比**：

| 策略            | 描述                               | 适用场景               |
| --------------- | ---------------------------------- | ---------------------- |
| 固定长度分片    | 每 500 字切一刀                    | 最简单，适合入门       |
| 按段落/标题分片 | 遇到 `##` 或空行切分               | Markdown 文档          |
| 重叠分片        | 每片 500 字，相邻片段有 100 字重叠 | 防止上下文断裂（推荐） |
| 语义分片        | 用 NLP 检测话题变化点              | 高级场景               |

**实战练习**：把你的 `docs/` 目录下的学习笔记导入知识库

```
新建文件：
├── lib/rag/chunker.ts              ← 文本分片工具
├── scripts/ingest-docs.ts          ← 批量导入脚本（读取 docs/*.md → 分片 → embed → 存储）
```

**本周交付**：

- [ ] 实现 Markdown 感知的分片器（按标题 + 重叠窗口）
- [ ] 把 `docs/` 下的 3-5 个 .md 文件全部导入 Supabase
- [ ] 验证：搜索 "结构化输出" 能找到 vercel-ai-sdk-guide.md 的相关段落

---

#### Week 8：RAG Pipeline 集成到聊天

**学习目标**：把检索 + 生成串起来，让你的聊天 AI 能基于私有知识回答。

**这是最关键的一周 ⭐**

**RAG 完整流程**：

```
用户提问: "Vercel AI SDK 的结构化输出怎么用？"
    │
    ▼
① Embed 查询  →  embed("Vercel AI SDK 的结构化输出怎么用？")
    │
    ▼
② 语义检索    →  Supabase: SELECT * ORDER BY embedding <=> query LIMIT 5
    │
    ▼
③ 增强 Prompt →  system: "基于以下参考资料回答：\n{检索到的文档片段}"
    │
    ▼
④ streamText  →  模型基于真实文档生成回答
    │
    ▼
⑤ 返回给前端  →  附带引用来源（哪个文档的哪个片段）
```

**实战练习**：改造现有的 `/api/chat/route.ts`

```
修改文件：
├── lib/rag/retriever.ts            ← 封装检索逻辑
├── app/api/chat/route.ts           ← 在 streamText 之前加入检索步骤
└── components/chat/ChatMessages.tsx ← （可选）展示引用来源
```

**核心代码结构**：

```typescript
// route.ts 改造后
export async function POST(req: Request) {
	const { messages } = await req.json()
	const lastMessage = messages[messages.length - 1]

	// ① 检索相关文档
	const relevantDocs = await retrieveDocuments(lastMessage.content, { topK: 5 })

	// ② 构建增强 Prompt
	const context = relevantDocs.map(d => d.content).join('\n---\n')
	const augmentedSystem = `基于以下参考资料回答用户问题：\n${context}\n\n如果参考资料中没有相关信息，请如实告知。`

	// ③ 生成回答
	const result = streamText({
		model,
		system: augmentedSystem,
		messages,
	})

	return result.toUIMessageStreamResponse()
}
```

**本周交付**：

- [ ] 聊天 AI 能基于 docs/ 下的笔记回答问题
- [ ] 问 "generateObject 怎么用" 能得到基于你自己文档的回答
- [ ] 问一个文档里没有的问题，AI 会说 "资料中未提及"

---

#### Week 9：进阶检索技巧

**学习目标**：提升检索质量，这是 RAG 系统好不好用的关键。

**进阶技巧**：

| 技巧                | 描述                                    | 复杂度 |
| ------------------- | --------------------------------------- | ------ |
| **Metadata Filter** | 按来源、日期、标签过滤后再搜索          | ⭐     |
| **Query Rewriting** | 用 LLM 改写用户问题再检索（如展开缩写） | ⭐⭐   |
| **Hybrid Search**   | 向量搜索 + 关键词搜索结合               | ⭐⭐   |
| **Reranking**       | 先粗检索 Top-20，再用模型精排到 Top-5   | ⭐⭐⭐ |
| **多轮上下文**      | 把历史对话也纳入检索查询                | ⭐⭐   |

**建议优先实现**：

1. Metadata Filter（最简单，效果好）
2. 多轮上下文（你的聊天是多轮的）
3. Hybrid Search（Supabase 原生支持 `ts_rank` 全文搜索）

**本周交付**：

- [ ] 至少实现 2 种进阶检索技巧
- [ ] 对比改进前后的检索质量（同样的问题，返回的文档更精准了吗？）

---

#### Week 10：评估与生产化

**学习目标**：如何衡量 RAG 系统的好坏，以及生产环境的注意事项。

**评估维度**：

| 指标               | 含义                         | 怎么测                       |
| ------------------ | ---------------------------- | ---------------------------- |
| **Relevance**      | 检索到的文档和问题相关吗？   | 人工打分 or LLM-as-Judge     |
| **Faithfulness**   | 回答是否忠实于检索到的文档？ | 检查有没有"幻觉"（编造内容） |
| **Answer Quality** | 最终回答对用户有帮助吗？     | 端到端评估                   |

**生产化清单**：

```
□ Embedding 缓存（同样的查询不重复调用）
□ 检索结果缓存（热门问题用 Redis/内存缓存）
□ 文档版本管理（更新文档后重新 embed）
□ 错误降级（向量库不可用时，退回到纯 LLM 模式）
□ 可观测性（记录每次检索的 query、返回文档数、相似度分数）
```

**本周交付**：

- [ ] 准备 10-20 个测试问题，手动评估 RAG 回答质量
- [ ] 实现至少一项生产化优化（推荐：缓存 or 降级）
- [ ] 撰写第二阶段总结文档

---

### 📦 第二阶段需要安装的依赖

```bash
# Embedding 模型
npm install @ai-sdk/openai

# 向量数据库
npm install @supabase/supabase-js

# （可选）文本分片工具
npm install langchain @langchain/textsplitters
```

### 🗂️ 第二阶段预计文件结构

```
lib/
├── supabase.ts                  ← Supabase 客户端
└── rag/
    ├── embeddings.ts            ← Embedding 封装
    ├── chunker.ts               ← 文本分片
    └── retriever.ts             ← 语义检索

app/api/
├── embed/route.ts               ← Embedding 调试 API
└── rag/ingest/route.ts          ← 文档导入 API

app/debug/
├── embedding/page.tsx           ← 余弦相似度调试
└── rag/page.tsx                 ← RAG 检索调试

scripts/
└── ingest-docs.ts               ← 批量文档导入脚本
```

### 🎯 第二阶段完成标志

> 当你的聊天 AI 能准确回答 **"generateObject 的三层原理是什么？"**，并且引用你自己写的 `vercel-ai-sdk-guide.md` 文档内容时 — 第二阶段就完成了 ✅
