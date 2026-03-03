import { Sparkles, Menu } from 'lucide-react'

interface HeaderProps {
	onToggleSidebar: () => void
	isMobile: boolean
}

export function Header({ onToggleSidebar, isMobile }: HeaderProps) {
	return (
		<header className='flex items-center justify-between p-4 bg-white/60 backdrop-blur-xl z-10 absolute top-0 left-0 right-0 border-b border-black/3'>
			<div className='flex items-center gap-2'>
				{isMobile && (
					<button onClick={onToggleSidebar} className='p-2 hover:bg-black/4 rounded-xl transition-all duration-200 text-[#444] mr-1'>
						<Menu className='w-5 h-5' />
					</button>
				)}
				<div className='flex items-center gap-2 px-3 py-2 hover:bg-black/3 rounded-xl cursor-pointer transition-all duration-200 group'>
					<span className='text-[17px] font-bold tracking-tight text-[#2b2b2b]'>Aurora</span>
					<div className='bg-gradient-custom rounded-full p-1 opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
						<Sparkles className='w-3 h-3 text-white' />
					</div>
				</div>
			</div>
		</header>
	)
}
