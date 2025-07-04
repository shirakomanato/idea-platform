"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { SwipeCard } from "@/components/swipe-card"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Sparkles, Plus } from "lucide-react"
import { useIdeas } from "@/lib/supabase/hooks"
import { useProtectedRoute } from "@/hooks/useProtectedRoute"

export default function PreDraftsPage() {
  const { ideas: localIdeas, user } = useAppStore()
  const { ideas: supabaseIdeas } = useIdeas()
  const router = useRouter()

  // 認証チェック
  const { isAuthenticated } = useProtectedRoute()

  useEffect(() => {
    if (!user) {
      router.push("/connect")
    }
  }, [user, router])

  // Supabaseのデータを優先、フォールバックでローカルデータを使用
  const allIdeas = supabaseIdeas.length > 0 ? supabaseIdeas : localIdeas
  const preDraftIdeas = allIdeas.filter((idea) => idea.status === "pre-draft")

  if (!isAuthenticated) {
    return null
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
                <div className="w-8 h-8 bg-gradient-to-br from-google-yellow to-accent-600 rounded-full flex items-center justify-center shadow-google">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-google-yellow rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold text-gray-900">プリドラフト</h1>
                <p className="text-xs text-google-gray font-medium">ドラフト化準備段階</p>
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-2">
            <Button 
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="bg-google-yellow hover:bg-google-yellow/90 text-white shadow-google hover:shadow-google-hover transition-all duration-300 rounded-full px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              アイデア作成
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center p-6 pb-24">
        {preDraftIdeas.length > 0 ? (
          <div className="w-full max-w-md space-y-6">
            {/* Info Section */}
            <div className="bg-gradient-to-br from-google-yellow/10 to-accent-50 rounded-2xl p-6 border border-google-yellow/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-google-yellow rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">プリドラフト段階</h2>
              </div>
              <div className="space-y-2 text-sm text-google-gray">
                <p>✨ Like数が一定以上に達したアイデアです</p>
                <p>📝 ドラフト化して詳細を完成させましょう</p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-google-lightGray/50 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-google-yellow">{preDraftIdeas.length}</div>
              <div className="text-sm text-google-gray font-medium">プリドラフト</div>
            </div>

            {/* Ideas List */}
            <div className="space-y-4">
              {preDraftIdeas.map((idea) => (
                <SwipeCard key={idea.id} idea={idea} />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <Card className="bg-white border border-gray-200 shadow-google">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-google-yellow to-accent-600 rounded-full flex items-center justify-center mb-6 animate-pulse-scale">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">プリドラフトがありません</h3>
                <p className="text-google-gray mb-6 leading-relaxed">
                  アイデアがLike数一定以上に達すると<br />
                  ここに表示されます
                </p>
                <Button 
                  onClick={() => router.push("/dashboard")}
                  className="bg-google-yellow hover:bg-google-yellow/90 text-white shadow-google hover:shadow-google-hover transition-all duration-300 rounded-full px-6 py-2"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  アイデアを見る
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
