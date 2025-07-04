"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Wallet, Heart, MessageCircle, Trophy, Settings, LogOut, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useIdeas } from "@/lib/supabase/hooks"
import { useProtectedRoute } from "@/hooks/useProtectedRoute"
import { getEmpathizedIdeas } from "@/lib/supabase/actions"
import type { IdeaWithUser } from "@/types/database"

function ProfileContent() {
  const router = useRouter()
  const { toast } = useToast()
  const { setUser, setConnected } = useAppStore()
  const { ideas: allIdeas } = useIdeas()
  const { isAuthenticated, user, isLoading } = useProtectedRoute()
  const [empathizedIdeas, setEmpathizedIdeas] = useState<string[]>([])
  const [myStats, setMyStats] = useState({ ideas: 0, likes: 0, comments: 0 })

  useEffect(() => {
    if (isAuthenticated && user) {
      // ユーザーが共感したアイデアIDを取得
      const empathizedIds = getEmpathizedIdeas(user.address)
      setEmpathizedIdeas(empathizedIds)
      
      // 統計を計算
      const myIdeasCount = allIdeas.filter(idea => idea.wallet_address === user.address).length
      const myLikesCount = empathizedIds.length
      const myCommentsCount = allIdeas.reduce((total, idea) => total + (idea.comments_count || 0), 0) // 実際のコメント数はSupabaseから取得する必要があります
      
      setMyStats({
        ideas: myIdeasCount,
        likes: myLikesCount,
        comments: myCommentsCount
      })
    }
  }, [isAuthenticated, user, allIdeas])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-google-gray" />
          <p className="text-sm text-google-gray">プロフィール読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const myIdeas = allIdeas.filter((idea) => idea.wallet_address === user.address)

  const handleLogout = () => {
    setUser(null)
    setConnected(false)
    toast({
      title: "ログアウト完了",
      description: "ログアウトしました",
    })
    router.push("/connect")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "idea":
        return "bg-blue-50 text-google-blue border-blue-200"
      case "pre-draft":
        return "bg-yellow-50 text-accent border-yellow-200"
      case "draft":
        return "bg-blue-50 text-primary border-blue-200"
      case "commit":
        return "bg-purple-50 text-purple-600 border-purple-200"
      case "in-progress":
        return "bg-orange-50 text-orange-600 border-orange-200"
      case "test":
        return "bg-green-50 text-secondary border-green-200"
      case "finish":
        return "bg-emerald-50 text-emerald-600 border-emerald-200"
      default:
        return "bg-blue-50 text-google-blue border-blue-200"
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Google-style Header */}
      <div className="sticky top-0 z-40 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-lg">
        <div className="flex items-center justify-center px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 bg-google-gradient rounded-full flex items-center justify-center shadow-google">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-google-gray rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-gray-900">プロフィール</h1>
              <p className="text-xs text-google-gray font-medium">あなたの活動</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center p-6 pb-24">
        <div className="w-full max-w-md space-y-6">
          {/* User Info */}
          <Card className="bg-white border border-gray-200/60 shadow-google">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-google-gradient rounded-full flex items-center justify-center shadow-google">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{user.nickname || `User_${user.address.slice(-4)}`}</h2>
                  <div className="flex items-center space-x-2 text-sm text-google-gray">
                    <Wallet className="w-4 h-4" />
                    <span>
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-white border border-gray-200/60 shadow-google">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="w-10 h-10 bg-google-yellow/10 rounded-full flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5 text-google-yellow" />
                </div>
                <div className="text-xl font-bold text-gray-900">{myStats.ideas}</div>
                <div className="text-xs text-google-gray font-medium">投稿</div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200/60 shadow-google">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="w-10 h-10 bg-google-red/10 rounded-full flex items-center justify-center mb-2">
                  <Heart className="w-5 h-5 text-google-red" />
                </div>
                <div className="text-xl font-bold text-gray-900">{myStats.likes}</div>
                <div className="text-xs text-google-gray font-medium">いいね</div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200/60 shadow-google">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="w-10 h-10 bg-google-blue/10 rounded-full flex items-center justify-center mb-2">
                  <MessageCircle className="w-5 h-5 text-google-blue" />
                </div>
                <div className="text-xl font-bold text-gray-900">{myStats.comments}</div>
                <div className="text-xs text-google-gray font-medium">コメント</div>
              </CardContent>
            </Card>
          </div>

          {/* My Ideas */}
          <Card className="bg-white border border-gray-200/60 shadow-google">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-google-yellow" />
                投稿したアイデア
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myIdeas.length > 0 ? (
                <div className="space-y-3">
                  {myIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-google-lightGray/30 hover:shadow-sm transition-all duration-200"
                      onClick={() => router.push(`/idea/${idea.id}`)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 line-clamp-1">{idea.title}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`${getStatusColor(idea.status)} border font-medium text-xs`}>
                            {idea.status}
                          </Badge>
                          <span className="text-sm text-google-gray">{idea.likes_count} likes</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-google-gray mx-auto mb-3" />
                  <p className="text-google-gray">まだアイデアを投稿していません</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start bg-white border-gray-200 hover:bg-google-lightGray/50 text-gray-900 transition-all duration-200"
            >
              <Settings className="w-4 h-4 mr-2" />
              設定
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start bg-white border-google-red/20 text-google-red hover:bg-google-red/5 hover:text-google-red transition-all duration-200"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-google-gray" />
          <p className="text-sm text-google-gray">読み込み中...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}
