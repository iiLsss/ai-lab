import { generateObject, UIMessage, convertToModelMessages } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
})

const sentimentSchema = z.object({
	emotion: z.enum(['happy', 'sad', 'angry', 'neutral', 'curious']),
	confidence: z.number().min(0).max(1),
	reason: z.string(),
})

export async function POST(req: Request) {
	const { prompt } = await req.json()
	const result = await generateObject({
		model: openrouter.chat('google/gemini-2.5-flash'),
		system: `你是一个情绪分析助手。请根据用户提供的文本，分析用户的情绪，并返回情绪类型、置信度和原因。`,
		prompt,
		schema: sentimentSchema,
	})

	return result.toJsonResponse() // 直接返回 JSON
}
