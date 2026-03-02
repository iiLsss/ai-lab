import { Menu, Plus, MessageSquare, Settings, HelpCircle, User, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/store/useChatStore'

interface SidebarProps {
	isSidebarOpen: boolean
	setIsSidebarOpen: (open: boolean) => void
}

export function Sidebar({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
	const { sessions, currentSessionId, setCurrentSessionId, deleteSession } = useChatStore()
	const sessionList = Object.values(sessions).sort((a, b) => b.updatedAt - a.createdAt)

	return (
		<aside className={cn('bg-[#fafafa]/80 backdrop-blur-xl transition-all duration-300 flex flex-col h-full border-r border-[#00000008] shrink-0', isSidebarOpen ? 'w-[280px]' : 'w-[72px]')}>
			<div className='p-4 flex flex-col h-full gap-2'>
				<button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className='p-2 hover:bg-black/[0.04] rounded-xl w-fit mb-6 transition-all duration-200 text-[#444]'>
					<Menu className='w-5 h-5' />
				</button>

				<button
					onClick={() => {
						setCurrentSessionId(null)
						// On mobile, close sidebar after clicking
						if (window.innerWidth < 768) setIsSidebarOpen(false)
					}}
					className={cn(
						'flex items-center gap-3 p-3 bg-white/60 hover:bg-white soft-shadow rounded-2xl transition-all duration-200 mb-6 overflow-hidden whitespace-nowrap border border-black/[0.03] group',
						!isSidebarOpen && 'w-[40px] h-[40px] p-0 justify-center',
					)}>
					<div className='w-5 h-5 flex items-center justify-center rounded-full bg-gradient-custom text-white group-hover:scale-110 transition-transform shadow-sm'>
						<Plus className='w-4 h-4' />
					</div>
					{isSidebarOpen && <span className='text-[15px] font-medium text-[#2b2b2b]'>New Chat</span>}
				</button>

				<div className='flex-1 overflow-y-auto space-y-1 scrollbar-hide -mx-2 px-2'>
					{isSidebarOpen && sessionList.length > 0 && (
						<div className='px-3 mb-3'>
							<p className='text-xs font-semibold text-[#888] uppercase tracking-wider'>Recents</p>
						</div>
					)}
					{sessionList.map(session => (
						<div
							key={session.id}
							onClick={() => {
								setCurrentSessionId(session.id)
								if (window.innerWidth < 768) setIsSidebarOpen(false)
							}}
							className={cn(
								'flex items-center justify-between p-2.5 rounded-xl cursor-pointer overflow-hidden transition-colors group',
								currentSessionId === session.id ? 'bg-[#f0f0f0] text-[#222]' : 'hover:bg-black/[0.03] text-[#444]',
								!isSidebarOpen && 'justify-center',
							)}>
							<div className='flex items-center gap-3 overflow-hidden'>
								<MessageSquare className={cn('w-4 h-4 shrink-0', currentSessionId === session.id ? 'text-[#444]' : 'text-[#888] group-hover:text-[#444]')} />
								{isSidebarOpen && <span className='text-[14px] truncate font-medium'>{session.title}</span>}
							</div>
							{isSidebarOpen && (
								<button
									onClick={e => {
										e.stopPropagation()
										deleteSession(session.id)
									}}
									className='p-1.5 opacity-0 group-hover:opacity-100 hover:bg-black/[0.05] rounded-md transition-all shrink-0'>
									<Trash2 className='w-3.5 h-3.5 text-[#888] hover:text-red-500' />
								</button>
							)}
						</div>
					))}
				</div>

				<div className='pt-4 border-t border-black/[0.04] space-y-1 -mx-2 px-2'>
					<button className={cn('flex items-center gap-3 p-2.5 hover:bg-black/[0.03] rounded-xl w-full transition-colors overflow-hidden group', !isSidebarOpen && 'justify-center')}>
						<HelpCircle className='w-5 h-5 text-[#888] group-hover:text-[#444]' />
						{isSidebarOpen && <span className='text-[14px] font-medium text-[#444] group-hover:text-[#222]'>Help & FAQ</span>}
					</button>
					<button className={cn('flex items-center gap-3 p-2.5 hover:bg-black/[0.03] rounded-xl w-full transition-colors overflow-hidden group', !isSidebarOpen && 'justify-center')}>
						<Settings className='w-5 h-5 text-[#888] group-hover:text-[#444]' />
						{isSidebarOpen && <span className='text-[14px] font-medium text-[#444] group-hover:text-[#222]'>Settings</span>}
					</button>
				</div>

				<div className={cn('mt-2 flex items-center gap-3 p-2 hover:bg-black/[0.03] rounded-xl w-full transition-colors overflow-hidden cursor-pointer group', !isSidebarOpen && 'justify-center')}>
					<div className='w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0 border border-black/[0.05]'>
						<User className='text-[#888] w-4 h-4' />
					</div>
					{isSidebarOpen && <span className='text-[14px] font-medium text-[#444] group-hover:text-[#222]'>Developer</span>}
				</div>
			</div>
		</aside>
	)
}
