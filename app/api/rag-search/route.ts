import { embed, embedMany } from 'ai'
import { google } from '@ai-sdk/google'

// 1. 模拟数据库：我们的“知识库”
const knowledgeBase = [
	'苹果含有丰富的维生素C，每天吃一个对身体好。',
	'Python是一种广泛使用的高级编程语言，极其适合数据分析。',
	'引力波是时空弯曲中的涟漪，由爱因斯坦的广义相对论预言。',
	'React是一个用于构建用户界面的JavaScript库，由Meta维护。',
	'经常熬夜会导致免疫力下降，成年人每天应保证7-8小时睡眠。',
	'马斯克的SpaceX公司致力于降低太空运输成本，目标是火星殖民。',
	'水是由氢和氧两种元素组成的无机物，常温下为透明液体。',
	'比特币是第一种去中心化的加密货币，由中本聪在2008年提出。',
	'深度学习是机器学习的分支，通过多层神经网络对数据进行高层抽象。',
	'故宫是中国明清两代的皇家宫殿，旧称紫禁城，位于北京中轴线。',
]

// 内存缓存：模拟向量数据库 (Vector DB)
// 结构：[{ text: "苹果...", embedding: [0.12, -0.05, ...] }, ...]
let vectorDB: { text: string; embedding: number[] }[] = []

// 纯手工计算余弦相似度 (Cosine Similarity)
function cosineSimilarity(vecA: number[], vecB: number[]): number {
	let dotProduct = 0,
		normA = 0,
		normB = 0
	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i]
		normA += vecA[i] * vecA[i]
		normB += vecB[i] * vecB[i]
	}
	if (normA === 0 || normB === 0) return 0
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function POST(req: Request) {
	const { query } = await req.json()

	// 2. 初始化知识库（仅在第一次请求时执行，模拟数据入库）
	if (vectorDB.length === 0) {
		console.log('正在构建知识库向量索引...')
		const { embeddings } = await embedMany({
			model: google.embeddingModel('gemini-embedding-001'),
			values: knowledgeBase,
		})
		// 将文本和生成的向量一一对应存起来
		vectorDB = knowledgeBase.map((text, i) => ({
			text,
			embedding: embeddings[i],
		}))
	}

	// 3. 将用户的“搜索词”转化为向量 (Query Embedding)
	const { embedding: queryVector } = await embed({
		model: google.embeddingModel('gemini-embedding-001'),
		value: query,
	})

	// 4. 向量检索 (KNN - K近邻算法的暴力破解版)
	// 遍历知识库，计算 Query 向量与每一条知识向量的相似度
	const searchResults = vectorDB.map(doc => ({
		text: doc.text,
		similarity: cosineSimilarity(queryVector, doc.embedding),
	}))

	// 5. 排序、过滤并取 Top-K
	searchResults.sort((a, b) => b.similarity - a.similarity)

	// 关键的一步：抛弃低于特定阈值（比如 0.60）的垃圾数据
	const THRESHOLD = 0.6
	const filteredResults = searchResults.filter(item => item.similarity >= THRESHOLD)

	// 如果过滤后一条都没有，就直接返回空数组，告诉大模型“知识库里没提这件事”
	const topK = filteredResults.slice(0, 3)

	return Response.json({ results: topK })
}
