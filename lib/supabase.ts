import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
	console.warn('⚠️ 缺少 Supabase 环境变量 (NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY)!')
}

// 注意这里使用的是 Service Role Key（高级权限），仅能在 Server 端的 API 路由中使用！
// 不要暴露给浏览器前端！
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '')
