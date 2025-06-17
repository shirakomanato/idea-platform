"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function WalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false)
  const { setUser, setConnected } = useAppStore()
  const router = useRouter()
  const { toast } = useToast()

  const connectWallet = async () => {
    setIsConnecting(true)

    try {
      // Metamask接続のシミュレーション
      if (typeof window !== "undefined" && (window as any).ethereum) {
        // 実際の実装では ThirdWeb SDK を使用
        const accounts = await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        })

        if (accounts.length > 0) {
          const address = accounts[0]
          setUser({
            address,
            nickname: `User_${address.slice(-4)}`,
          })
          setConnected(true)

          toast({
            title: "ウォレット接続成功",
            description: "Metamaskに接続されました",
          })

          router.push("/dashboard")
        }
      } else {
        toast({
          title: "Metamaskが見つかりません",
          description: "Metamaskをインストールしてください",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "接続エラー",
        description: "ウォレットの接続に失敗しました",
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
