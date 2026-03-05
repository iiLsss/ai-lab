'use client'
import { useState } from 'react'

interface EmbedResult {
	similarity: number
	vectorDimensions: number
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
				vectorDimensions: 0,
				preview1: [],
				preview2: [],
				error: '请求失败',
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='min-h-screen bg-white text-zinc-900 selection:bg-blue-200 selection:text-blue-900 py-16 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-3xl mx-auto'>
				{/* 头部标题区域 */}
				<header className='mb-12'>
					<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 mb-4'>Embedding 相似度测试</h1>
					<p className='text-lg text-zinc-600 leading-relaxed max-w-2xl'>
						通过 Google 的 <code>text-embedding-004</code> 模型将文本映射为高维向量，并计算其余弦相似度（Cosine Similarity）。 得分越接近 1，表示语义越相关。
					</p>
				</header>

				{/* 输入区域 */}
				<div className='grid sm:grid-cols-2 gap-6 mb-8'>
					<div className='flex flex-col gap-2'>
						<label className='text-sm font-semibold text-zinc-900'>文本 1</label>
						<textarea
							value={text1}
							onChange={e => setText1(e.target.value)}
							className='w-full h-32 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none'
						/>
					</div>
					<div className='flex flex-col gap-2'>
						<label className='text-sm font-semibold text-zinc-900'>文本 2</label>
						<textarea
							value={text2}
							onChange={e => setText2(e.target.value)}
							className='w-full h-32 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none'
						/>
					</div>
				</div>

				{/* 按钮区域 */}
				<div className='mb-12'>
					<button
						onClick={handleCalculate}
						disabled={isLoading || !text1 || !text2}
						className='inline-flex items-center justify-center rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all'>
						{isLoading ? (
							<>
								<svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
									<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
									<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
								</svg>
								计算中...
							</>
						) : (
							'生成向量并计算'
						)}
					</button>
				</div>

				{/* 结果区域 */}
				{result && !result.error && (
					<div className='rounded-2xl border border-zinc-200 bg-zinc-50/50 p-8 shadow-sm'>
						<div className='flex flex-col sm:flex-row items-center justify-between gap-8 mb-8 pb-8 border-b border-zinc-200'>
							<div className='space-y-1 text-center sm:text-left'>
								<h2 className='text-sm font-semibold uppercase tracking-wider text-zinc-500'>Cosine Similarity</h2>
								<div className='text-5xl font-extrabold tracking-tight text-zinc-900'>{result.similarity.toFixed(4)}</div>
							</div>
							<div className='text-zinc-600 text-sm bg-white border border-zinc-200 rounded-lg px-4 py-2 shadow-sm'>
								{result.similarity > 0.8 ? '🔥 语义非常接近' : result.similarity > 0.5 ? '👍 语义有一定相关性' : '❄️ 语义没什么关系'}
							</div>
						</div>

						<div className='space-y-6'>
							<div className='flex items-center justify-between text-sm text-zinc-500 font-medium'>
								<span className='flex items-center gap-1.5'>
									<svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
										<path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'></path>
										<polyline points='3.27 6.96 12 12.01 20.73 6.96'></polyline>
										<line x1='12' y1='22.08' x2='12' y2='12'></line>
									</svg>
									text-embedding-004
								</span>
								<span className='bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-md text-xs font-mono'>{result.vectorDimensions} 维</span>
							</div>

							<div className='grid sm:grid-cols-2 gap-4'>
								<div className='rounded-xl border border-zinc-200 bg-white p-5 shadow-sm overflow-hidden'>
									<div className='text-xs font-semibold text-zinc-600 mb-3 flex items-center gap-2'>
										<span className='w-2 h-2 rounded-full bg-blue-500'></span>
										文本 1 向量 (前5维)
									</div>
									<div className='font-mono text-sm text-zinc-500 break-all bg-zinc-50 rounded p-3 border border-zinc-100'>[{result.preview1.map(n => n.toFixed(4)).join(', ')}, ...]</div>
								</div>
								<div className='rounded-xl border border-zinc-200 bg-white p-5 shadow-sm overflow-hidden'>
									<div className='text-xs font-semibold text-zinc-600 mb-3 flex items-center gap-2'>
										<span className='w-2 h-2 rounded-full bg-indigo-500'></span>
										文本 2 向量 (前5维)
									</div>
									<div className='font-mono text-sm text-zinc-500 break-all bg-zinc-50 rounded p-3 border border-zinc-100'>[{result.preview2.map(n => n.toFixed(4)).join(', ')}, ...]</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{result?.error && (
					<div className='mt-8 rounded-xl border border-red-200 bg-red-50 p-4'>
						<div className='flex'>
							<div className='flex-shrink-0'>
								<svg className='h-5 w-5 text-red-500' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
									<path
										fillRule='evenodd'
										d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z'
										clipRule='evenodd'
									/>
								</svg>
							</div>
							<div className='ml-3'>
								<h3 className='text-sm font-medium text-red-800'>计算出错</h3>
								<div className='mt-2 text-sm text-red-700'>
									<p>{result.error}</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
