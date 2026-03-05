'use client'

import { useState } from 'react'

export default function RAGSearch() {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<{ text: string; similarity: number }[]>([])
	const [loading, setLoading] = useState(false)
	const [hasSearched, setHasSearched] = useState(false)

	const handleSearch = async () => {
		if (!query.trim()) return
		setLoading(true)
		setHasSearched(true)

		try {
			const res = await fetch('/api/rag-search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query }),
			})
			const data = await res.json()
			setResults(data.results || [])
		} catch (err) {
			console.error('Search failed:', err)
			setResults([])
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='min-h-screen bg-white text-zinc-900 selection:bg-blue-200 selection:text-blue-900 py-16 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-3xl mx-auto'>
				{/* 头部标题区域 */}
				<header className='mb-12'>
					<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 mb-4 flex items-center gap-3'>
						<svg className='w-8 h-8 text-blue-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
							<circle cx='11' cy='11' r='8'></circle>
							<line x1='21' y1='21' x2='16.65' y2='16.65'></line>
						</svg>
						语义搜索引擎 (RAG 第一步)
					</h1>
					<p className='text-lg text-zinc-600 leading-relaxed max-w-2xl'>
						基于向量的语义检索。在此输入您的问题或关键词，系统会将输入的文本转化为 Embedding 向量，并与预设库中的内容计算余弦相似度，从而找出语义最相关的文档段落。
					</p>
				</header>

				{/* 搜索框区域 */}
				<div className='flex flex-col sm:flex-row gap-3 mb-10'>
					<div className='relative flex-1'>
						<div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
							<svg className='w-5 h-5 text-zinc-400' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
								<circle cx='11' cy='11' r='8'></circle>
								<line x1='21' y1='21' x2='16.65' y2='16.65'></line>
							</svg>
						</div>
						<input
							type='text'
							value={query}
							onChange={e => setQuery(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleSearch()}
							placeholder='例如：宇宙奥秘 / 保持健康的方法 / 前端技术'
							className='w-full rounded-xl border border-zinc-200 bg-white pl-12 pr-4 py-3.5 text-sm text-zinc-900 shadow-sm placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow'
						/>
					</div>
					<button
						onClick={handleSearch}
						disabled={loading || !query.trim()}
						className='inline-flex items-center justify-center rounded-xl bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all'>
						{loading ? (
							<>
								<svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
									<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
									<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
								</svg>
								搜索中...
							</>
						) : (
							'搜索'
						)}
					</button>
				</div>

				{/* 搜索结果区域 */}
				<div className='space-y-4'>
					{results.length > 0 && <h3 className='text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-200 pb-2'>检索结果</h3>}

					{results.map((item, index) => (
						<div key={index} className='group p-6 border border-zinc-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden'>
							{/* 左侧装饰线条 */}
							<div className='absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity'></div>

							<div className='flex items-start gap-4'>
								<div className='shrink-0 mt-0.5'>
									<div className='flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 font-semibold text-xs border border-zinc-200'>{index + 1}</div>
								</div>

								<div className='flex-1 min-w-0'>
									<p className='text-base text-zinc-800 leading-relaxed mb-4'>{item.text}</p>
									<div className='flex items-center gap-2'>
										<span className='inline-flex items-center px-2 py-1 rounded-md text-xs font-mono bg-zinc-100 text-zinc-600 border border-zinc-200'>
											<svg className='w-3.5 h-3.5 mr-1.5 text-blue-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
												<path strokeLinecap='round' strokeLinejoin='round' d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'></path>
											</svg>
											相似度: {(item.similarity * 100).toFixed(2)}%
										</span>
										{item.similarity > 0.8 && (
											<span className='inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'>高度匹配</span>
										)}
									</div>
								</div>
							</div>
						</div>
					))}

					{hasSearched && !loading && results.length === 0 && (
						<div className='text-center py-12 px-4 border border-zinc-200 border-dashed rounded-2xl bg-zinc-50'>
							<svg className='mx-auto h-12 w-12 text-zinc-400 mb-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth='1' d='M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
							</svg>
							<h3 className='text-sm font-semibold text-zinc-900 mb-1'>未找到匹配的内容</h3>
							<p className='text-sm text-zinc-500'>在这个预设库中，没有与您的查询高度相关的信息。尝试换个关键词再试一次。</p>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
