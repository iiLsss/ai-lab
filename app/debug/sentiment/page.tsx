'use client'
import { useState } from 'react'

const EMOTION_THEMES = {
	happy: {
		label: '喜悦 / 阳光',
		color: 'text-amber-400',
		bg: 'from-amber-900/40 to-orange-900/40',
		border: 'border-amber-500/30',
		shadow: 'shadow-amber-500/10',
		icon: '✨',
	},
	sad: {
		label: '感伤 / 忧思',
		color: 'text-indigo-300',
		bg: 'from-slate-900/60 to-indigo-950/60',
		border: 'border-indigo-400/20',
		shadow: 'shadow-indigo-500/10',
		icon: '🌙',
	},
	angry: {
		label: '愤怒 / 激昂',
		color: 'text-rose-400',
		bg: 'from-rose-950/50 to-red-900/40',
		border: 'border-rose-500/30',
		shadow: 'shadow-rose-500/20',
		icon: '🔥',
	},
	neutral: {
		label: '平静 / 中立',
		color: 'text-emerald-300',
		bg: 'from-emerald-950/30 to-slate-900/60',
		border: 'border-emerald-500/20',
		shadow: 'shadow-emerald-500/5',
		icon: '🍃',
	},
	curious: {
		label: '好奇 / 探索',
		color: 'text-violet-400',
		bg: 'from-violet-900/40 to-fuchsia-900/40',
		border: 'border-violet-400/30',
		shadow: 'shadow-violet-500/10',
		icon: '🔍',
	},
}

interface EmotionData {
	emotion: keyof typeof EMOTION_THEMES
	confidence: number
	reason: string
}

function EmotionDisplay({ data }: { data: EmotionData }) {
	// 容错处理：如果后端返回了不在列表中的情绪，默认使用 neutral
	const theme = EMOTION_THEMES[data.emotion] || EMOTION_THEMES.neutral

	return (
		<div
			className={`
      relative overflow-hidden group
      max-w-md rounded-3xl border p-1
      transition-all duration-1000 ease-in-out
      ${theme.border} ${theme.shadow} shadow-2xl
    `}>
			{/* 动态背景光晕 */}
			<div
				className={`
        absolute -inset-24 opacity-20 blur-3xl transition-colors duration-1000
        bg-gradient-to-r ${theme.bg}
      `}
			/>

			<div className='relative bg-black/40 backdrop-blur-2xl rounded-[22px] p-6'>
				{/* 顶部栏：标签与置信度 */}
				<div className='flex justify-between items-center mb-6'>
					<div className='flex items-center gap-2'>
						<span className='text-2xl drop-shadow-md'>{theme.icon}</span>
						<span className={`text-sm font-bold tracking-widest uppercase ${theme.color}`}>{theme.label}</span>
					</div>
					<div className='flex flex-col items-end'>
						<span className='text-[10px] text-slate-500 font-mono'>CONFIDENCE</span>
						<span className={`text-lg font-mono font-light ${theme.color}`}>{(data.confidence * 100).toFixed(1)}%</span>
					</div>
				</div>

				{/* 核心内容：Reason */}
				<div className='relative'>
					<span className='absolute -top-4 -left-2 text-4xl text-white/10 font-serif'>“</span>
					<p className='text-slate-200 text-lg leading-relaxed font-serif px-4 py-2 italic'>{data.reason}</p>
					<span className='absolute -bottom-6 -right-2 text-4xl text-white/10 font-serif'>”</span>
				</div>

				{/* 底部装饰：类似实验室扫描线 */}
				<div className='mt-8 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent relative'>
					<div className={`absolute top-0 left-0 h-full bg-current transition-all duration-1000 ${theme.color}`} style={{ width: `${data.confidence * 100}%` }} />
				</div>
			</div>
		</div>
	)
}

export default function DebugPage() {
	const [prompt, setPrompt] = useState('')
	const [result, setResult] = useState(null)

	const handleSubmit = async () => {
		const res = await fetch('/api/sentiment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ prompt }),
		})
		const data = await res.json()
		setResult(data)
	}

	return (
		<div className='p-8'>
			<h1 className='text-2xl font-bold mb-4'>分析调试</h1>
			<textarea className='w-full h-32 border rounded p-2 mb-4' value={prompt} onChange={e => setPrompt(e.target.value)} placeholder='你今天的心情如何？' />
			<button onClick={handleSubmit} className='bg-blue-500 text-white px-4 py-2 rounded'>
				分析
			</button>
			{result && <EmotionDisplay data={result} />}
		</div>
	)
}
