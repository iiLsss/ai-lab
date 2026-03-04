'use client'
import { useState, useRef, useEffect } from 'react'
import type { KnowledgeCard } from '@/app/api/knowledge-card/route'

// 从流式文本中解析出卡片数据
function parseStreamContent(text: string): { content: string; card: KnowledgeCard | null } {
	const cardStartMarker = '<!--KNOWLEDGE_CARD_START-->'
	const cardEndMarker = '<!--KNOWLEDGE_CARD_END-->'

	const startIdx = text.indexOf(cardStartMarker)
	if (startIdx === -1) {
		return { content: text, card: null }
	}

	const content = text.slice(0, startIdx).trim()
	const endIdx = text.indexOf(cardEndMarker, startIdx)

	if (endIdx === -1) {
		return { content, card: null } // 卡片还在加载中
	}

	try {
		const cardJson = text.slice(startIdx + cardStartMarker.length, endIdx)
		const card = JSON.parse(cardJson) as KnowledgeCard
		return { content, card }
	} catch {
		return { content, card: null }
	}
}

// 难度配置
const DIFFICULTY_CONFIG = {
	beginner: { label: '入门', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
	intermediate: { label: '进阶', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
	advanced: { label: '高级', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
}

// 知识卡片 UI 组件
function KnowledgeCardUI({ card }: { card: KnowledgeCard }) {
	const diff = DIFFICULTY_CONFIG[card.difficulty] || DIFFICULTY_CONFIG.beginner

	return (
		<div className='mt-8 relative group'>
			{/* 标题区 */}
			<div className='relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl'>
				{/* 顶部光条 */}
				<div className='h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500' />

				<div className='p-6 space-y-5'>
					{/* 头部：标题 + 难度 */}
					<div className='flex items-start justify-between gap-4'>
						<div className='space-y-1'>
							<div className='text-xs font-bold tracking-widest text-purple-400/80 uppercase'>📚 Knowledge Card</div>
							<h3 className='text-xl font-bold text-white leading-tight'>{card.title}</h3>
						</div>
						<span className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${diff.color}`}>{diff.label}</span>
					</div>

					{/* 简介 */}
					<p className='text-slate-300 text-sm leading-relaxed'>{card.summary}</p>

					{/* 关键要点 */}
					<div className='space-y-2'>
						<div className='text-xs font-bold tracking-wider text-slate-400 uppercase'>💡 Key Points</div>
						<ul className='space-y-2'>
							{card.keyPoints.map((point, i) => (
								<li key={i} className='flex gap-3 items-start'>
									<span className='mt-1 w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold shrink-0'>{i + 1}</span>
									<span className='text-slate-200 text-sm leading-relaxed'>{point}</span>
								</li>
							))}
						</ul>
					</div>

					{/* 标签 */}
					<div className='flex flex-wrap gap-2 pt-2 border-t border-white/5'>
						{card.tags.map((tag, i) => (
							<span
								key={i}
								className='px-3 py-1 rounded-full bg-white/5 text-slate-400 text-xs font-medium border border-white/5 hover:border-purple-500/30 hover:text-purple-300 transition-colors cursor-default'>
								#{tag}
							</span>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

export default function HybridDebugPage() {
	const [prompt, setPrompt] = useState('')
	const [rawText, setRawText] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const contentRef = useRef<HTMLDivElement>(null)

	const { content, card } = parseStreamContent(rawText)

	// Auto-scroll
	useEffect(() => {
		if (contentRef.current) {
			contentRef.current.scrollTop = contentRef.current.scrollHeight
		}
	}, [rawText])

	const handleSubmit = async () => {
		if (!prompt.trim() || isLoading) return
		setRawText('')
		setError(null)
		setIsLoading(true)

		try {
			const res = await fetch('/api/knowledge-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt }),
			})

			if (!res.ok) throw new Error(`HTTP ${res.status}`)

			const reader = res.body?.getReader()
			if (!reader) throw new Error('No reader')

			const decoder = new TextDecoder()
			let accumulated = ''

			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				accumulated += decoder.decode(value, { stream: true })
				setRawText(accumulated)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : '请求失败')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='min-h-screen bg-slate-950 text-slate-100'>
			<div className='max-w-3xl mx-auto p-8 space-y-6'>
				{/* 标题 */}
				<div className='space-y-2'>
					<h1 className='text-3xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent'>练习 3：混合流式文本 + 结构化卡片</h1>
					<p className='text-slate-400 text-sm'>streamText（文字回答）+ generateObject（知识卡片）的混合模式</p>
				</div>

				{/* 输入区 */}
				<div className='space-y-3'>
					<textarea
						className='w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none'
						value={prompt}
						onChange={e => setPrompt(e.target.value)}
						placeholder='输入学习主题，例如："帮我学 React Hooks"、"什么是 RAG" ...'
						onKeyDown={e => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault()
								handleSubmit()
							}
						}}
					/>
					<button
						onClick={handleSubmit}
						disabled={isLoading || !prompt.trim()}
						className='px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20'>
						{isLoading ? '生成中...' : '生成回答 + 知识卡片'}
					</button>
				</div>

				{/* 错误提示 */}
				{error && <div className='p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm'>⚠️ {error}</div>}

				{/* 内容展示区 */}
				{(content || isLoading) && (
					<div ref={contentRef} className='space-y-4'>
						{/* 流式文本 */}
						{content && (
							<div className='p-6 rounded-2xl bg-slate-900/50 border border-slate-800'>
								<div className='text-xs font-bold tracking-wider text-slate-500 uppercase mb-3'>💬 AI 回答（streamText）</div>
								<div className='text-slate-200 leading-relaxed whitespace-pre-wrap'>{content}</div>
								{isLoading && !card && <span className='inline-block mt-2 w-2 h-5 bg-purple-400 animate-pulse rounded-sm' />}
							</div>
						)}

						{/* 卡片加载提示 */}
						{isLoading && content && !card && (
							<div className='flex items-center gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10'>
								<div className='w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin' />
								<span className='text-purple-300 text-sm'>正在生成知识卡片（generateObject）...</span>
							</div>
						)}

						{/* 结构化知识卡片 */}
						{card && (
							<div>
								<div className='text-xs font-bold tracking-wider text-slate-500 uppercase mb-3'>📦 结构化输出（generateObject）</div>
								<KnowledgeCardUI card={card} />
							</div>
						)}
					</div>
				)}

				{/* 底部说明 */}
				<div className='mt-12 p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 text-slate-500 text-xs space-y-1'>
					<p>
						📡 <strong className='text-slate-400'>工作原理</strong>：后端先用 <code className='text-purple-400'>streamText</code> 流式输出文字，完成后再用{' '}
						<code className='text-purple-400'>generateObject</code> 生成结构化卡片 JSON
					</p>
					<p>
						🏷️ 卡片数据通过{' '}
						<code className='text-purple-400'>
							{'<!--KNOWLEDGE_CARD_START-->'}...{'<!--KNOWLEDGE_CARD_END-->'}
						</code>{' '}
						标记附加在流末尾
					</p>
				</div>
			</div>
		</div>
	)
}
