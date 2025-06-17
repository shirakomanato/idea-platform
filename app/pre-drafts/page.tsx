"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { SwipeCard } from "@/components/swipe-card"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Sparkles } from "lucide-react"

export default function PreDraftsPage() {
  const { ideas, user } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/connect")
    }
  }, [user, router])

  const preDraftIdeas = ideas.filter((idea) => idea.status === "pre-draft")

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      {/* Header */}
      <div className="flex items-center justify-center p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-yellow-500" />
          <h1 className="text-lg font-semibold">プリドラフト</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {preDraftIdeas.length > 0 ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">Like数が3割以上に達したアイデアです</p>
              <p className="text-sm text-muted-foreground">ドラフト化して詳細を完成させましょう</p>
            </div>

            {preDraftIdeas.map((idea) => (
              <SwipeCard key={idea.id} idea={idea} />
            ))}
          </div>
        ) : (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">プリドラフトがありません</h3>
              <p className="text-muted-foreground mb-4">
                アイデアがLike数3割以上に達すると
                <br />
                ここに表示されます
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
