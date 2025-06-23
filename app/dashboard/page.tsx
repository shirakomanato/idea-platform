"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useAppStore } from "@/lib/store"
import { SwipeCard } from "@/components/swipe-card"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Plus, Menu, Sparkles, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useIdeas } from "@/lib/supabase/hooks"
import { useToast } from "@/hooks/use-toast"
import { useProtectedRoute } from "@/hooks/useProtectedRoute"
import { toggleLike, recommendIdea, empathizeWithIdea, getRecommendedIdeas, getEmpathizedIdeas } from "@/lib/supabase/actions"
import { ROUTES } from "@/lib/routes"
import { NotificationBell } from "@/components/notification-system"
import { ProgressionWidget } from "@/components/progression/progression-tracker"
import { AutoProgressionService } from "@/lib/services/auto-progression-service"

function DashboardContent() {
  const { currentIdeaIndex, setCurrentIdeaIndex, currentFilter } = useAppStore()
  const { ideas: supabaseIdeas, loading, error } = useIdeas()
  const { toast } = useToast()
  const [recommendedIdeas, setRecommendedIdeas] = useState<string[]>([])
  const [empathizedIdeas, setEmpathizedIdeas] = useState<string[]>([])

  // 保護されたルートの認証チェック
  const { isAuthenticated, user, isLoading } = useProtectedRoute()

  // 自動進行サービス
  const autoProgressionService = new AutoProgressionService()

  // 認証チェック中は早期リターン
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-sm text-muted-foreground">認証確認中...</p>
        </div>
      </div>
    )
  }

  // 認証されていない場合は何もレンダリングしない（useProtectedRouteがリダイレクトする）
  if (!isAuthenticated) {
    return null
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      // ユーザーの推薦・共感リストを読み込み
      setRecommendedIdeas(getRecommendedIdeas(user.address))
      setEmpathizedIdeas(getEmpathizedIdeas(user.address))

      // 自動進行チェックを定期実行（10分ごと）
      const progressionInterval = setInterval(async () => {
        try {
          await autoProgressionService.runAutoProgression()
        } catch (error) {
          console.warn('Background auto progression failed:', error)
        }
      }, 10 * 60 * 1000)

      return () => clearInterval(progressionInterval)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (error) {
      toast({
        title: "エラー",
        description: "データの取得に失敗しました",
        variant: "destructive",
      })
    }
  }, [error, toast])


  // Supabaseのアイデアを使用し、推薦済みを除外
  const allIdeas = supabaseIdeas.filter(idea => !recommendedIdeas.includes(idea.id))
  
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
    console.log('handleSwipeLeft called', { user: !!user, currentIdea: !!currentIdea })
    if (user && currentIdea) {
      try {
        console.log('Recommending idea:', currentIdea.id)
        await recommendIdea(currentIdea.id, user.address)
        setRecommendedIdeas(prev => [...prev, currentIdea.id])
        
        toast({
          title: "💪 推薦完了",
          description: "このアイデアを他の人に推薦しました。あなたのフィードから非表示になります。",
        })
        console.log(`Recommended idea ${currentIdea.id} by ${user.address}`)
      } catch (error) {
        console.error('Recommendation error:', error)
        toast({
          title: "エラー",
          description: "推薦に失敗しました",
          variant: "destructive",
        })
      }
    }
    nextIdea()
  }

  const handleSwipeRight = async () => {
    // 共感機能 - いいねと追跡
    console.log('handleSwipeRight called', { user: !!user, currentIdea: !!currentIdea })
    if (user && currentIdea) {
      try {
        console.log('Empathizing with idea:', currentIdea.id)
        const result = await empathizeWithIdea(currentIdea.id, user.address)
        
        // 共感リストを更新（結果に関係なく追加）
        setEmpathizedIdeas(prev => {
          if (!prev.includes(currentIdea.id)) {
            const newList = [...prev, currentIdea.id]
            console.log('Updated empathized ideas list:', newList)
            return newList
          }
          return prev
        })
        
        // プログレッション結果をチェック
        let toastMessage = "このアイデアに共感しました！今後の動向を追跡できます。"
        
        if (result.progressionTriggered && result.newStatus) {
          toastMessage = `🎉 アイデアが ${result.newStatus} にレベルアップしました！共感ありがとうございます。`
        } else if (result.likesCount && [5, 10, 25, 50].includes(result.likesCount)) {
          toastMessage = `✨ ${result.likesCount}いいね達成！このアイデアに共感しました。`
        }
        
        toast({
          title: "✨ 共感完了",
          description: toastMessage,
        })
        console.log(`Empathized with idea ${currentIdea.id} by ${user.address}`)
      } catch (error) {
        console.error('Error empathizing:', error)
        toast({
          title: "エラー",
          description: "共感に失敗しました",
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

        <div className="flex items-center space-x-1">
          <NotificationBell />
          <Link href={ROUTES.NEW_IDEA}>
            <Button variant="ghost" size="icon">
              <Plus className="w-5 h-5" />
            </Button>
          </Link>
        </div>
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
                  <button 
                    onClick={handleSwipeLeft}
                    className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform cursor-pointer"
                  >
                    <span className="text-white font-bold text-lg">←</span>
                  </button>
                  <div className="absolute -inset-1 bg-red-400 rounded-full blur-md opacity-40 pointer-events-none"></div>
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
                  <button 
                    onClick={handleSwipeRight}
                    className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform cursor-pointer"
                  >
                    <span className="text-white font-bold text-lg">→</span>
                  </button>
                  <div className="absolute -inset-1 bg-green-400 rounded-full blur-md opacity-40 pointer-events-none"></div>
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
