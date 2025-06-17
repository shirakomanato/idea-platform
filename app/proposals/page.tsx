"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { SwipeCard } from "@/components/swipe-card"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Rocket, Sparkles } from "lucide-react"

export default function ProposalsPage() {
  const { ideas, user } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/connect")
    }
  }, [user, router])

  const proposalIdeas = ideas.filter((idea) => ["commit", "in-progress", "test", "finish"].includes(idea.status))

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      {/* Header */}
      <div className="flex items-center justify-center p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Rocket className="w-5 h-5 text-purple-500" />
          <h1 className="text-lg font-semibold">プロポーザル</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {proposalIdeas.length > 0 ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">実装段階に入ったプロジェクトです</p>
              <p className="text-sm text-muted-foreground">進行状況を確認・参加できます</p>
            </div>

            {proposalIdeas.map((idea) => (
              <SwipeCard key={idea.id} idea={idea} />
            ))}
          </div>
        ) : (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Rocket className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">プロポーザルがありません</h3>
              <p className="text-muted-foreground mb-4">
                ドラフトからコミット段階に進んだ
                <br />
                プロジェクトがここに表示されます
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                <Sparkles className="w-4 h-4 mr-2" />
                アイデアを見る
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
