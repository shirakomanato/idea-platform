"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/database"

export function WalletConnect(): JSX.Element {
  const [isConnecting, setIsConnecting] = useState(false)
  const { setUser, setConnected } = useAppStore()
  const router = useRouter()
  const { toast } = useToast()

  const connectWallet = async () => {
    setIsConnecting(true)

    try {
      if (typeof window !== "undefined" && window.ethereum) {
        // MetaMask接続
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        }) as string[]

        if (accounts.length > 0) {
          const walletAddress = accounts[0]
          
          try {
            const supabase = createClient()
            
            // Supabaseが設定されていない場合はローカルユーザーで続行
            if (!supabase) {
              console.warn('Supabase not configured, using local user only')
              setUser({
                address: walletAddress,
                nickname: `User_${walletAddress.slice(-4)}`,
                id: walletAddress,
              })
              setConnected(true)

              toast({
                title: "ウォレット接続成功",
                description: "Metamaskに接続されました（ローカルモード）",
              })

              router.push("/dashboard")
              return
            }
            
            // データベースでユーザーを検索または作成
            let { data: existingUser, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('wallet_address', walletAddress)
              .single()

            if (fetchError && fetchError.code !== 'PGRST116') {
              console.warn('User fetch error:', fetchError)
              // エラーが発生してもユーザー作成を試す
            }

            let user: User
            if (!existingUser) {
              // 新規ユーザー作成
              const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({
                  wallet_address: walletAddress,
                  nickname: `User_${walletAddress.slice(-4)}`,
                })
                .select()
                .single()

              if (insertError) {
                console.warn('User creation error:', insertError)
                // データベースエラーでもローカルで続行
                user = {
                  id: walletAddress,
                  wallet_address: walletAddress,
                  nickname: `User_${walletAddress.slice(-4)}`,
                  avatar_url: null,
                  bio: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              } else {
                user = newUser
              }
            } else {
              user = existingUser
            }

            // ユーザーコンテキストを設定（エラーでも続行）
            try {
              await supabase.rpc('set_current_user_wallet', { 
                wallet_address: walletAddress 
              })
            } catch (rpcError) {
              console.warn('RPC function error:', rpcError)
            }

            setUser({
              address: user.wallet_address,
              nickname: user.nickname || `User_${walletAddress.slice(-4)}`,
              id: user.id,
            })
            setConnected(true)

            toast({
              title: "ウォレット接続成功",
              description: "Metamaskに接続されました",
            })

            router.push("/dashboard")
          } catch (dbError) {
            console.warn('Database error, proceeding with local user:', dbError)
            
            // データベースエラーでもローカルユーザーで続行
            setUser({
              address: walletAddress,
              nickname: `User_${walletAddress.slice(-4)}`,
              id: walletAddress,
            })
            setConnected(true)

            toast({
              title: "ウォレット接続成功",
              description: "Metamaskに接続されました（ローカルモード）",
            })

            router.push("/dashboard")
          }
        }
      } else {
        toast({
          title: "Metamaskが見つかりません",
          description: "Metamaskをインストールしてください",
          variant: "destructive",
        })
      }
    } catch (error: unknown) {
      console.error('Wallet connection error:', error)
      
      let errorMessage = "ウォレットの接続に失敗しました"
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: "接続エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">For the Idea Junkies</CardTitle>
          <CardDescription>
            アイデア共創プラットフォームへようこそ
            <br />
            Metamaskでログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={connectWallet} disabled={isConnecting} className="w-full h-12 text-lg">
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                接続中...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-5 w-5" />
                Metamaskで接続
              </>
            )}
          </Button>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>初回接続時は自動でアカウントが作成されます</p>
            <p className="mt-2">
              <a href="/terms" className="text-blue-600 hover:underline">
                利用規約
              </a>
              {" ・ "}
              <a href="/privacy" className="text-blue-600 hover:underline">
                プライバシーポリシー
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
