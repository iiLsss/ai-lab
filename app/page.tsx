'use client'

import { useChat } from '@ai-sdk/react'
import { useRef, useEffect, useState } from 'react'

import { Sidebar } from '@/components/chat/Sidebar'
import { Header } from '@/components/chat/Header'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatInput } from '@/components/chat/ChatInput'

import { mockInitialMessages } from '@/lib/mock-chat'

export default function Chat() {
	const [input, setInput] = useState('')
	const [isSidebarOpen, setIsSidebarOpen] = useState(true)
	const { messages, sendMessage, status } = useChat({ messages: mockInitialMessages })
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	const handleSubmit = (e?: React.FormEvent) => {
		e?.preventDefault()
		if (!input.trim() || status === 'streaming') return
		sendMessage({ text: input })
		setInput('')
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
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

	return (
		<div className='flex h-screen bg-[#fcfcfc] text-[#2b2b2b] font-sans selection:bg-[#8b79df]/20'>
			<Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

			<main className='flex-1 flex flex-col h-full relative overflow-hidden bg-white/40'>
				<Header />

				<div className='flex-1 overflow-y-auto px-4 md:px-0 scroll-smooth pb-32'>
					<ChatMessages messages={messages} status={status} messagesEndRef={messagesEndRef} setInput={setInput} />
				</div>

				<ChatInput input={input} setInput={setInput} handleSubmit={handleSubmit} handleKeyDown={handleKeyDown} textareaRef={textareaRef} />
			</main>
		</div>
	)
}
