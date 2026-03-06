'use client'
import { useState } from 'react'

export default function SupabaseRAGDashboard() {
	const [activeTab, setActiveTab] = useState<'search' | 'ingest'>('search')

	// Search state
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<{ text: string; similarity: number }[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [hasSearched, setHasSearched] = useState(false)
	const [searchError, setSearchError] = useState('')

	// Ingest state
	const [docText, setDocText] = useState('')
	const [isIngesting, setIsIngesting] = useState(false)
	const [ingestSuccess, setIngestSuccess] = useState('')
	const [ingestError, setIngestError] = useState('')
	const [isIngestingFile, setIsIngestingFile] = useState(false)

	const handleIngestFile = async () => {
		setIsIngestingFile(true)
		setIngestSuccess('')
		setIngestError('')

		try {
			const res = await fetch('/api/rag/ingest-file', {
				method: 'POST',
			})

			const data = await res.json()
			if (!res.ok) throw new Error(data.error || '文件一键入库失败')

			setIngestSuccess(`🎉 成功将 docs/streamdown-analysis.md 自动分片并入库 ${data.count} 个块！`)
		} catch (err: any) {
			console.error('File Ingest failed:', err)
			setIngestError(err.message)
		} finally {
			setIsIngestingFile(false)
		}
	}

	const handleSearch = async () => {
		if (!query.trim()) return
		setIsSearching(true)
		setHasSearched(true)
		setSearchError('')

		try {
			const res = await fetch('/api/rag-search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query }),
			})

			const data = await res.json()
			if (!res.ok) throw new Error(data.error || '搜索失败。请检查 Supabase 密钥配置。')

			setResults(data.results || [])
		} catch (err: any) {
			console.error('Search failed:', err)
			setSearchError(err.message)
			setResults([])
		} finally {
			setIsSearching(false)
		}
	}

	const handleIngest = async () => {
		if (!docText.trim()) return
		setIsIngesting(true)
		setIngestSuccess('')
		setIngestError('')

		try {
			const res = await fetch('/api/rag/ingest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: docText, metadata: { source: 'manual-input', tag: 'test' } }),
			})

			const data = await res.json()
			if (!res.ok) throw new Error(data.error || '入库失败。请检查 Supabase 密钥配置。')

			setIngestSuccess('成功写入 Supabase 向量数据库！')
			setDocText('') // 清空输入框
		} catch (err: any) {
			console.error('Ingest failed:', err)
			setIngestError(err.message)
		} finally {
			setIsIngesting(false)
		}
	}

	return (
		<div className='min-h-screen bg-white text-zinc-900 selection:bg-blue-200 selection:text-blue-900 py-16 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-4xl mx-auto'>
				{/* 头部标题区域 */}
				<header className='mb-12'>
					<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 mb-4 flex items-center gap-3'>
						<svg className='w-8 h-8 text-blue-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
							<circle cx='11' cy='11' r='8'></circle>
							<line x1='21' y1='21' x2='16.65' y2='16.65'></line>
						</svg>
						Supabase 向量数据库 (RAG)
					</h1>
					<p className='text-lg text-zinc-600 leading-relaxed max-w-2xl mb-4'>
						真正的向量检索实战。您可以在“写入知识”面板手工输入或一键上传 Markdown 文档来构建知识库。
						<br />
						系统底层自动调用 Google text-embedding 将其转化为 768 维向量存入远端 Postgres。
					</p>

					<div className='rounded-xl border border-amber-200 bg-amber-50 p-4 w-fit flex gap-3 shadow-sm'>
						<svg className='w-5 h-5 shrink-0 mt-0.5 text-amber-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
							<path strokeLinecap='round' strokeLinejoin='round' d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'></path>
						</svg>
						<p className='text-sm text-amber-800 leading-relaxed'>
							请务必确保在 <code className='rounded bg-amber-100 px-1.5 py-0.5 font-mono text-amber-900 mx-1'>.env.local</code> 中配置了 Supabase 环境变量，并在 Supabase 后台运行了建表 SQL
							与匹配函数。
						</p>
					</div>
				</header>

				{/* Tab 导航区域 */}
				<nav className='flex gap-2 mb-8 border-b border-zinc-200 pb-px'>
					<button
						onClick={() => setActiveTab('ingest')}
						className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
							activeTab === 'ingest' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
						}`}>
						[1] 写入知识库 (Ingest)
					</button>
					<button
						onClick={() => setActiveTab('search')}
						className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
							activeTab === 'search' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
						}`}>
						[2] 语义检索 (Search)
					</button>
				</nav>

				<div>
					{/* ==== Ingest Tab ==== */}
					{activeTab === 'ingest' && (
						<div className='space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300'>
							<div className='rounded-2xl border border-zinc-200 bg-zinc-50/50 p-8 shadow-sm'>
								<h2 className='text-lg font-bold text-zinc-900 mb-2'>手动将长文本存入知识库</h2>
								<p className='text-sm text-zinc-500 mb-6 max-w-xl'>文本内容会被转化为向量并存入 Postgres vector 字段</p>

								<div className='flex flex-col gap-2 mb-6'>
									<label className='text-sm font-semibold text-zinc-900'>文本内容</label>
									<textarea
										value={docText}
										onChange={e => setDocText(e.target.value)}
										placeholder='输入想存进数据库的知识。例如：&#10;公司的报销政策是 3 天内处理完毕...'
										className='w-full h-32 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none'
									/>
								</div>

								<div className='flex flex-col sm:flex-row gap-4'>
									<button
										onClick={handleIngest}
										disabled={isIngesting || !docText.trim() || isIngestingFile}
										className='inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 transition-all'>
										{isIngesting ? '正在生成向量并写入...' : '生成向量并入库'}
									</button>

									<button
										onClick={handleIngestFile}
										disabled={isIngestingFile || isIngesting}
										className='inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-200 disabled:opacity-50 transition-all'>
										{isIngestingFile ? (
											<>
												<svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-900' fill='none' viewBox='0 0 24 24'>
													<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
													<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
												</svg>
												正在分片...
											</>
										) : (
											'🚀 一键导入: Markdown 演示文档'
										)}
									</button>
								</div>

								{(ingestSuccess || ingestError) && (
									<div className={`mt-6 p-4 rounded-xl text-sm font-medium border ${ingestSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
										<div className='flex items-start'>
											<div className='shrink-0 mt-0.5 mr-3'>
												{ingestSuccess ? (
													<svg className='h-5 w-5 text-emerald-500' viewBox='0 0 20 20' fill='currentColor'>
														<path
															fillRule='evenodd'
															d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z'
															clipRule='evenodd'
														/>
													</svg>
												) : (
													<svg className='h-5 w-5 text-red-500' viewBox='0 0 20 20' fill='currentColor'>
														<path
															fillRule='evenodd'
															d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z'
															clipRule='evenodd'
														/>
													</svg>
												)}
											</div>
											<p>{ingestSuccess || ingestError}</p>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{/* ==== Search Tab ==== */}
					{activeTab === 'search' && (
						<div className='space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300'>
							<div className='rounded-2xl border border-zinc-200 bg-zinc-50/50 p-8 shadow-sm'>
								<h2 className='text-lg font-bold text-zinc-900 mb-2'>跨越整个 Postgres 向量空间进行检索</h2>
								<p className='text-sm text-zinc-500 mb-6'>底层调用 match_documents RPC 过程，自动过滤相似度低于 0.6 的无用结果。</p>

								<div className='flex flex-col sm:flex-row gap-3 mb-8'>
									<div className='relative flex-1'>
										<div className='pointer-events-none absolute inset-y-0 left-0 pl-4 flex items-center'>
											<svg className='h-5 w-5 text-zinc-400' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
												<circle cx='11' cy='11' r='8'></circle>
												<line x1='21' y1='21' x2='16.65' y2='16.65'></line>
											</svg>
										</div>
										<input
											type='text'
											value={query}
											onChange={e => setQuery(e.target.value)}
											onKeyDown={e => e.key === 'Enter' && handleSearch()}
											placeholder='向知识库随便提问，比如：Streamdown 为什么要分块渲染？'
											className='w-full rounded-xl border border-zinc-200 bg-white pl-12 pr-4 py-3.5 text-sm text-zinc-900 shadow-sm placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors'
										/>
									</div>
									<button
										onClick={handleSearch}
										disabled={isSearching || !query.trim()}
										className='inline-flex items-center justify-center rounded-xl bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 transition-all'>
										{isSearching ? (
											<>
												<svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
													<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
													<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
												</svg>
												正在跨库搜索...
											</>
										) : (
											'检索知识库'
										)}
									</button>
								</div>

								{/* Search Errors */}
								{searchError && (
									<div className='mb-6 p-4 rounded-xl text-sm border font-medium bg-red-50 text-red-800 border-red-200'>
										<div className='flex items-start'>
											<div className='shrink-0 mt-0.5 mr-3'>
												<svg className='h-5 w-5 text-red-500' viewBox='0 0 20 20' fill='currentColor'>
													<path
														fillRule='evenodd'
														d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z'
														clipRule='evenodd'
													/>
												</svg>
											</div>
											<p>{searchError}</p>
										</div>
									</div>
								)}

								{/* 搜索结果区域 */}
								<div className='space-y-4'>
									{results.length > 0 && <h3 className='text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-200 pb-2'>匹配检索结果 ({results.length})</h3>}

									{results.map((item, index) => (
										<div key={index} className='group p-6 border border-zinc-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden'>
											<div className='absolute left-0 top-0 bottom-0 w-1 bg-zinc-300 opacity-0 group-hover:opacity-100 group-hover:bg-blue-500 transition-all'></div>

											<div className='flex items-start gap-4'>
												<div className='shrink-0 mt-0.5'>
													<div className='flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 font-semibold text-xs border border-zinc-200'>{index + 1}</div>
												</div>
												<div className='flex-1 min-w-0'>
													<p className='text-base text-zinc-800 leading-relaxed mb-4 whitespace-pre-wrap'>{item.text}</p>
													<div className='flex items-center flex-wrap gap-2 mt-4'>
														<span className='inline-flex items-center px-2 py-1 rounded-md text-xs font-mono bg-zinc-100 text-zinc-600 border border-zinc-200'>
															<svg className='w-3.5 h-3.5 mr-1.5 text-blue-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
																<path strokeLinecap='round' strokeLinejoin='round' d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'></path>
															</svg>
															相似度: {(item.similarity * 100).toFixed(1)}%
														</span>
														{item.similarity > 0.8 && (
															<span className='inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'>🔥 高度匹配</span>
														)}
													</div>
												</div>
											</div>
										</div>
									))}

									{hasSearched && !isSearching && results.length === 0 && !searchError && (
										<div className='text-center py-12 px-4 border border-zinc-200 border-dashed rounded-2xl bg-zinc-50/50'>
											<svg className='mx-auto h-12 w-12 text-zinc-400 mb-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
											</svg>
											<h3 className='text-sm font-semibold text-zinc-900 mb-1'>未找到超过匹配得分阈值的结果</h3>
											<p className='text-sm text-zinc-500'>
												系统抛弃了所有相关性低于 0.6 的向量片段。您可以尝试换一个问法，
												<br />
												或者前往 Ingest 面板写入更多与您的查询相关的文档。
											</p>
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
