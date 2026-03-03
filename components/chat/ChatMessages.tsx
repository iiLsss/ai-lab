import { Code, LayoutTemplate, FileText, Bot, Sparkles, ChevronDown } from 'lucide-react'
import type { UIMessage } from '@ai-sdk/react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { createMathPlugin } from '@streamdown/math'
import { cjk } from '@streamdown/cjk'
import 'katex/dist/katex.min.css'
import 'streamdown/styles.css'
import { RefObject } from 'react'
import { cn } from '@/lib/utils'

interface ChatMessagesProps {
	messages: UIMessage[]
	status: string
	messagesEndRef: RefObject<HTMLDivElement | null>
	setInput: (input: string) => void
}
const MessageTextPart = ({ text, status }: { text: string; status: string }) => {
	const segments = []
	let currentText = text

	while (currentText.length > 0) {
		const thinkingStartIdx = currentText.indexOf('<thinking>')
		if (thinkingStartIdx === -1) {
			if (currentText.trim().length > 0 || segments.length === 0) {
				segments.push({ type: 'text', content: currentText })
			}
			break
		}

		if (thinkingStartIdx > 0) {
			segments.push({ type: 'text', content: currentText.slice(0, thinkingStartIdx) })
		}

		const thinkingEndIdx = currentText.indexOf('</thinking>', thinkingStartIdx)
		if (thinkingEndIdx === -1) {
			segments.push({ type: 'thinking', content: currentText.slice(thinkingStartIdx + 10), isComplete: false })
			break
		} else {
			segments.push({ type: 'thinking', content: currentText.slice(thinkingStartIdx + 10, thinkingEndIdx), isComplete: true })
			currentText = currentText.slice(thinkingEndIdx + 11)
		}
	}

	return (
		<div className='flex flex-col space-y-4'>
			{segments.map((segment, index) => {
				if (segment.type === 'thinking') {
					return (
						<details key={index} className='group border border-[#e5e5e5] rounded-2xl bg-[#f9f9f9] overflow-hidden [&>summary::-webkit-details-marker]:hidden' open={!segment.isComplete}>
							<summary className='flex items-center cursor-pointer p-4 list-none text-sm font-medium text-[#666] hover:bg-[#f0f0f0] transition-colors'>
								<div className='flex items-center gap-2'>
									<Bot className='w-4 h-4' />
									<span>{segment.isComplete ? '思考过程' : '深度思考中...'}</span>
								</div>
								<ChevronDown className='w-4 h-4 ml-auto transition-transform duration-200 group-open:rotate-180' />
							</summary>
							<div className='p-4 pt-0 text-[#666] text-[15px] border-t border-[#e5e5e5] bg-[#f9f9f9]'>
								<Streamdown animated plugins={{ code, mermaid, math: createMathPlugin({ singleDollarTextMath: true }), cjk }} isAnimating={status === 'streaming'}>
									{segment.content}
								</Streamdown>
							</div>
						</details>
					)
				}

				return (
					<div key={index}>
						<Streamdown animated plugins={{ code, mermaid, math: createMathPlugin({ singleDollarTextMath: true }), cjk }} isAnimating={status === 'streaming'}>
							{segment.content}
						</Streamdown>
					</div>
				)
			})}
		</div>
	)
}

export function ChatMessages({ messages, status, messagesEndRef, setInput }: ChatMessagesProps) {
	return (
		<div className='max-w-190 mx-auto py-4 md:py-8 lg:py-20 space-y-8 md:space-y-12 mt-16 md:mt-8 relative px-1'>
			{messages.length === 0 ? (
				<div className='mt-4 md:mt-24 space-y-10 md:space-y-16 transition-all duration-1000'>
					<div className='space-y-4 text-center md:text-left'>
						<h1 className='text-4xl sm:text-5xl md:text-[64px] font-bold tracking-tight leading-tight'>
							<span className='text-gradient py-2'>Hello, Developer</span>
						</h1>
					</div>

					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
						{[
							{ text: 'Code a React component', icon: <Code className='w-5 h-5' />, color: 'bg-blue-50 text-blue-600' },
							{ text: 'Explain UI design principles', icon: <LayoutTemplate className='w-5 h-5' />, color: 'bg-orange-50 text-orange-600' },
							{ text: 'Draft technical documentation', icon: <FileText className='w-5 h-5' />, color: 'bg-amber-50 text-amber-600' },
							{ text: 'Analyze an API request', icon: <Bot className='w-5 h-5' />, color: 'bg-purple-50 text-purple-600' },
						].map((item, i) => (
							<button
								key={i}
								onClick={() => setInput(item.text)}
								className='p-4 md:p-5 bg-white/70 backdrop-blur-md rounded-3xl text-left transition-all hover-lift border border-white soft-shadow group relative flex flex-col justify-between min-h-30 md:min-h-35'>
								<div className={cn(`p-2.5 rounded-2xl w-fit transition-transform group-hover:scale-110`, item.color)}>{item.icon}</div>
								<span className='text-[15px] font-medium leading-snug text-[#444] group-hover:text-[#222] pr-4 mt-4'>{item.text}</span>
							</button>
						))}
					</div>
				</div>
			) : (
				<div className='space-y-10 pb-32'>
					{messages.map(m => (
						<div key={m.id} className='flex gap-4 md:gap-6 group'>
							<div className='shrink-0 mt-1.5'>
								{m.role === 'user' ? (
									<div className='w-8 h-8 rounded-full bg-[#f0f0f0] flex items-center justify-center border border-black/4 soft-shadow'>
										<span className='text-xs font-semibold text-[#666]'>ME</span>
									</div>
								) : (
									<div className='w-8 h-8 rounded-full bg-gradient-custom flex items-center justify-center shadow-sm'>
										<Sparkles className='w-4 h-4 text-white' />
									</div>
								)}
							</div>
							<div className='flex-1 space-y-2 overflow-hidden'>
								<div className='font-semibold text-[13px] text-[#888] uppercase tracking-wider'>{m.role === 'user' ? 'You' : 'Aurora AI'}</div>
								<div className='text-[16px] leading-relaxed text-[#2b2b2b] whitespace-pre-wrap font-sans'>
									{m.parts && m.parts.length > 0 ? (
										m.parts.map((part, index) => (part.type === 'text' && 'text' in part ? <MessageTextPart key={index} text={part.text} status={status} /> : null))
									) : 'content' in m && typeof m.content === 'string' ? (
										<MessageTextPart text={m.content as string} status={status} />
									) : null}
								</div>
							</div>
						</div>
					))}
					{status === 'streaming' && (
						<div className='flex gap-4 md:gap-6'>
							<div className='shrink-0 mt-1.5'>
								<div className='w-8 h-8 rounded-full bg-gradient-custom flex items-center justify-center shadow-sm animate-pulse'>
									<Sparkles className='w-4 h-4 text-white' />
								</div>
							</div>
							<div className='flex-1 space-y-3 pt-3'>
								<div className='h-2.5 bg-black/6 rounded-full w-[40%] animate-pulse' />
								<div className='h-2.5 bg-black/6 rounded-full w-[85%] animate-pulse' />
								<div className='h-2.5 bg-black/6 rounded-full w-[60%] animate-pulse' />
							</div>
						</div>
					)}
					<div ref={messagesEndRef} className='h-4' />
				</div>
			)}
		</div>
	)
}
