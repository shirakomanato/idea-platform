"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { SwipeCard } from "@/components/swipe-card"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Plus, Menu, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"

export default function DashboardPage() {
  const { ideas, currentIdeaIndex, setCurrentIdeaIndex, user, currentFilter } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/connect")
      return
    }
    setIsLoading(false)
  }, [user, router])

  const filteredIdeas = ideas.filter((idea) => {
    if (currentFilter === "all") return true
    if (currentFilter === "proposal") {
      return ["commit", "in-progress", "test", "finish"].includes(idea.status)
    }
    return idea.status === currentFilter
  })

  const currentIdea = filteredIdeas[currentIdeaIndex]

  const handleSwipeLeft = () => {
    // 他者推薦機能（今後実装）
    console.log("Swiped left - recommend to others")
    nextIdea()
  }

  const handleSwipeRight = () => {
    // Like機能
    if (user && currentIdea) {
      useAppStore.getState().likeIdea(currentIdea.id, user.address)
    }
    nextIdea()
  }

  const nextIdea = () => {
    if (currentIdeaIndex < filteredIdeas.length - 1) {
      setCurrentIdeaIndex(currentIdeaIndex + 1)
    } else {
      setCurrentIdeaIndex(0)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon">
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h1 className="text-lg font-semibold">For the Idea Junkies</h1>
        </div>

        <Button variant="ghost" size="icon" onClick={() => router.push("/idea/new")}>
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 pb-20">
        {filteredIdeas.length > 0 ? (
          <div className="w-full max-w-sm">
            {currentIdea && (
              <SwipeCard idea={currentIdea} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} />
            )}

            {/* Swipe Instructions */}
            <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600">←</span>
                </div>
                <span>推薦</span>
              </div>

              <div className="flex items-center space-x-2">
                <span>共感</span>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600">→</span>
                </div>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-4 flex justify-center space-x-1">
              {filteredIdeas.slice(0, 5).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === currentIdeaIndex % 5 ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <Card className="w-full max-w-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">アイデアがありません</h3>
              <p className="text-muted-foreground mb-4">新しいアイデアを投稿してみましょう！</p>
              <Button onClick={() => router.push("/idea/new")}>
                <Plus className="w-4 h-4 mr-2" />
                アイデアを投稿
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
