# 🎓 Structured Output 结构化输出学习指南

> 基于你当前项目 `diqiu-lab` 的实战学习路线

## 📌 核心概念

**Structured Output** = 让 LLM 按照你定义的 **JSON Schema** 格式输出数据，而不是自由文本。

```
传统 streamText:
  用户: "北京天气怎么样？"  →  AI: "北京今天晴，温度25℃，适合出门..."（自由文本）

结构化输出:
  用户: "北京天气怎么样？"  →  AI: { city: "北京", temp: 25, weather: "晴", suggestion: "适合出门" }
```

**为什么重要？**

- 前端可以用结构化数据渲染 **UI 卡片**（天气卡、代码卡、知识卡）
- 数据可以直接存储、计算、传递给其他 API
- 避免解析自由文本的不确定性

---

## 🏗️ 学习路线（3 个阶段）

### 阶段 1️⃣：理解 Schema 定义（Zod）

你的项目已经安装了 `zod`，它是 AI SDK 用来定义 Schema 的核心库。

```typescript
import { z } from 'zod'

// 定义一个"知识卡片"的 Schema
const knowledgeCardSchema = z.object({
	title: z.string().describe('卡片标题'),
	summary: z.string().describe('简要总结，2-3句话'),
	keyPoints: z.array(z.string()).describe('3-5个关键要点'),
	difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('难度级别'),
	tags: z.array(z.string()).describe('相关标签'),
})
```

> [!TIP] `.describe()` 非常重要！它是给 LLM 的提示指令，告诉模型每个字段应该填什么内容。

---

### 阶段 2️⃣：后端 API 实现

#### 方式 A：`generateObject`（一次性返回完整对象）

```typescript
// app/api/knowledge-card/route.ts
import { generateObject, UIMessage, convertToModelMessages } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
})

const knowledgeCardSchema = z.object({
	title: z.string().describe('卡片标题'),
	summary: z.string().describe('简要总结，2-3句话'),
	keyPoints: z.array(z.string()).describe('3-5个关键要点'),
	difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
	tags: z.array(z.string()),
})

export async function POST(req: Request) {
	const { prompt } = await req.json()

	const result = await generateObject({
		model: openrouter.chat('google/gemini-2.5-flash'),
		schema: knowledgeCardSchema,
		prompt: `为以下主题生成一张知识卡片：${prompt}`,
	})

	return result.toJsonResponse() // 直接返回 JSON
}
```

#### 方式 B：`streamObject`（流式返回，逐步填充）

```typescript
// app/api/knowledge-card-stream/route.ts
import { streamObject } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'

// ... 同上的 schema 和 provider 配置

export async function POST(req: Request) {
	const { prompt } = await req.json()

	const result = streamObject({
		model: openrouter.chat('google/gemini-2.5-flash'),
		schema: knowledgeCardSchema,
		prompt: `为以下主题生成一张知识卡片：${prompt}`,
	})

	return result.toTextStreamResponse() // 流式返回
}
```

> [!IMPORTANT] **最新 SDK 变化**：在 AI SDK v6+ 中，`generateObject` 和 `streamObject` 已标记为 `@deprecated`，推荐使用 `generateText` / `streamText` + `output`
> 配置来实现同样效果。但作为学习，先掌握这两个更直观的 API，再过渡到新方式。

#### 方式 C：新推荐 — `streamText` + `output`（了解即可）

```typescript
import { streamText, Output } from 'ai'

const result = streamText({
	model: openrouter.chat('google/gemini-2.5-flash'),
	prompt: `为以下主题生成一张知识卡片：${prompt}`,
	output: Output.object({ schema: knowledgeCardSchema }),
})
```

---

### 阶段 3️⃣：前端消费结构化数据

#### 使用 `experimental_useObject`（配合 `streamObject`）

```tsx
'use client'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { z } from 'zod'

// 前端也需要定义同样的 Schema（用于类型推导）
const knowledgeCardSchema = z.object({
	title: z.string(),
	summary: z.string(),
	keyPoints: z.array(z.string()),
	difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
	tags: z.array(z.string()),
})

export function KnowledgeCard() {
	const { object, submit, isLoading, error } = useObject({
		api: '/api/knowledge-card-stream',
		schema: knowledgeCardSchema,
	})

	return (
		<div>
			<button onClick={() => submit({ prompt: 'React Hooks' })}>生成知识卡片</button>

			{isLoading && <p>生成中...</p>}

			{object && (
				<div className='card'>
					<h2>{object.title}</h2>
					<p>{object.summary}</p>
					<ul>
						{object.keyPoints?.map((point, i) => (
							<li key={i}>{point}</li>
						))}
					</ul>
					<span>难度: {object.difficulty}</span>
					<div>
						{object.tags?.map(tag => (
							<span key={tag}>#{tag}</span>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
```

> [!NOTE] `useObject` 的 **流式特性**：在 `streamObject` 模式下，`object` 会**逐步填充** —— 先出现 `title`，再出现 `summary`，然后 `keyPoints` 一个个出现。所以前端渲染时要用 `?.` 做可选链访问。

---

## 🎯 实战练习建议

### 练习 1：最简入门 — 情绪分类器 `generateObject`

在你现在的聊天项目里加一个小功能：对每条用户消息做**情绪分析**：

```typescript
const sentimentSchema = z.object({
	emotion: z.enum(['happy', 'sad', 'angry', 'neutral', 'curious']),
	confidence: z.number().min(0).max(1),
	reason: z.string(),
})
```

这个练习的要点：

- **Schema 很简单**，容易 debug
- **结果可直接渲染**成 emoji（😊😢😠😐🤔）
- 帮助你理解 Schema → LLM → 类型安全对象 的完整流程

### 练习 2：进阶 — 知识卡片 `streamObject`

用上面的 `knowledgeCardSchema`，在聊天界面里当用户说 "生成xxx的知识卡片" 时，渲染一个精美的卡片 UI。

这个练习的要点：

- 体验 **流式对象** 的逐步填充效果
- 练习前端如何处理 **partial object**
- 学习 `useObject` Hook 的用法

### 练习 3：高级 — 混合流式文本 + 结构化卡片

真正的生产应用会混合使用两种模式：

- **聊天回复**用 `streamText`（自由文本流）
- **特定功能**用 `generateObject`（按需调用）

例如：用户问 "帮我学 React"，AI 先给出文字回答（streamText），然后在底部附加一张结构化的学习路线卡片。

---

## 📊 三种方式对比

|           | `generateObject`     | `streamObject`     | `streamText` + `output` |
| --------- | -------------------- | ------------------ | ----------------------- |
| 返回方式  | 一次性完整返回       | 流式逐步填充       | 流式 + 结构化           |
| 适用场景  | 短小对象、工具调用   | 大对象、用户可见   | 新方式（推荐）          |
| 前端 Hook | `fetch` + `useState` | `useObject`        | `useChat`               |
| 用户体验  | 等待 → 完整显示      | 逐步出现（动画感） | 文本+对象混合           |
| SDK 状态  | `@deprecated`        | `@deprecated`      | ✅ 推荐                 |

---

## ⚡ 快速启动建议

**从练习 1 开始**：

1. 新建 `app/api/sentiment/route.ts`
2. 用 `generateObject` + `sentimentSchema`
3. 前端用简单的 `fetch` 调用
4. 在聊天消息旁边显示情绪 emoji

这样 30 分钟内你就能完成一个完整的结构化输出闭环，之后再逐步进阶。
