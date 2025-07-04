"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useAppStore } from "@/lib/store"
import { SwipeCard } from "@/components/swipe-card"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { useIdeas } from "@/lib/supabase/hooks"
import { useToast } from "@/hooks/use-toast"
import { useProtectedRoute } from "@/hooks/useProtectedRoute"
import { getEmpathizedIdeas } from "@/lib/supabase/actions"
import { ROUTES } from "@/lib/routes"
import type { IdeaWithUser } from "@/types/database"

function EmpathizedContent() {
  const { ideas: allIdeas, loading, error } = useIdeas()
  const router = useRouter()
  const { toast } = useToast()
  const [empathizedIdeas, setEmpathizedIdeas] = useState<string[]>([])
  const [filteredIdeas, setFilteredIdeas] = useState<IdeaWithUser[]>([])

  // 保護されたルートの認証チェック
  const { isAuthenticated, user } = useProtectedRoute()

  useEffect(() => {
    if (isAuthenticated && user) {
      // ユーザーが共感したアイデアIDを取得
      const empathizedIds = getEmpathizedIdeas(user.address)
      console.log('Loading empathized ideas for user:', user.address, empathizedIds)
      setEmpathizedIdeas(empathizedIds)
    }
  }, [isAuthenticated, user])

  // ページがフォーカスされた時にもリロード
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        const empathizedIds = getEmpathizedIdeas(user.address)
        console.log('Reloading empathized ideas on focus:', empathizedIds)
        setEmpathizedIdeas(empathizedIds)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  useEffect(() => {
    if (error) {
      toast({
        title: "エラー",
        description: "データの取得に失敗しました",
        variant: "destructive",
      })
    }
  }, [error, toast])

  useEffect(() => {
    // 共感したアイデアのみをフィルタリング
    const filtered = allIdeas.filter(idea => empathizedIdeas.includes(idea.id))
    setFilteredIdeas(filtered)
  }, [allIdeas, empathizedIdeas])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-google-red" />
          <p className="text-sm text-google-gray">共感済みアイデアを読み込み中...</p>
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
                <div className="w-8 h-8 bg-gradient-to-br from-google-red to-danger-600 rounded-full flex items-center justify-center shadow-google">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-google-red rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold text-gray-900">共感済み</h1>
                <p className="text-xs text-google-gray font-medium">いいねしたアイデア</p>
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-2">
            <Button 
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="bg-google-red hover:bg-google-red/90 text-white shadow-google hover:shadow-google-hover transition-all duration-300 rounded-full px-4"
            >
              <Heart className="w-4 h-4 mr-2" />
              新しく共感
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center p-6 pb-24">
        {filteredIdeas.length > 0 ? (
          <div className="w-full max-w-6xl space-y-6">
            {/* Info Section */}
            <div className="bg-gradient-to-br from-google-red/10 to-danger-50 rounded-2xl p-6 border border-google-red/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-google-red rounded-full flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">共感したアイデア</h2>
              </div>
              <div className="space-y-2 text-sm text-google-gray">
                <p>❤️ あなたが共感したアイデアです</p>
                <p>📊 進行状況を追跡できます</p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-google-lightGray/50 rounded-2xl p-4 text-center max-w-md mx-auto">
              <div className="text-2xl font-bold text-google-red">{filteredIdeas.length}</div>
              <div className="text-sm text-google-gray font-medium">共感済みアイデア</div>
            </div>

            {/* Ideas Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredIdeas.map((idea) => (
                <SwipeCard
                  key={idea.id}
                  idea={idea}
                  className="hover:scale-105 transition-transform duration-200 h-full"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <Card className="bg-white border border-gray-200 shadow-google">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-google-red to-danger-600 rounded-full flex items-center justify-center mb-6 animate-pulse-scale">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">共感したアイデアがありません</h3>
                <p className="text-google-gray mb-6 leading-relaxed">
                  アイデアに共感すると<br />
                  ここで追跡できるようになります
                </p>
                <Link href={ROUTES.DASHBOARD}>
                  <Button 
                    className="bg-google-red hover:bg-google-red/90 text-white shadow-google hover:shadow-google-hover transition-all duration-300 rounded-full px-6 py-2"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    アイデアを見る
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}

export default function EmpathizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-google-red" />
          <p className="text-sm text-google-gray">読み込み中...</p>
        </div>
      </div>
    }>
      <EmpathizedContent />
    </Suspense>
  )
}