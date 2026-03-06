import { embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { supabaseAdmin } from '@/lib/supabase'

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export async function POST(req: Request) {
	try {
		const { text, metadata } = await req.json()

		if (!text) {
			return Response.json({ error: '文档内容不能为空' }, { status: 400 })
		}

		console.log('1. 开始将文本转化为向量...')
		const { embedding } = await embed({
			model: google.embeddingModel('text-embedding-004'),
			value: text,
		})

		console.log(`2. 向量生成完毕，维度: ${embedding.length}。准备写入 Supabase...`)
		const { data, error } = await supabaseAdmin
			.from('documents')
			.insert({
				content: text,
				metadata: metadata || {},
				embedding: embedding, // 这里就是把生成的数组原样存入 vector(768) 类型的字段
			})
			.select()

		if (error) {
			throw error
		}

		console.log('3. 成功写入 Supabase')
		return Response.json({ success: true, inserted: data })
	} catch (error: any) {
		console.error('[Ingest Error]:', error)
		return Response.json({ error: error.message || '入库失败' }, { status: 500 })
	}
}
