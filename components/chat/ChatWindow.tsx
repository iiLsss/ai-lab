import { useChat } from '@ai-sdk/react'
import { useRef, useEffect, useState } from 'react'

import { Header } from '@/components/chat/Header'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatInput } from '@/components/chat/ChatInput'
import { useChatStore } from '@/store/useChatStore'

interface ChatWindowProps {
	id: string | null
	onToggleSidebar: () => void
	isMobile: boolean
}

export function ChatWindow({ id, onToggleSidebar, isMobile }: ChatWindowProps) {
	const [input, setInput] = useState('')
	const { sessions, createSession, updateSessionMessages } = useChatStore()

	const currentIdRef = useRef<string | null>(id)

	const { messages, setMessages, sendMessage, status, error, clearError } = useChat({
		onError(error) {
			console.error('[Chat Error]', error)
		},
	})

	// Initial load
	useEffect(() => {
		if (id && sessions[id]) {
			setMessages(sessions[id].messages)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []) // strictly on mount due to key=id

	// Save to store whenever messages update
	useEffect(() => {
		if (currentIdRef.current && messages.length > 0) {
			updateSessionMessages(currentIdRef.current, messages)
		}
	}, [messages, updateSessionMessages])

	const messagesEndRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	useEffect(() => {
		scrollToBottom()
	}, [messages])

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
		}
	}, [input])

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault()
		if (!input.trim() || status === 'streaming') return

		const textToSubmit = input
		setInput('')
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}

		if (!currentIdRef.current) {
			const newId = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15)
			currentIdRef.current = newId
			createSession(newId, textToSubmit.slice(0, 30))
			// Silently update URL without triggering remount
			window.history.replaceState(null, '', `/c/${newId}`)
		}

		sendMessage({ text: textToSubmit })
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	return (
		<main className='flex-1 flex flex-col h-full relative overflow-hidden bg-white/40'>
			<Header onToggleSidebar={onToggleSidebar} isMobile={isMobile} />

			<div className='flex-1 overflow-y-auto px-4 scroll-smooth pb-32'>
				<ChatMessages messages={messages} status={status} messagesEndRef={messagesEndRef} setInput={setInput} />
			</div>

			<ChatInput input={input} setInput={setInput} handleSubmit={handleSubmit} handleKeyDown={handleKeyDown} textareaRef={textareaRef} />

			{/* Error Toast */}
			{error && (
				<div className='absolute bottom-28 left-1/2 -translate-x-1/2 z-30 max-w-md w-full px-4'>
					<div className='bg-red-50 border border-red-200 rounded-2xl p-4 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300'>
						<div className='shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center'>
							<span className='text-red-500 text-sm'>⚠</span>
						</div>
						<div className='flex-1 min-w-0'>
							<p className='text-sm font-medium text-red-800'>请求失败</p>
							<p className='text-xs text-red-600 mt-0.5 truncate'>{error.message || '网络错误，请检查连接后重试'}</p>
						</div>
						<div className='flex items-center gap-2 shrink-0'>
							<button
								onClick={() => {
									clearError()
									handleSubmit()
								}}
								className='text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors'>
								重试
							</button>
							<button onClick={() => clearError()} className='text-red-400 hover:text-red-600 transition-colors p-1'>
								✕
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	)
}
