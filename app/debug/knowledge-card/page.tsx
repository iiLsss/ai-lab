'use client'

import { useState } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { z } from 'zod'

// 1. 保持与后端完全一致的 Schema (用于前端类型推导和流式解析)
const knowledgeCardSchema = z.object({
	title: z.string(),
	summary: z.string(),
	keyPoints: z.array(z.string()),
	example: z.string(),
})

const responseSchema = z.object({
	text: z.string(),
	knowledgeCard: knowledgeCardSchema,
})

export default function StudyChat() {
	const [input, setInput] = useState('')

	// 用于保存历史对话记录（因为 useObject 每次请求只会维护当前这一个对象的状态）
	const [messages, setMessages] = useState<{ role: string; content: string }[]>([])

	// 2. 初始化 useObject 钩子
	const { object, submit, isLoading } = useObject({
		api: '/api/knowledge-card',
		schema: responseSchema,
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!input.trim() || isLoading) return

		// 更新本地对话列表
		const newMessages = [...messages, { role: 'user', content: input }]
		setMessages(newMessages)
		setInput('')

		// 3. 将 messages 提交给你的后端路由
		submit({ messages: newMessages })
	}

	return (
		<div className='max-w-3xl mx-auto p-6 flex flex-col gap-6'>
			{/* 历史消息展示（简易版） */}
			<div className='flex flex-col gap-4'>
				{messages.map((msg, idx) => (
					<div key={idx} className='p-4 bg-gray-100 rounded-lg w-fit'>
						<strong>{msg.role === 'user' ? '你' : 'AI'}:</strong> {msg.content}
					</div>
				))}
			</div>

			{/* 正在生成的实时响应区域 */}
			{object && (
				<div className='flex flex-col gap-6 p-4 border-2 border-blue-100 rounded-xl'>
					{/* 实时渲染的正文文本 */}
					{object.text && <div className='text-gray-800 leading-relaxed'>{object.text}</div>}

					{/* 实时渲染的知识卡片 */}
					{object.knowledgeCard && (
						<div className='bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-200'>
							{/* 注意：流式输出时属性可能为 undefined，必须使用 ?. 保护 */}
							<h3 className='text-xl font-bold text-blue-800 mb-2'>💡 {object.knowledgeCard?.title || '正在生成标题...'}</h3>

							<p className='text-gray-700 italic mb-4'>{object.knowledgeCard?.summary}</p>

							{object.knowledgeCard?.keyPoints && object.knowledgeCard.keyPoints.length > 0 && (
								<div className='mb-4'>
									<strong className='text-blue-900 block mb-2'>关键要点：</strong>
									<ul className='list-disc pl-5 space-y-1'>
										{object.knowledgeCard.keyPoints.map((point, i) => (
											// point 也可能只生成了一半，所以需要判断
											<li key={i} className='text-gray-800'>
												{point}
											</li>
										))}
									</ul>
								</div>
							)}

							{object.knowledgeCard?.example && (
								<div className='bg-white p-3 rounded border border-blue-100 mt-4'>
									<strong className='text-sm text-blue-700'>举例说明：</strong>
									<p className='text-sm text-gray-600 mt-1'>{object.knowledgeCard.example}</p>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* 聊天输入框 */}
			<form onSubmit={handleSubmit} className='flex gap-2 mt-4'>
				<input
					value={input}
					onChange={e => setInput(e.target.value)}
					placeholder='输入你想学习的知识点...'
					className='flex-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
					disabled={isLoading}
				/>
				<button type='submit' disabled={isLoading || !input.trim()} className='px-6 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50'>
					{isLoading ? '生成中...' : '发送'}
				</button>
			</form>
		</div>
	)
}
