"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Heart, MessageCircle, Share2, User, Calendar, GitBranch, Send } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { ideas, user, likeIdea, addComment } = useAppStore()
  const { toast } = useToast()
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const idea = ideas.find((i) => i.id === params.id)

  useEffect(() => {
    if (!user) {
      router.push("/connect")
    }
  }, [user, router])

  if (!idea) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">アイデアが見つかりません</h2>
          <Button onClick={() => router.push("/dashboard")}>ダッシュボードに戻る</Button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: typeof idea.status) => {
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
      case "archive":
        return "bg-gray-100 text-gray-600"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: typeof idea.status) => {
    switch (status) {
      case "idea":
        return "アイデア"
      case "pre-draft":
        return "プリドラフト"
      case "draft":
        return "ドラフト"
      case "commit":
        return "コミット"
      case "in-progress":
        return "進行中"
      case "test":
        return "テスト"
      case "finish":
        return "完了"
      case "archive":
        return "アーカイブ"
      default:
        return "アイデア"
    }
  }

  const handleLike = () => {
    if (user) {
      likeIdea(idea.id, user.address)
    }
  }

  const handleComment = async () => {
    if (!user || !comment.trim()) return

    setIsSubmitting(true)
    try {
      addComment(idea.id, {
        content: comment.trim(),
        author: user.address,
        authorNickname: user.nickname || `User_${user.address.slice(-4)}`,
      })
      setComment("")
      toast({
        title: "コメント投稿完了",
        description: "コメントが投稿されました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "コメントの投稿に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLiked = user ? idea.likedBy.includes(user.address) : false

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">アイデア詳細</h1>
        <Button variant="ghost" size="icon">
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 pb-20 space-y-6">
        {/* Main Idea Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <Badge className={getStatusColor(idea.status)}>{getStatusLabel(idea.status)}</Badge>
              {idea.githubRepo && <GitBranch className="w-4 h-4 text-muted-foreground" />}
            </div>
            <CardTitle className="text-xl">{idea.title}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-muted-foreground mb-1">Target</h4>
                <p>{idea.target}</p>
              </div>

              <div>
                <h4 className="font-medium text-muted-foreground mb-1">Why</h4>
                <p>{idea.why}</p>
              </div>

              {idea.what && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">What</h4>
                  <p>{idea.what}</p>
                </div>
              )}

              {idea.how && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">How</h4>
                  <p>{idea.how}</p>
                </div>
              )}

              {idea.impact && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-1">Impact</h4>
                  <p>{idea.impact}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{idea.authorNickname}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{new Date(idea.createdAt).toLocaleDateString("ja-JP")}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={cn("flex items-center space-x-1", isLiked && "text-red-500")}
                >
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                  <span>{idea.likes}</span>
                </Button>

                <div className="flex items-center space-x-1 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span>{idea.comments.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">コメント ({idea.comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comment Input */}
            <div className="flex space-x-2">
              <Textarea
                placeholder="コメントを入力..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={handleComment}
                disabled={isSubmitting || !comment.trim()}
                size="icon"
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {idea.comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-muted pl-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                    <User className="w-3 h-3" />
                    <span>{comment.authorNickname}</span>
                    <span>•</span>
                    <span>{new Date(comment.createdAt).toLocaleDateString("ja-JP")}</span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}

              {idea.comments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">まだコメントがありません</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
