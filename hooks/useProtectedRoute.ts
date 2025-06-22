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
  const { user, isConnected, hasHydrated } = useAppStore()
  
  const isAuthenticated = requireWallet ? (isConnected && !!user) : !!user
  
  useEffect(() => {
    // Wait for store hydration before checking authentication
    if (hasHydrated && !isAuthenticated) {
      console.log('useProtectedRoute: Redirecting to', redirectTo, {
        isConnected,
        hasUser: !!user,
        requireWallet,
        hasHydrated
      })
      router.push(redirectTo)
    }
  }, [isAuthenticated, router, redirectTo, isConnected, user, requireWallet, hasHydrated])
  
  return {
    isAuthenticated,
    user,
    connected: isConnected,
    isLoading: !hasHydrated, // Store hydration state as loading
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