'use client'
import { useState } from 'react'

interface EmbedResult {
	similarity: number
	dimensions: number
	preview1: number[]
	preview2: number[]
	error?: string
}

export default function EmbeddingDebugPage() {
	const [text1, setText1] = useState('猫喜欢吃鱼')
	const [text2, setText2] = useState('小猫爱吃海鲜')
	const [isLoading, setIsLoading] = useState(false)
	const [result, setResult] = useState<EmbedResult | null>(null)

	const handleCalculate = async () => {
		if (!text1 || !text2) return
		setIsLoading(true)
		setResult(null)

		try {
			const res = await fetch('/api/embed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text1, text2 }),
			})

			const data = await res.json()
			setResult(data)
		} catch (error) {
			setResult({
				similarity: 0,
				dimensions: 0,
				preview1: [],
				preview2: [],
				error: '请求失败',
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='min-h-screen bg-slate-950 text-slate-200 p-8'>
			<div className='max-w-4xl mx-auto space-y-8'>
				<div className='space-y-2'>
					<h1 className='text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent'>Week 5: Embedding 向量与相似度</h1>
					<p className='text-slate-400'>输入两段文本，计算它们的余弦相似度（Cosine Similarity）。得分越接近 1，表示这两段文本在语义上越相似。</p>
				</div>

				<div className='grid md:grid-cols-2 gap-6'>
					<div className='space-y-2'>
						<label className='text-sm font-medium text-slate-400'>文本 1</label>
						<textarea
							value={text1}
							onChange={e => setText1(e.target.value)}
							className='w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none'
						/>
					</div>
					<div className='space-y-2'>
						<label className='text-sm font-medium text-slate-400'>文本 2</label>
						<textarea
							value={text2}
							onChange={e => setText2(e.target.value)}
							className='w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none'
						/>
					</div>
				</div>

				<div className='flex justify-center'>
					<button
						onClick={handleCalculate}
						disabled={isLoading || !text1 || !text2}
						className='px-8 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20'>
						{isLoading ? '计算中...' : '生成向量并计算相似度'}
					</button>
				</div>

				{result && !result.error && (
					<div className='bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6'>
						{/* 相似度得分大标题 */}
						<div className='text-center space-y-2'>
							<div className='text-sm font-bold text-slate-500 tracking-widest uppercase'>Cosine Similarity</div>
							<div className='text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400'>{result.similarity.toFixed(4)}</div>
							<p className='text-slate-400 text-sm'>{result.similarity > 0.8 ? '🔥 语义非常接近' : result.similarity > 0.5 ? '👍 语义有一定相关性' : '❄️ 语义没什么关系'}</p>
						</div>

						{/* 向量预览 */}
						<div className='border-t border-slate-800 pt-6 space-y-4'>
							<div className='text-sm text-slate-400 flex justify-between items-center'>
								<span>底层模型: text-embedding-3-small</span>
								<span>向量维度: {result.dimensions} 维</span>
							</div>

							<div className='grid md:grid-cols-2 gap-4'>
								<div className='bg-slate-950 p-4 rounded-xl border border-slate-800'>
									<div className='text-xs text-slate-500 mb-2'>文本 1 的前 10 维：</div>
									<div className='font-mono text-xs text-slate-400 break-all leading-relaxed'>[{result.preview1.map(n => n.toFixed(4)).join(', ')}, ...]</div>
								</div>
								<div className='bg-slate-950 p-4 rounded-xl border border-slate-800'>
									<div className='text-xs text-slate-500 mb-2'>文本 2 的前 10 维：</div>
									<div className='font-mono text-xs text-slate-400 break-all leading-relaxed'>[{result.preview2.map(n => n.toFixed(4)).join(', ')}, ...]</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{result?.error && <div className='p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center'>{result.error}</div>}
			</div>
		</div>
	)
}
