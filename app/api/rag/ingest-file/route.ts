import { embedMany } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// 这是一个极其简单的基于 Markdown 标题的分片器 (Chunking)
// 真正的生产环境建议使用 LangChain 的 RecursiveCharacterTextSplitter
function chunkMarkdown(text: string): string[] {
	// 以 Markdown 的二级或三级标题作为切分点
	const chunks = text.split(/\n(?=#{2,3} )/)

	// 剔除掉太短的无意义片段，并且清除前后空格
	return chunks.map(chunk => chunk.trim()).filter(chunk => chunk.length > 20)
}

export async function POST(req: Request) {
	try {
		// 1. 读取本地指定的 Markdown 文件
		const filePath = path.join(process.cwd(), 'docs', 'streamdown-analysis.md')
		if (!fs.existsSync(filePath)) {
			return Response.json({ error: '文件不存在: ' + filePath }, { status: 404 })
		}

		const text = fs.readFileSync(filePath, 'utf-8')

		// 2. 对长文进行分片处理 (Chunking)
		// 为什么要分片？因为直接把 1万字通过 Embedding 变成一组数字，语义会严重混合丢失
		// 切成 500 字一小块分别 Embedding，检索的时候能精准命中局部！
		const chunks = chunkMarkdown(text)
		console.log(`[Ingest File] 成功将文档切分为 ${chunks.length} 个 Chunk 片段`)

		if (chunks.length === 0) {
			return Response.json({ error: '分片后没有有效内容' }, { status: 400 })
		}

		// 3. 批量生成向量 (EmbedMany)
		console.log('[Ingest File] 正在请求大模型生成向量...')

		// const { embeddings } = await embedMany({
		// 	model: google.embeddingModel('text-embedding-004'),
		// 	values: chunks,
		// })

		const { embeddings } = await embedMany({
			model: google.textEmbeddingModel('gemini-embedding-001'),
			values: chunks,
			providerOptions: {
				google: {
					outputDimensionality: 768,
				},
			},
		})

		// 4. 将生成的多个向量一一对应存入 Supabase 数据库
		const rowsToInsert = chunks.map((chunkText, index) => ({
			content: chunkText,
			metadata: {
				source: 'docs/streamdown-analysis.md',
				chunk_index: index,
				total_chunks: chunks.length,
			},
			embedding: embeddings[index],
		}))

		console.log(`[Ingest File] 正在将 ${rowsToInsert.length} 条记录写入 Supabase...`)
		const { error } = await supabaseAdmin.from('documents').insert(rowsToInsert)

		if (error) {
			throw error
		}

		console.log('[Ingest File] ✅ 全部分片写入成功！')
		return Response.json({ success: true, count: rowsToInsert.length })
	} catch (error: any) {
		console.error('[Ingest File Error]:', error)
		return Response.json({ error: error.message || '文件入库失败' }, { status: 500 })
	}
}
