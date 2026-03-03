'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { Sidebar } from '@/components/chat/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'

export default function Chat() {
	// Default sidebar open on desktop, closed on mobile
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)
	const [isMobile, setIsMobile] = useState(false)

	// Track hydration to avoid SSR mismatches with browser API
	const [isHydrated, setIsHydrated] = useState(false)

	useEffect(() => {
		setIsHydrated(true)

		// Detect initial screen size
		const checkMobile = () => {
			const mobile = window.innerWidth < 768
			setIsMobile(mobile)
			// Only auto-open sidebar on desktop on first load
			if (!mobile) setIsSidebarOpen(true)
		}
		checkMobile()

		// Listen for resize
		const handleResize = () => {
			const mobile = window.innerWidth < 768
			setIsMobile(mobile)
			// Auto-close sidebar when resizing to mobile
			if (mobile) setIsSidebarOpen(false)
		}
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	// Next.js Router for syncing URL
	const params = useParams()
	const router = useRouter()
	const urlSessionId = Array.isArray(params?.chatId) && params.chatId[0] === 'c' ? params.chatId[1] : null

	const handleSelectSession = (id: string | null) => {
		if (id) {
			router.push(`/c/${id}`)
		} else {
			router.push('/')
		}
	}

	const toggleSidebar = useCallback(() => {
		setIsSidebarOpen(prev => !prev)
	}, [])

	if (!isHydrated) return null

	return (
		<div className='flex h-screen bg-[#fcfcfc] text-[#2b2b2b] font-sans selection:bg-[#8b79df]/20 overflow-hidden'>
			{/* Mobile overlay backdrop */}
			{isMobile && isSidebarOpen && <div className='fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300' onClick={() => setIsSidebarOpen(false)} />}

			<Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} onSelectSession={handleSelectSession} activeId={urlSessionId} isMobile={isMobile} />

			<ChatWindow key={urlSessionId || 'new'} id={urlSessionId} onToggleSidebar={toggleSidebar} isMobile={isMobile} />
		</div>
	)
}
