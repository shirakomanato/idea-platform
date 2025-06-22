import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { PROTECTED_ROUTES, ROUTES } from '@/lib/routes'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Supabaseセッションの更新
  const supabaseResponse = await updateSession(request)
  
  // 保護されたルートかチェック
  const isProtectedPath = PROTECTED_ROUTES.some(route => path.startsWith(route))
  
  if (isProtectedPath) {
    // 開発環境ではより詳細なログ
    if (process.env.NODE_ENV === 'development') {
      console.log(`Middleware: Protected path accessed: ${path}`)
    }
    
    // 実際の認証チェックはクライアントサイドで行う
    // ここではSupabaseセッションのみ管理
    // 必要に応じて将来的にサーバーサイド認証を追加可能
  }
  
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files with extensions (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}