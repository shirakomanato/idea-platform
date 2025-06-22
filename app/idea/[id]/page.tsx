"use client"

import { useEffect, useState, use } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Heart, MessageCircle, Share2, User, Calendar, GitBranch, Send, Target, Lightbulb, Rocket, Sparkles, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useProtectedRoute } from "@/hooks/useProtectedRoute"
import { useIdeaDetails } from "@/lib/supabase/hooks"
import { toggleLike, addComment, getComments } from "@/lib/supabase/actions"
import { ROUTES } from "@/lib/routes"
import type { CommentWithUser } from "@/types/database"

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [loadingComments, setLoadingComments] = useState(true)
  
  const { idea, loading, error } = useIdeaDetails(params.id as string)

  // 保護されたルートの認証チェック
  const { isAuthenticated, user } = useProtectedRoute()

  useEffect(() => {
    if (idea) {
      loadComments()
    }
  }, [idea])

  const loadComments = async () => {
    try {
      const data = await getComments(params.id as string, user?.address)
      setComments(data as CommentWithUser[])
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error || !idea) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">アイデアが見つかりません</h2>
          <Button onClick={() => router.push(ROUTES.DASHBOARD)}>ダッシュボードに戻る</Button>
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

  const handleLike = async () => {
    if (!user) return
    
    setIsLiking(true)
    try {
      await toggleLike(idea.id, user.address)
      toast({
        title: "更新完了",
        description: "いいねを更新しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "いいねの更新に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  const handleComment = async () => {
    if (!user || !comment.trim()) return

    setIsSubmitting(true)
    try {
      const newComment = await addComment(idea.id, user.address, comment.trim())
      setComments([...comments, newComment as CommentWithUser])
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: idea.title,
          text: `${idea.title} - ${idea.target}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "リンクをコピーしました",
        description: "URLをクリップボードにコピーしました",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">アイデア詳細</h1>
        <Button variant="ghost" size="icon" onClick={handleShare}>
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 pb-20 space-y-6 max-w-4xl mx-auto">
        {/* Main Idea Card - Modern Design */}
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="absolute -top-3 -right-3 z-10">
            <Badge className={cn(getStatusColor(idea.status), "shadow-lg px-4 py-1.5 font-medium")}>
              {getStatusLabel(idea.status)}
            </Badge>
          </div>

          <CardHeader className="pb-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {idea.title}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Target Section */}
            <div className="group">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold text-purple-600 dark:text-purple-400">Target</h4>
              </div>
              <p className="pl-7 text-gray-700 dark:text-gray-300">{idea.target}</p>
            </div>

            {/* Why Section */}
            <div className="group">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h4 className="font-semibold text-yellow-600 dark:text-yellow-400">Why</h4>
              </div>
              <p className="pl-7 text-gray-700 dark:text-gray-300">{idea.why_description}</p>
            </div>

            {/* What Section */}
            {idea.what_description && (
              <div className="group">
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="w-5 h-5 text-green-500" />
                  <h4 className="font-semibold text-green-600 dark:text-green-400">What</h4>
                </div>
                <p className="pl-7 text-gray-700 dark:text-gray-300">{idea.what_description}</p>
              </div>
            )}

            {/* How Section */}
            {idea.how_description && (
              <div className="group">
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400">How</h4>
                </div>
                <p className="pl-7 text-gray-700 dark:text-gray-300">{idea.how_description}</p>
              </div>
            )}

            {/* Impact Section */}
            {idea.impact_description && (
              <div className="group">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  <h4 className="font-semibold text-orange-600 dark:text-orange-400">Impact</h4>
                </div>
                <p className="pl-7 text-gray-700 dark:text-gray-300">{idea.impact_description}</p>
              </div>
            )}

            {/* Author and Date */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {idea.users?.nickname || 'Anonymous'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(idea.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>

              {/* Interaction Stats */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={isLiking}
                  className={cn(
                    "group relative overflow-hidden rounded-full px-4 py-2",
                    "hover:bg-red-50 dark:hover:bg-red-950"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Heart className={cn(
                      "w-5 h-5 transition-all group-hover:scale-110",
                      "group-hover:text-red-500"
                    )} />
                    <span className="font-medium">{idea.likes_count}</span>
                  </div>
                </Button>

                <div className="flex items-center gap-2 px-4 py-2">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">{idea.comments_count}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              コメント ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comment Input */}
            <div className="flex gap-3">
              <Textarea
                placeholder="コメントを入力..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="flex-1 resize-none"
              />
              <Button
                onClick={handleComment}
                disabled={isSubmitting || !comment.trim()}
                size="icon"
                className="self-end bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Comments List */}
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {comment.users?.nickname || 'Anonymous'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm pl-10">{comment.content}</p>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-center text-gray-500 py-12">
                    まだコメントがありません
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}