import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
})

export async function POST(req: Request) {
	const { messages }: { messages: UIMessage[] } = await req.json()

	const result = streamText({
		model: openrouter.chat('google/gemini-2.5-flash'),
		system: `你是一个专业的 AI 助手。在回答用户问题前，请务必包含 <thinking> 标签，并在其中按以下维度进行思考：
      1. 拆解问题：明确用户意图，识别核心诉求。
      2. 逻辑推导：建立清晰的推理链条。
      3. 自我校验：检查逻辑漏洞，优化表达准确性。
      请严格按照以下格式回答：
      <thinking>
      [此处进行深度思考]
      </thinking>
      [此处给出正式回答]`,
		messages: await convertToModelMessages(messages),
	})

	return result.toUIMessageStreamResponse()
}
