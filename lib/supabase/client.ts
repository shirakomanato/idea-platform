import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('Supabase client creation:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl?.substring(0, 30) + '...',
    keyStart: supabaseAnonKey?.substring(0, 20) + '...'
  })
  
  // Development fallback - return mock client if env vars not set
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_ANON_KEY_HERE') {
    console.warn('Supabase環境変数が設定されていません。ローカルストアのみで動作します。')
    return null as any
  }
  
  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      // Ensure proper headers for RLS
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
    })
    console.log('Supabase client created successfully')
    return client
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null as any
  }
}