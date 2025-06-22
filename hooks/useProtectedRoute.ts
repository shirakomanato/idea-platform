"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { ROUTES } from '@/lib/routes'

/**
 * 保護されたルートのための認証フック
 * 
 * @param redirectTo - 認証が失敗した場合のリダイレクト先 (デフォルト: /connect)
 * @param requireWallet - ウォレット接続が必要かどうか (デフォルト: true)
 * @returns 認証状態と関連情報
 */
export function useProtectedRoute(
  redirectTo: string = ROUTES.CONNECT,
  requireWallet: boolean = true
) {
  const router = useRouter()
  const { user, connected } = useAppStore()
  
  const isAuthenticated = requireWallet ? (connected && !!user) : !!user
  
  useEffect(() => {
    // 認証が必要だが、ユーザーが認証されていない場合
    if (!isAuthenticated) {
      console.log('useProtectedRoute: Redirecting to', redirectTo, {
        connected,
        hasUser: !!user,
        requireWallet
      })
      router.push(redirectTo)
    }
  }, [isAuthenticated, router, redirectTo, connected, user, requireWallet])
  
  return {
    isAuthenticated,
    user,
    connected,
    isLoading: false, // 必要に応じて読み込み状態を追加
  }
}

/**
 * ウォレット接続のみを要求する軽量版
 */
export function useWalletRequired(redirectTo: string = ROUTES.CONNECT) {
  return useProtectedRoute(redirectTo, true)
}

/**
 * 基本的なユーザー認証のみを要求する版
 */
export function useUserRequired(redirectTo: string = ROUTES.CONNECT) {
  return useProtectedRoute(redirectTo, false)
}