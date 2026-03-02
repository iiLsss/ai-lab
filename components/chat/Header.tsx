import { Sparkles, Bot } from 'lucide-react'

export function Header() {
	return (
		<header className='flex items-center justify-between p-4 bg-transparent z-10 absolute top-0 left-0 right-0'>
			<div className='flex items-center gap-2 px-3 py-2 hover:bg-black/[0.03] rounded-xl cursor-pointer transition-all duration-200 group'>
				<span className='text-[17px] font-bold tracking-tight text-[#2b2b2b]'>Aurora</span>
				<div className='bg-gradient-custom rounded-full p-1 opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
					<Sparkles className='w-3 h-3 text-white' />
				</div>
			</div>
		</header>
	)
}
