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

	const { messages, setMessages, sendMessage, status } = useChat()

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
		</main>
	)
}
