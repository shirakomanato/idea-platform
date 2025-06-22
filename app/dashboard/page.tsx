"use client"

import { useEffect, useState, Suspense } from "react"
import { useAppStore } from "@/lib/store"
import { SwipeCard } from "@/components/swipe-card"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Plus, Menu, Sparkles, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { useIdeas } from "@/lib/supabase/hooks"
import { useToast } from "@/hooks/use-toast"
import { toggleLike } from "@/lib/supabase/actions"

function DashboardContent() {
  const { currentIdeaIndex, setCurrentIdeaIndex, user, currentFilter } = useAppStore()
  const { ideas: supabaseIdeas, loading, error } = useIdeas()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push("/connect")
      return
    }
  }, [user, router])

  useEffect(() => {
    if (error) {
      toast({
        title: "エラー",
        description: "データの取得に失敗しました",
        variant: "destructive",
      })
    }
  }, [error, toast])


  // Supabaseのアイデアを使用
  const allIdeas = supabaseIdeas
  
  const filteredIdeas = allIdeas.filter((idea) => {
    if (currentFilter === "all") return true
    if (currentFilter === "proposal") {
      return ["commit", "in-progress", "test", "finish"].includes(idea.status)
    }
    return idea.status === currentFilter
  })

  const currentIdea = filteredIdeas[currentIdeaIndex]

  const handleSwipeLeft = async () => {
    // 他者推薦機能
    if (user && currentIdea) {
      toast({
        title: "💪 推薦",
        description: "このアイデアを他の人に推薦しました",
      })
      console.log(`Recommended idea ${currentIdea.id} by ${user.address}`)
      // TODO: 推薦機能のSupabase実装を追加
    }
    nextIdea()
  }

  const handleSwipeRight = async () => {
    // Like機能 - 共感
    if (user && currentIdea) {
      try {
        const userIdToUse = user.address
        await toggleLike(currentIdea.id, userIdToUse)
        
        toast({
          title: "✨ 共感",
          description: "このアイデアに共感しました！",
        })
        console.log(`Liked idea ${currentIdea.id} by ${user.address}`)
      } catch (error) {
        console.error('Error liking idea:', error)
        toast({
          title: "エラー",
          description: "いいねに失敗しました",
          variant: "destructive",
        })
      }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-sm text-muted-foreground">アイデアを読み込み中...</p>
        </div>
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
          <div className="w-full max-w-md">
            <div className="relative">
              {/* Background cards for stack effect */}
              {filteredIdeas.slice(currentIdeaIndex + 1, currentIdeaIndex + 3).map((idea, index) => (
                <div
                  key={idea.id}
                  className="absolute inset-0"
                  style={{
                    transform: `scale(${0.95 - index * 0.05}) translateY(${(index + 1) * 8}px)`,
                    opacity: 0.5 - index * 0.2,
                    zIndex: -index - 1,
                  }}
                >
                  <SwipeCard idea={idea} className="pointer-events-none" />
                </div>
              ))}
              
              {/* Current card */}
              {currentIdea && (
                <SwipeCard idea={currentIdea} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} />
              )}
            </div>
            
            {/* Swipe Instructions - Modern Design */}
            <div className="mt-8 flex items-center justify-between px-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                    <span className="text-white font-bold text-lg">←</span>
                  </div>
                  <div className="absolute -inset-1 bg-red-400 rounded-full blur-md opacity-40"></div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">推薦</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">他の人に紹介</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white text-right">共感</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-right">いいね！</p>
                </div>
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                    <span className="text-white font-bold text-lg">→</span>
                  </div>
                  <div className="absolute -inset-1 bg-green-400 rounded-full blur-md opacity-40"></div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
