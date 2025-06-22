import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Development fallback - return mock client if env vars not set
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_ANON_KEY_HERE') {
    console.warn('Supabase環境変数が設定されていません。ローカルストアのみで動作します。')
    return null as any
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}