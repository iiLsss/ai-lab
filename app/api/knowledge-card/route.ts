// import { streamText, createTextStreamResponse } from 'ai'
// import { createOpenRouter } from '@openrouter/ai-sdk-provider'
// import { z } from 'zod'

// const openrouter = createOpenRouter({
// 	apiKey: process.env.OPENROUTER_API_KEY,
// })

// // 知识卡片的结构化 Schema
// const knowledgeCardSchema = z.object({
// 	title: z.string().describe('卡片标题'),
// 	summary: z.string().describe('简要总结，2-3句话'),
// 	keyPoints: z.array(z.string()).describe('3-5个关键要点'),
// 	difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('难度级别'),
// 	tags: z.array(z.string()).describe('相关标签'),
// })

// export type KnowledgeCard = z.infer<typeof knowledgeCardSchema>

/**
 * 练习 3：混合模式
 * 1. 先用 streamText 流式输出文本回答
 * 2. 文本完成后，用 generateObject 生成结构化卡片
 * 3. 把卡片数据附加在流的末尾，用特殊标记包裹
 */
// export async function POST(req: Request) {
// 	const { prompt } = await req.json()
// 	const model = openrouter.chat('google/gemini-2.5-flash')

// 	// 第 1 步：流式文本回答
// 	const textResult = streamText({
// 		model,
// 		system: `你是一个专业的学习助手。请用简洁易懂的方式回答用户的问题。
// 回答要求：
// - 先给出核心概念解释
// - 然后给出学习建议
// - 语言自然流畅，适合初学者阅读
// - 不要在回答末尾提到"知识卡片"相关内容，卡片会自动生成`,
// 		prompt,
// 	})

// 	// 创建一个 TransformStream 来组合文本流 + 卡片数据
// 	const encoder = new TextEncoder()

// 	const combinedStream = new ReadableStream({
// 		async start(controller) {
// 			// 先把 streamText 的内容全部推送出去
// 			const reader = textResult.textStream.getReader()
// 			try {
// 				while (true) {
// 					const { done, value } = await reader.read()
// 					if (done) break
// 					controller.enqueue(encoder.encode(value))
// 				}
// 			} finally {
// 				reader.releaseLock()
// 			}

// 			// 第 2 步：文本流结束后，生成结构化卡片
// 			try {
// 				const cardResult = await generateObject({
// 					model,
// 					schema: knowledgeCardSchema,
// 					prompt: `请为以下主题生成一张知识卡片（中文）：${prompt}`,
// 				})

// 				// 用特殊标记包裹卡片 JSON，前端解析时识别
// 				const cardJson = JSON.stringify(cardResult.object)
// 				controller.enqueue(encoder.encode(`\n\n<!--KNOWLEDGE_CARD_START-->${cardJson}<!--KNOWLEDGE_CARD_END-->`))
// 			} catch (error) {
// 				console.error('[Card Generation Error]', error)
// 				// 卡片生成失败不影响文本回答
// 			}

// 			controller.close()
// 		},
// 	})

// 	return new Response(combinedStream, {
// 		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
// 	})
// }

// app/api/chat/route.ts

import { streamText, Output } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY!,
})

// 知识卡片 schema
const knowledgeCardSchema = z.object({
	title: z.string().describe('知识点标题'),
	summary: z.string().describe('简要总结'),
	keyPoints: z.array(z.string()).describe('关键要点列表'),
	example: z.string().describe('举例说明'),
})

// 整体输出 schema
const responseSchema = z.object({
	text: z.string().describe('回答正文'),
	knowledgeCard: knowledgeCardSchema,
})

export async function POST(req: Request) {
	const { messages } = await req.json()

	const model = openrouter.chat('google/gemini-2.5-flash')

	const result = streamText({
		model,
		messages,
		system: `
你是一个专业的学习助手。
请详细回答用户问题。
同时提取一个知识卡片用于复习。
`,
		output: Output.object({
			schema: responseSchema,
		}),
	})

	// 直接返回流式响应
	return result.toTextStreamResponse()
}
