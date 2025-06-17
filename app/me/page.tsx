"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Wallet, Heart, MessageCircle, Trophy, Settings, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const { user, ideas, setUser, setConnected } = useAppStore()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push("/connect")
    }
  }, [user, router])

  if (!user) return null

  const myIdeas = ideas.filter((idea) => idea.author === user.address)
  const myLikes = ideas.reduce((total, idea) => total + (idea.likedBy.includes(user.address) ? 1 : 0), 0)
  const myComments = ideas.reduce(
    (total, idea) => total + idea.comments.filter((comment) => comment.author === user.address).length,
    0,
  )

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
        return "bg-gray-100 text-gray-800"
      case "pre-draft":
        return "bg-yellow-100 text-yellow-800"
      case "draft":
        return "bg-blue-100 text-blue-800"
      case "commit":
        return "bg-purple-100 text-purple-800"
      case "in-progress":
        return "bg-orange-100 text-orange-800"
      case "test":
        return "bg-green-100 text-green-800"
      case "finish":
        return "bg-emerald-100 text-emerald-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      {/* Header */}
      <div className="flex items-center justify-center p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-semibold">プロフィール</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20 space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.nickname}</h2>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
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
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
              <div className="text-2xl font-bold">{myIdeas.length}</div>
              <div className="text-sm text-muted-foreground">投稿</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Heart className="w-8 h-8 text-red-500 mb-2" />
              <div className="text-2xl font-bold">{myLikes}</div>
              <div className="text-sm text-muted-foreground">いいね</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <MessageCircle className="w-8 h-8 text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{myComments}</div>
              <div className="text-sm text-muted-foreground">コメント</div>
            </CardContent>
          </Card>
        </div>

        {/* My Ideas */}
        <Card>
          <CardHeader>
            <CardTitle>投稿したアイデア</CardTitle>
          </CardHeader>
          <CardContent>
            {myIdeas.length > 0 ? (
              <div className="space-y-3">
                {myIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/idea/${idea.id}`)}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-1">{idea.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(idea.status)} variant="secondary">
                          {idea.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{idea.likes} likes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">まだアイデアを投稿していません</p>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />
            設定
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
