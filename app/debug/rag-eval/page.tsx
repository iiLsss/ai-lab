'use client'

import { useState, useCallback } from 'react'

// ── 设计 Token（来自 DESIGN.md）────────────────────────────────────────────
const t = {
	// Colors
	canvas: '#faf9f5',
	surfaceSoft: '#f5f0e8',
	surfaceCard: '#efe9de',
	surfaceCreaMStrong: '#e8e0d2',
	surfaceDark: '#181715',
	surfaceDarkElevated: '#252320',
	surfaceDarkSoft: '#1f1e1b',
	primary: '#cc785c',
	primaryActive: '#a9583e',
	primaryDisabled: '#e6dfd8',
	ink: '#141413',
	bodyStrong: '#252523',
	body: '#3d3d3a',
	muted: '#6c6a64',
	mutedSoft: '#8e8b82',
	hairline: '#e6dfd8',
	hairlineSoft: '#ebe6df',
	onPrimary: '#ffffff',
	onDark: '#faf9f5',
	onDarkSoft: '#a09d96',
	accentTeal: '#5db8a6',
	accentAmber: '#e8a55a',
	success: '#5db872',
	error: '#c64545',
	// Rounded
	roundedMd: '8px',
	roundedLg: '12px',
	roundedXl: '16px',
	roundedPill: '9999px',
}

// ── 类型定义 ────────────────────────────────────────────────────────────────

interface EvalResult {
	id: string
	question: string
	type: 'A' | 'B' | 'C'
	retrievedDocs: { content: string; similarity: number; source: string }[]
	aiAnswer: string
	scores: { relevance: number; faithfulness: number; coverage: number }
	autoScore: { keywordsFound: string[]; keywordsMissed: string[]; coverageRate: number }
	durationMs: number
}

interface CacheStats {
	timestamp: string
	cache: {
		embedding: { total: number; active: number; expired: number }
		retrieval: { total: number; active: number; expired: number }
	}
}

const TYPE_META = {
	A: { label: '知识库有答案', color: t.accentTeal, bg: 'rgba(93,184,166,0.1)', border: 'rgba(93,184,166,0.25)' },
	B: { label: '知识库无答案', color: t.accentAmber, bg: 'rgba(232,165,90,0.1)', border: 'rgba(232,165,90,0.25)' },
	C: { label: '边界/细节', color: t.muted, bg: t.surfaceCard, border: t.hairline },
}

// ── 子组件 ──────────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
	const pct = Math.min((value / max) * 100, 100)
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
			<div
				style={{
					flex: 1,
					height: '4px',
					borderRadius: '2px',
					background: t.hairline,
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: '100%',
						background: color,
						borderRadius: '2px',
						transition: 'width 0.6s ease',
					}}
				/>
			</div>
			<span style={{ fontSize: '12px', color: t.muted, minWidth: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
				{value.toFixed(1)}/{max}
			</span>
		</div>
	)
}

function ResultCard({ result }: { result: EvalResult }) {
	const [expanded, setExpanded] = useState(false)
	const meta = TYPE_META[result.type]
	const avgScore = (result.scores.relevance + result.scores.coverage) / 2
	const scoreColor = avgScore >= 3.5 ? t.success : avgScore >= 2 ? t.accentAmber : t.error

	return (
		<div
			style={{
				background: t.canvas,
				border: `1px solid ${t.hairline}`,
				borderRadius: t.roundedLg,
				overflow: 'hidden',
				transition: 'box-shadow 0.15s ease',
			}}
		>
			{/* 卡片头部 */}
			<button
				id={`eval-card-${result.id}`}
				onClick={() => setExpanded(!expanded)}
				style={{
					width: '100%',
					padding: '20px 24px',
					display: 'flex',
					alignItems: 'flex-start',
					gap: '14px',
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					textAlign: 'left',
				}}
			>
				{/* ID badge */}
				<div
					style={{
						flexShrink: 0,
						padding: '3px 10px',
						borderRadius: t.roundedPill,
						background: meta.bg,
						border: `1px solid ${meta.border}`,
						fontSize: '11px',
						fontWeight: 600,
						color: meta.color,
						letterSpacing: '0.5px',
						marginTop: '2px',
						fontFamily: 'Inter, sans-serif',
					}}
				>
					{result.id}
				</div>

				{/* 问题文本 */}
				<div style={{ flex: 1, minWidth: 0 }}>
					<p
						style={{
							margin: '0 0 10px',
							fontSize: '15px',
							color: t.bodyStrong,
							lineHeight: 1.5,
							fontFamily: 'Inter, sans-serif',
						}}
					>
						{result.question}
					</p>
					<div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
						<span
							style={{
								fontSize: '11px',
								padding: '2px 10px',
								borderRadius: t.roundedPill,
								background: meta.bg,
								color: meta.color,
								border: `1px solid ${meta.border}`,
								fontFamily: 'Inter, sans-serif',
								letterSpacing: '1px',
								fontWeight: 500,
								textTransform: 'uppercase',
							}}
						>
							{meta.label}
						</span>
						<span style={{ fontSize: '13px', color: t.muted, fontFamily: 'Inter, sans-serif' }}>
							检索 {result.retrievedDocs.length} 条 · {result.durationMs}ms
						</span>
						<span
							style={{
								fontSize: '13px',
								color: scoreColor,
								fontWeight: 500,
								fontFamily: 'Inter, sans-serif',
							}}
						>
							综合 {avgScore.toFixed(1)}/5
						</span>
					</div>
				</div>

				{/* 箭头 */}
				<span style={{ color: t.muted, fontSize: '12px', flexShrink: 0, marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>
					{expanded ? '▲' : '▼'}
				</span>
			</button>

			{/* 展开内容 */}
			{expanded && (
				<div
					style={{
						borderTop: `1px solid ${t.hairlineSoft}`,
						background: t.surfaceSoft,
						padding: '24px',
						display: 'flex',
						flexDirection: 'column',
						gap: '20px',
					}}
				>
					{/* 评分 */}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
						{[
							{ label: '检索相关度（自动）', value: result.scores.relevance, color: t.accentTeal },
							{ label: '关键词覆盖率（自动）', value: result.scores.coverage, color: t.primary },
						].map(({ label, value, color }) => (
							<div
								key={label}
								style={{
									background: t.canvas,
									border: `1px solid ${t.hairline}`,
									borderRadius: t.roundedMd,
									padding: '14px 16px',
								}}
							>
								<p style={{ margin: '0 0 10px', fontSize: '12px', color: t.muted, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
									{label}
								</p>
								<ScoreBar value={value} color={color} />
							</div>
						))}
					</div>

					{/* 关键词 */}
					<div>
						<p style={{ margin: '0 0 10px', fontSize: '12px', color: t.muted, fontFamily: 'Inter, sans-serif', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>
							期望关键词
						</p>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
							{result.autoScore.keywordsFound.map((kw) => (
								<span key={kw} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: t.roundedPill, background: 'rgba(93,184,114,0.12)', color: '#3a8a4a', border: '1px solid rgba(93,184,114,0.25)', fontFamily: 'Inter, sans-serif' }}>
									✓ {kw}
								</span>
							))}
							{result.autoScore.keywordsMissed.map((kw) => (
								<span key={kw} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: t.roundedPill, background: 'rgba(198,69,69,0.08)', color: t.error, border: '1px solid rgba(198,69,69,0.2)', fontFamily: 'Inter, sans-serif' }}>
									✗ {kw}
								</span>
							))}
						</div>
					</div>

					{/* 检索文档 */}
					{result.retrievedDocs.length > 0 && (
						<div>
							<p style={{ margin: '0 0 10px', fontSize: '12px', color: t.muted, fontFamily: 'Inter, sans-serif', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>
								检索文档（Top {result.retrievedDocs.length}）
							</p>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
								{result.retrievedDocs.map((doc, i) => (
									<div
										key={i}
										style={{
											background: t.surfaceDark,
											borderRadius: t.roundedMd,
											padding: '14px 16px',
											borderLeft: `3px solid ${t.primary}`,
										}}
									>
										<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
											<span style={{ fontSize: '12px', color: t.onDarkSoft, fontFamily: 'Inter, sans-serif' }}>{doc.source}</span>
											<span style={{ fontSize: '12px', color: t.primary, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
												{(doc.similarity * 100).toFixed(1)}%
											</span>
										</div>
										<p style={{ margin: 0, fontSize: '13px', color: t.onDark, lineHeight: 1.55, fontFamily: 'Inter, sans-serif' }}>
											{doc.content}{doc.content.length >= 200 ? '…' : ''}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

					{/* AI 回答 */}
					<div>
						<p style={{ margin: '0 0 10px', fontSize: '12px', color: t.muted, fontFamily: 'Inter, sans-serif', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>
							AI 回答
						</p>
						<div
							style={{
								background: t.canvas,
								border: `1px solid ${t.hairline}`,
								borderRadius: t.roundedMd,
								padding: '16px',
								fontSize: '14px',
								color: t.body,
								lineHeight: 1.65,
								whiteSpace: 'pre-wrap',
								fontFamily: 'Inter, sans-serif',
							}}
						>
							{result.aiAnswer}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

// ── 主页面 ──────────────────────────────────────────────────────────────────

export default function RagEvalPage() {
	const [results, setResults] = useState<EvalResult[]>([])
	const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
	const [isRunning, setIsRunning] = useState(false)
	const [runningCaseId, setRunningCaseId] = useState<string | null>(null)
	const [progress, setProgress] = useState(0)

	const fetchCacheStats = useCallback(async () => {
		const res = await fetch('/api/rag/cache-stats')
		if (res.ok) setCacheStats(await res.json())
	}, [])

	const runAllEvals = useCallback(async () => {
		setIsRunning(true)
		setResults([])
		setProgress(0)

		const metaRes = await fetch('/api/rag/evaluate')
		const { cases } = await metaRes.json()
		const total = cases.length
		const allResults: EvalResult[] = []

		for (let i = 0; i < cases.length; i++) {
			const c = cases[i]
			setRunningCaseId(c.id)
			setProgress(Math.round((i / total) * 100))

			const res = await fetch('/api/rag/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ caseId: c.id }),
			})
			if (res.ok) {
				const { results: caseResults } = await res.json()
				allResults.push(...caseResults)
				setResults([...allResults])
			}
		}

		setProgress(100)
		setRunningCaseId(null)
		setIsRunning(false)
		await fetchCacheStats()
	}, [fetchCacheStats])

	const summary =
		results.length > 0
			? {
					avgRelevance: results.reduce((s, r) => s + r.scores.relevance, 0) / results.length,
					avgCoverage: results.reduce((s, r) => s + r.scores.coverage, 0) / results.length,
					avgDuration: results.reduce((s, r) => s + r.durationMs, 0) / results.length,
				}
			: null

	return (
		<div style={{ minHeight: '100vh', background: t.canvas, fontFamily: 'Inter, sans-serif' }}>
			{/* Google Fonts */}
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
				@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&display=swap');
			`}</style>

			{/* Top nav strip */}
			<div
				style={{
					height: '52px',
					background: t.canvas,
					borderBottom: `1px solid ${t.hairline}`,
					display: 'flex',
					alignItems: 'center',
					padding: '0 32px',
					gap: '8px',
				}}
			>
				<span style={{ fontSize: '13px', color: t.muted }}>Debug</span>
				<span style={{ fontSize: '13px', color: t.hairline }}>/</span>
				<span style={{ fontSize: '13px', color: t.ink, fontWeight: 500 }}>RAG 评估</span>
			</div>

			<div style={{ maxWidth: '960px', margin: '0 auto', padding: '64px 32px' }}>
				{/* 标题区 */}
				<div style={{ marginBottom: '48px' }}>
					<p
						style={{
							margin: '0 0 12px',
							fontSize: '12px',
							fontWeight: 500,
							letterSpacing: '1.5px',
							textTransform: 'uppercase',
							color: t.primary,
							fontFamily: 'Inter, sans-serif',
						}}
					>
						Week 10 · 评估与生产化
					</p>
					<h1
						style={{
							margin: '0 0 16px',
							fontSize: '42px',
							fontWeight: 400,
							lineHeight: 1.1,
							letterSpacing: '-0.8px',
							color: t.ink,
							fontFamily: '"Cormorant Garamond", "Tiempos Headline", Georgia, serif',
						}}
					>
						RAG 系统评估面板
					</h1>
					<p style={{ margin: 0, fontSize: '16px', color: t.body, lineHeight: 1.55 }}>
						15 个测试用例，涵盖知识库命中、降级声明、边界细节三种场景。自动计算检索相关度与关键词覆盖率。
					</p>
				</div>

				{/* 操作行 */}
				<div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
					<button
						id="run-all-eval-btn"
						onClick={runAllEvals}
						disabled={isRunning}
						style={{
							padding: '11px 22px',
							height: '40px',
							borderRadius: t.roundedMd,
							border: 'none',
							background: isRunning ? t.primaryDisabled : t.primary,
							color: isRunning ? t.muted : t.onPrimary,
							fontSize: '14px',
							fontWeight: 500,
							cursor: isRunning ? 'not-allowed' : 'pointer',
							fontFamily: 'Inter, sans-serif',
							transition: 'background 0.15s',
							display: 'flex',
							alignItems: 'center',
							gap: '6px',
						}}
					>
						{isRunning ? `⏳ ${runningCaseId ?? ''}…` : '▶ 运行所有评估'}
					</button>

					<button
						id="fetch-cache-stats-btn"
						onClick={fetchCacheStats}
						style={{
							padding: '11px 22px',
							height: '40px',
							borderRadius: t.roundedMd,
							border: `1px solid ${t.hairline}`,
							background: t.canvas,
							color: t.ink,
							fontSize: '14px',
							fontWeight: 500,
							cursor: 'pointer',
							fontFamily: 'Inter, sans-serif',
						}}
					>
						缓存统计
					</button>
				</div>

				{/* 进度条 */}
				{isRunning && (
					<div style={{ marginBottom: '24px', background: t.hairline, borderRadius: '2px', height: '3px', overflow: 'hidden' }}>
						<div
							style={{
								width: `${progress}%`,
								height: '100%',
								background: t.primary,
								borderRadius: '2px',
								transition: 'width 0.3s ease',
							}}
						/>
					</div>
				)}

				{/* 缓存统计卡片（深色面板）*/}
				{cacheStats && (
					<div
						style={{
							background: t.surfaceDark,
							border: `1px solid rgba(255,255,255,0.06)`,
							borderRadius: t.roundedLg,
							padding: '20px 24px',
							marginBottom: '32px',
						}}
					>
						<p style={{ margin: '0 0 14px', fontSize: '12px', color: t.onDarkSoft, fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
							⚡ 缓存状态 · {new Date(cacheStats.timestamp).toLocaleTimeString('zh-CN')}
						</p>
						<div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
							{[
								{ label: 'Embedding 缓存', data: cacheStats.cache.embedding },
								{ label: '检索结果缓存', data: cacheStats.cache.retrieval },
							].map(({ label, data }) => (
								<div key={label} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
									<span style={{ fontSize: '13px', color: t.onDarkSoft }}>{label}</span>
									<span style={{ fontSize: '20px', fontWeight: 400, color: t.accentTeal, fontFamily: '"Cormorant Garamond", serif', letterSpacing: '-0.3px' }}>
										{data.active}
									</span>
									<span style={{ fontSize: '12px', color: t.onDarkSoft }}>活跃 / {data.total} 总</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* 汇总统计 */}
				{summary && (
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '32px' }}>
						{[
							{ label: '平均检索相关度', value: `${summary.avgRelevance.toFixed(2)}`, unit: '/5', color: t.accentTeal },
							{ label: '平均关键词覆盖', value: `${summary.avgCoverage.toFixed(2)}`, unit: '/5', color: t.primary },
							{ label: '平均响应时间', value: `${Math.round(summary.avgDuration)}`, unit: 'ms', color: t.accentAmber },
							{ label: '已完成', value: `${results.length}`, unit: '/15', color: t.ink },
						].map(({ label, value, unit, color }) => (
							<div
								key={label}
								style={{
									background: t.surfaceCard,
									border: `1px solid ${t.hairline}`,
									borderRadius: t.roundedLg,
									padding: '20px 20px 16px',
								}}
							>
								<p style={{ margin: '0 0 8px', fontSize: '12px', color: t.muted, fontWeight: 500, letterSpacing: '0.5px' }}>{label}</p>
								<p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: '3px' }}>
									<span style={{ fontSize: '28px', fontWeight: 400, color, fontFamily: '"Cormorant Garamond", serif', lineHeight: 1, letterSpacing: '-0.5px' }}>
										{value}
									</span>
									<span style={{ fontSize: '14px', color: t.muted }}>{unit}</span>
								</p>
							</div>
						))}
					</div>
				)}

				{/* 结果列表 */}
				{results.length > 0 && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
						{results.map((result) => (
							<ResultCard key={result.id} result={result} />
						))}
					</div>
				)}

				{/* 空状态 */}
				{results.length === 0 && !isRunning && (
					<div
						style={{
							border: `1px dashed ${t.hairline}`,
							borderRadius: t.roundedXl,
							padding: '96px 32px',
							textAlign: 'center',
							background: t.surfaceSoft,
						}}
					>
						<p
							style={{
								margin: '0 0 12px',
								fontSize: '32px',
								fontWeight: 400,
								color: t.ink,
								fontFamily: '"Cormorant Garamond", serif',
								letterSpacing: '-0.5px',
							}}
						>
							准备好测试了
						</p>
						<p style={{ margin: 0, fontSize: '15px', color: t.muted }}>
							点击「运行所有评估」，逐条检验 RAG 系统的检索质量与回答准确性
						</p>
					</div>
				)}

				{/* Footer */}
				<div
					style={{
						marginTop: '80px',
						paddingTop: '24px',
						borderTop: `1px solid ${t.hairline}`,
						display: 'flex',
						gap: '6px',
						alignItems: 'center',
					}}
				>
					<span style={{ fontSize: '12px', color: t.mutedSoft }}>diqiu-lab</span>
					<span style={{ fontSize: '12px', color: t.hairline }}>·</span>
					<span style={{ fontSize: '12px', color: t.mutedSoft }}>RAG 评估 · Week 10</span>
				</div>
			</div>
		</div>
	)
}
