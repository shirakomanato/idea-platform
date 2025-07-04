"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Share2, User, Calendar, GitBranch, Sparkles, Target, Lightbulb, Rocket } from "lucide-react"
import { type Idea, useAppStore } from "@/lib/store"
import type { IdeaWithUser } from "@/types/database"
import { toggleLike, getUserLikeStatus } from "@/lib/supabase/actions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface SwipeCardProps {
  idea: Idea | IdeaWithUser
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
  onLikeUpdate?: (ideaId: string, liked: boolean, newCount: number) => void
}

export function SwipeCard({ idea, onSwipeLeft, onSwipeRight, className, onLikeUpdate }: SwipeCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [currentLikeStatus, setCurrentLikeStatus] = useState(false)
  const { user, likeIdea } = useAppStore()
  const router = useRouter()

  const getStatusColor = (status: Idea["status"]) => {
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

  const getStatusLabel = (status: Idea["status"]) => {
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

  const { toast } = useToast()
  const [isLiking, setIsLiking] = useState(false)

  // データ形式の違いに対応
  const isSupabaseIdea = 'users' in idea

  // いいね状態を取得
  useEffect(() => {
    if (user && isSupabaseIdea) {
      getUserLikeStatus(idea.id, user.address).then(({ liked }) => {
        setCurrentLikeStatus(liked)
      })
    }
  }, [idea.id, user, isSupabaseIdea])

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "エラー",
        description: "ログインが必要です",
        variant: "destructive",
      })
      return
    }
    
    setIsLiking(true)
    try {
      if (isSupabaseIdea) {
        console.log('Attempting to toggle like for Supabase idea:', { ideaId: idea.id, userAddress: user.address })
        
        try {
          const result = await toggleLike(idea.id, user.address)
          setCurrentLikeStatus(result.liked)
          
          // 親コンポーネントに更新を通知
          if (onLikeUpdate && 'likesCount' in result) {
            onLikeUpdate(idea.id, result.liked, result.likesCount)
          }
          
          toast({
            title: "✨ いいね更新",
            description: result.liked ? "いいねしました" : "いいねを取り消しました",
          })
        } catch (supabaseError) {
          console.warn('Supabase like failed, falling back to local store:', supabaseError)
          // Supabase に失敗した場合はローカルストレージにフォールバック
          likeIdea(idea.id, user.address)
          setCurrentLikeStatus(!currentLikeStatus)
          
          toast({
            title: "✨ いいね (ローカル)",
            description: "いいねしました（ローカル保存）",
          })
        }
      } else {
        likeIdea(idea.id, user.address)
        toast({
          title: "✨ いいね",
          description: "いいねしました",
        })
      }
    } catch (error) {
      console.error('Like error raw:', error)
      console.error('Like error type:', typeof error)
      console.error('Like error constructor:', error?.constructor?.name)
      
      const errorMessage = error instanceof Error ? error.message : 'いいねの更新に失敗しました'
      console.error('SwipeCard like error details:', {
        errorMessage,
        errorString: String(error),
        errorJSON: JSON.stringify(error),
        ideaId: idea.id,
        userAddress: user?.address,
        isSupabaseIdea,
        hasUser: !!user
      })
      
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  const handleCardClick = () => {
    router.push(`/idea/${idea.id}`)
  }

  // スワイプ機能のイベントハンドラー
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // 左クリックのみ
    setIsDragging(true)
    const startX = e.clientX
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      setDragOffset(deltaX)
    }
    
    const handleMouseUp = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      setIsDragging(false)
      setDragOffset(0)
      
      if (Math.abs(deltaX) > 100) {
        if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        } else if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        }
      }
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // タッチイベントハンドラー
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    const startX = e.touches[0].clientX
    
    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - startX
      setDragOffset(deltaX)
    }
    
    const handleTouchEnd = (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - startX
      setIsDragging(false)
      setDragOffset(0)
      
      if (Math.abs(deltaX) > 100) {
        if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        } else if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        }
      }
      
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
    
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }

  // いいね状態の取得
  const isLiked = user ? (isSupabaseIdea ? currentLikeStatus : (idea as Idea).likedBy.includes(user.address)) : false
  const likesCount = isSupabaseIdea ? (idea as IdeaWithUser).likes_count : (idea as Idea).likes
  const authorNickname = isSupabaseIdea ? (idea as IdeaWithUser).users.nickname || 'Anonymous' : (idea as Idea).authorNickname
  const whyText = isSupabaseIdea ? (idea as IdeaWithUser).why_description : (idea as Idea).why
  const whatText = isSupabaseIdea ? (idea as IdeaWithUser).what_description : (idea as Idea).what

  return (
    <Card
      className={cn(
        "w-full cursor-pointer transition-all duration-300 flex flex-col h-full",
        "bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950",
        "border-0 shadow-xl hover:shadow-2xl",
        "backdrop-blur-sm",
        isDragging && "scale-105",
        className,
      )}
      style={{
        transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.1}deg) perspective(1000px)`,
        boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.1)",
      }}
      onClick={!isDragging ? handleCardClick : undefined}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Status Badge - Floating Design */}
      <div className="absolute -top-3 -right-3 z-10">
        <Badge className={cn(getStatusColor(idea.status), "shadow-lg px-4 py-1.5 font-medium")}>
          {getStatusLabel(idea.status)}
        </Badge>
      </div>

      <CardHeader className="pb-4 pt-6">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent leading-tight line-clamp-2">
              {idea.title}
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 flex flex-col">
        {/* Target Section with Icon */}
        <div className="group">
          <div className="flex items-center gap-2 mb-1.5">
            <Target className="w-4 h-4 text-purple-500" />
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Target</p>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 pl-6 line-clamp-1">{idea.target}</p>
        </div>

        {/* Why Section with Icon */}
        <div className="group">
          <div className="flex items-center gap-2 mb-1.5">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Why</p>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 pl-6 line-clamp-2">{whyText}</p>
        </div>

        {/* What Section with Icon */}
        {whatText && (
          <div className="group">
            <div className="flex items-center gap-2 mb-1.5">
              <Rocket className="w-4 h-4 text-green-500" />
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">What</p>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 pl-6 line-clamp-2">{whatText}</p>
          </div>
        )}

        {/* Author and Date - Modern Design */}
        <div className="flex items-center justify-between pt-3 mt-auto border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-md">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{authorNickname}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(isSupabaseIdea ? (idea as IdeaWithUser).created_at : (idea as Idea).createdAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>

          {idea.githubRepo && (
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <GitBranch className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          )}
        </div>

        {/* Interaction Buttons - Modern Design */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isLiking}
              onClick={(e) => {
                e.stopPropagation()
                handleLike()
              }}
              className={cn(
                "group relative overflow-hidden rounded-full px-4 py-2 transition-all",
                isLiked ? "bg-red-50 dark:bg-red-950" : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <div className="flex items-center gap-2">
                <Heart className={cn(
                  "w-4 h-4 transition-all",
                  isLiked ? "fill-red-500 text-red-500" : "group-hover:scale-110"
                )} />
                <span className={cn(
                  "font-medium",
                  isLiked ? "text-red-600" : "text-gray-700 dark:text-gray-300"
                )}>{likesCount}</span>
              </div>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden rounded-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-all" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {isSupabaseIdea ? (idea as IdeaWithUser).comments_count : (idea as Idea).comments.length}
                </span>
              </div>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
