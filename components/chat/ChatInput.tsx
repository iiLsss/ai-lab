import { Plus, Mic, Send } from 'lucide-react'
import { RefObject } from 'react'

interface ChatInputProps {
	input: string
	setInput: (input: string) => void
	handleSubmit: (e?: React.FormEvent) => void
	handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
	textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function ChatInput({ input, setInput, handleSubmit, handleKeyDown, textareaRef }: ChatInputProps) {
	return (
		<div className='absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-linear-to-t from-white via-white/80 to-transparent z-20'>
			<div className='max-w-190 mx-auto'>
				<form
					onSubmit={handleSubmit}
					className='relative bg-white/70 backdrop-blur-2xl rounded-4xl p-2 flex items-end gap-2 shadow-[0_12px_48px_rgba(0,0,0,0.06)] border border-black/4 focus-within:border-[#8b79df]/40 focus-within:shadow-[0_12px_48px_rgba(139,121,223,0.1)] transition-all duration-300'>
					<button type='button' className='p-3 hover:bg-black/4 rounded-full text-[#666] transition-colors mb-1 ml-1 group'>
						<Plus className='w-5 h-5 group-hover:scale-110 transition-transform' />
					</button>

					<textarea
						ref={textareaRef}
						value={input}
						onChange={e => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder='Ask Aurora AI...'
						rows={1}
						className='flex-1 bg-transparent border-none focus:ring-0 focus:outline-none  text-[#2b2b2b] placeholder-[#888] py-4 px-2 resize-none max-h-60 min-h-14 text-[16px] leading-relaxed '
						autoFocus
					/>

					<div className='flex items-center gap-2 pr-1 pb-1 mb-1'>
						<button type='button' className='p-3 hover:bg-black/4 rounded-full text-[#666] transition-colors group'>
							<Mic className='w-5 h-5 group-hover:scale-110 transition-transform' />
						</button>
						<button
							type='submit'
							disabled={!input.trim()}
							className='p-3 bg-gradient-custom text-white rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 shadow-md shadow-[#8b79df]/20 hover:shadow-[#8b79df]/40 group'>
							<Send className='w-5 h-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform' />
						</button>
					</div>
				</form>
				<div className='text-center mt-3'>
					<p className='text-[12px] text-[#888]'>Aurora AI can make mistakes. Consider verifying important information.</p>
				</div>
			</div>
		</div>
	)
}
