import { streamObject } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
})
// 定义一个知识卡片的结构
const knowledgeCardSchema = z.object({
	title: z.string().describe('卡片标题'),
	summary: z.string().describe('简要总结，2-3句话'),
	keyPoints: z.array(z.string()).describe('3-5个关键要点'),
	difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('难度级别'),
	tags: z.array(z.string()).describe('相关标签'),
})

// useObject 的 submit(input) 会将 input 直接作为 JSON body 发送
// 所以 submit({ prompt: '...' }) 发送的就是 { prompt: '...' }
export async function POST(req: Request) {
	const { prompt } = await req.json()

	const result = streamObject({
		model: openrouter.chat('google/gemini-2.5-flash'),
		system: `你是一个专业的知识卡片生成助手。请根据用户提供的提示词，生成一个结构化的知识卡片。`,
		prompt,
		schema: knowledgeCardSchema,
	})
	return result.toTextStreamResponse()
}
