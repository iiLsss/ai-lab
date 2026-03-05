import { embedMany } from 'ai'
// 注意：OpenRouter 主要针对对话模型，Embedding 通常使用 OpenAI 或 Google 官方 SDK
// import { google } from '@ai-sdk/google'

import { createGoogleGenerativeAI } from '@ai-sdk/google'

// 显式传入自定义的环境变量
const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// 纯手工计算余弦相似度的工具函数
function cosineSimilarity(vecA: number[], vecB: number[]): number {
	let dotProduct = 0
	let normA = 0
	let normB = 0

	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i]
		normA += vecA[i] * vecA[i]
		normB += vecB[i] * vecB[i]
	}

	if (normA === 0 || normB === 0) return 0
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function POST(req: Request) {
	const { text1, text2 } = await req.json()

	// 1. 调用 Embedding 模型，一次性获取两个文本的向量
	const { embeddings } = await embedMany({
		model: google.embeddingModel('gemini-embedding-001'),
		values: [text1, text2],
	})

	console.log(embeddings)
	// 2. 提取生成的两个高维数组 (如 768 维)
	const vector1 = embeddings[0]
	const vector2 = embeddings[1]

	// 3. 计算相似度
	const similarityScore = cosineSimilarity(vector1, vector2)

	return Response.json({
		vectorDimensions: vector1.length, // 展示向量维度，建立直观认知
		similarity: similarityScore,
		// 截取前 5 个数值给前端展示一下“向量长什么样”
		preview1: vector1.slice(0, 5),
		preview2: vector2.slice(0, 5),
	})
}
