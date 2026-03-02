import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UIMessage } from '@ai-sdk/react'

export interface ChatSession {
	id: string
	title: string
	messages: UIMessage[]
	createdAt: number
	updatedAt: number
}

interface ChatStore {
	sessions: Record<string, ChatSession>
	currentSessionId: string | null
	createSession: (id: string, title?: string) => void
	setCurrentSessionId: (id: string | null) => void
	updateSessionTitle: (id: string, title: string) => void
	updateSessionMessages: (id: string, messages: UIMessage[]) => void
	deleteSession: (id: string) => void
}

export const useChatStore = create<ChatStore>()(
	persist(
		set => ({
			sessions: {},
			currentSessionId: null,

			createSession: (id, title = 'New Chat') =>
				set(state => ({
					sessions: {
						...state.sessions,
						[id]: {
							id,
							title,
							messages: [],
							createdAt: Date.now(),
							updatedAt: Date.now(),
						},
					},
					currentSessionId: id,
				})),

			setCurrentSessionId: id => set({ currentSessionId: id }),

			updateSessionTitle: (id, title) =>
				set(state => ({
					sessions: {
						...state.sessions,
						[id]: {
							...state.sessions[id],
							title,
							updatedAt: Date.now(),
						},
					},
				})),

			updateSessionMessages: (id, messages) =>
				set(state => {
					const session = state.sessions[id]
					if (!session) return state

					let title = session.title
					// Automatically derive title from first user message, if it is still "New Chat"
					if (title === 'New Chat' && messages.length > 0) {
						const firstUserMsg = messages.find(m => m.role === 'user')
						if (firstUserMsg) {
							// get text string from parts or text
							let text = ''
							if (firstUserMsg.parts) {
								const textPart = firstUserMsg.parts.find(p => p.type === 'text')
								if (textPart && 'text' in textPart) {
									text = textPart.text
								}
							} else if ('content' in firstUserMsg && typeof firstUserMsg.content === 'string') {
								// fallback for content
								text = firstUserMsg.content as string
							}

							if (text) {
								title = text.slice(0, 30) + (text.length > 30 ? '...' : '')
							}
						}
					}

					return {
						sessions: {
							...state.sessions,
							[id]: {
								...session,
								title,
								messages,
								updatedAt: Date.now(),
							},
						},
					}
				}),

			deleteSession: id =>
				set(state => {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { [id]: _, ...rest } = state.sessions
					return {
						sessions: rest,
						currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
					}
				}),
		}),
		{
			name: 'aurora-chat-storage', // localStorage key
			partialize: state => ({ sessions: state.sessions, currentSessionId: state.currentSessionId }),
		},
	),
)
