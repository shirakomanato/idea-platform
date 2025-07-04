"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
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
    <div className="min-h-screen bg-white">
      {/* Google-style Header */}
      <div className="sticky top-0 z-40 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-google-gradient rounded-full flex items-center justify-center shadow-google">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-google-yellow rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold text-gray-900">Idea Platform</h1>
                <p className="text-xs text-google-gray font-medium">For the Idea Junkies</p>
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <Link href={ROUTES.NEW_IDEA}>
              <Button 
                size="sm"
                className="bg-google-blue hover:bg-google-blue/90 text-white shadow-google hover:shadow-google-hover transition-all duration-300 rounded-full px-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                新規作成
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center p-6 pb-24">
        {/* Stats and filters section */}
        <div className="w-full max-w-md mb-6">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-google-lightGray/50 rounded-2xl p-3 text-center">
              <div className="text-lg font-bold text-google-blue">{filteredIdeas.length}</div>
              <div className="text-xs text-google-gray font-medium">アイデア</div>
            </div>
            <div className="bg-google-lightGray/50 rounded-2xl p-3 text-center">
              <div className="text-lg font-bold text-google-green">{empathizedIdeas.length}</div>
              <div className="text-xs text-google-gray font-medium">共感済み</div>
            </div>
            <div className="bg-google-lightGray/50 rounded-2xl p-3 text-center">
              <div className="text-lg font-bold text-google-yellow">{recommendedIdeas.length}</div>
              <div className="text-xs text-google-gray font-medium">推薦済み</div>
            </div>
          </div>
        </div>
        
        {filteredIdeas.length > 0 ? (
          <div className="w-full max-w-md">
            <div className="relative mb-6">
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
            
            {/* Google-style Swipe Instructions */}
            <div className="mt-8 space-y-4">
              {/* Action buttons */}
              <div className="flex items-center justify-center gap-8">
                {/* Recommend button */}
                <button 
                  onClick={handleSwipeLeft}
                  className="group flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white border border-gray-200 shadow-google hover:shadow-google-hover transition-all duration-300 active:scale-95"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-google-red to-danger-600 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white font-bold text-lg">←</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">推薦</p>
                    <p className="text-xs text-google-gray">他の人に紹介</p>
                  </div>
                </button>

                {/* Empathize button */}
                <button 
                  onClick={handleSwipeRight}
                  className="group flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white border border-gray-200 shadow-google hover:shadow-google-hover transition-all duration-300 active:scale-95"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-google-green to-secondary-600 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white font-bold text-lg">→</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">共感</p>
                    <p className="text-xs text-google-gray">いいね！</p>
                  </div>
                </button>
              </div>
              
              {/* Instruction text */}
              <div className="text-center">
                <p className="text-sm text-google-gray font-medium">
                  スワイプまたはボタンで操作
                </p>
              </div>
            </div>

            {/* Google-style Progress Indicator */}
            <div className="mt-6 flex justify-center items-center space-x-2">
              <span className="text-xs text-google-gray font-medium">
                {currentIdeaIndex + 1} / {filteredIdeas.length}
              </span>
              <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-google-gradient transition-all duration-500 ease-out"
                  style={{ width: `${((currentIdeaIndex + 1) / filteredIdeas.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <Card className="bg-white border border-gray-200 shadow-google">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-google-gradient rounded-full flex items-center justify-center mb-6 animate-pulse-scale">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">アイデアがありません</h3>
                <p className="text-google-gray mb-6 leading-relaxed">新しいアイデアを投稿して<br />創造の旅を始めましょう！</p>
                <Button 
                  onClick={() => router.push("/idea/new")}
                  className="bg-google-blue hover:bg-google-blue/90 text-white shadow-google hover:shadow-google-hover transition-all duration-300 rounded-full px-6 py-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  アイデアを投稿
                </Button>
              </CardContent>
            </Card>
          </div>
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
