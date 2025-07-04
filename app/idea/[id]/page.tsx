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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-google-blue" />
      </div>
    )
  }

  if (error || !idea) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">アイデアが見つかりません</h2>
          <Button onClick={() => router.push(ROUTES.DASHBOARD)} className="bg-google-blue hover:bg-google-blue/90 text-white">ダッシュボードに戻る</Button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: typeof idea.status) => {
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
      case "archive":
        return "bg-gray-50 text-google-gray border-gray-200"
      default:
        return "bg-blue-50 text-google-blue border-blue-200"
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
    <div className="min-h-screen bg-white">
      {/* Google-style Header */}
      <div className="sticky top-0 z-40 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-xl font-display font-semibold text-gray-900">アイデア詳細</h1>
          <Button variant="ghost" size="icon" onClick={handleShare} className="hover:bg-gray-100 rounded-full">
            <Share2 className="w-5 h-5 text-gray-700" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20 space-y-6 max-w-4xl mx-auto">
        {/* Main Idea Card - Google Style */}
        <Card className="bg-white border border-gray-200/60 shadow-google">
          <div className="absolute -top-3 -right-3 z-10">
            <Badge className={cn(getStatusColor(idea.status), "border shadow-google px-4 py-1.5 font-medium")}>
              {getStatusLabel(idea.status)}
            </Badge>
          </div>

          <CardHeader className="pb-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-google-gradient rounded-xl shadow-google">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {idea.title}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Target Section */}
            <div className="group">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-google-blue/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-google-blue" />
                </div>
                <h4 className="font-semibold text-google-blue">Target</h4>
              </div>
              <p className="pl-8 text-gray-800 leading-relaxed">{idea.target}</p>
            </div>

            {/* Why Section */}
            <div className="group">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-google-yellow/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-google-yellow" />
                </div>
                <h4 className="font-semibold text-google-yellow">Why</h4>
              </div>
              <p className="pl-8 text-gray-800 leading-relaxed">{idea.why_description}</p>
            </div>

            {/* What Section */}
            {idea.what_description && (
              <div className="group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-google-green/10 flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-google-green" />
                  </div>
                  <h4 className="font-semibold text-google-green">What</h4>
                </div>
                <p className="pl-8 text-gray-800 leading-relaxed">{idea.what_description}</p>
              </div>
            )}

            {/* How Section */}
            {idea.how_description && (
              <div className="group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-google-blue/10 flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-google-blue" />
                  </div>
                  <h4 className="font-semibold text-google-blue">How</h4>
                </div>
                <p className="pl-8 text-gray-800 leading-relaxed">{idea.how_description}</p>
              </div>
            )}

            {/* Impact Section */}
            {idea.impact_description && (
              <div className="group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-google-red/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-google-red" />
                  </div>
                  <h4 className="font-semibold text-google-red">Impact</h4>
                </div>
                <p className="pl-8 text-gray-800 leading-relaxed">{idea.impact_description}</p>
              </div>
            )}

            {/* Author and Date */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-google-gradient rounded-full flex items-center justify-center shadow-google">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {idea.users?.nickname || 'Anonymous'}
                  </p>
                  <p className="text-sm text-google-gray">
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
                  className="group relative overflow-hidden rounded-full px-4 py-2 hover:bg-google-red/10 text-google-gray hover:text-google-red transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 transition-all group-hover:scale-110" />
                    <span className="font-medium">{idea.likes_count}</span>
                  </div>
                </Button>

                <div className="flex items-center gap-2 px-4 py-2 text-google-gray">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">{idea.comments_count}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="bg-white border border-gray-200/60 shadow-google">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <MessageCircle className="w-5 h-5 text-google-blue" />
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
                className="self-end bg-google-blue hover:bg-google-blue/90 text-white shadow-google hover:shadow-google-hover transition-all duration-300"
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
                <Loader2 className="w-6 h-6 animate-spin text-google-blue" />
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-google-lightGray/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-google-gradient rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {comment.users?.nickname || 'Anonymous'}
                        </p>
                        <p className="text-xs text-google-gray">
                          {new Date(comment.created_at).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm pl-10 text-gray-800">{comment.content}</p>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-center text-google-gray py-12">
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