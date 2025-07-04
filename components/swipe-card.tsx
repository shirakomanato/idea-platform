"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Share2, User, Calendar, Lightbulb, Target, Rocket, Zap, TrendingUp } from "lucide-react"
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

  const getStatusConfig = (status: Idea["status"]) => {
    switch (status) {
      case "idea":
        return { 
          color: "bg-blue-50 text-google-blue border-blue-200", 
          icon: Lightbulb,
          label: "💡 アイデア"
        }
      case "pre-draft":
        return { 
          color: "bg-yellow-50 text-accent border-yellow-200", 
          icon: Target,
          label: "📝 プリドラフト"
        }
      case "draft":
        return { 
          color: "bg-blue-50 text-primary border-blue-200", 
          icon: Rocket,
          label: "🚀 ドラフト"
        }
      case "commit":
        return { 
          color: "bg-purple-50 text-purple-600 border-purple-200", 
          icon: Zap,
          label: "⚡ コミット"
        }
      case "in-progress":
        return { 
          color: "bg-orange-50 text-orange-600 border-orange-200", 
          icon: TrendingUp,
          label: "🔄 進行中"
        }
      case "test":
        return { 
          color: "bg-green-50 text-secondary border-green-200", 
          icon: Target,
          label: "🧪 テスト"
        }
      case "finish":
        return { 
          color: "bg-emerald-50 text-emerald-600 border-emerald-200", 
          icon: Target,
          label: "✅ 完了"
        }
      case "archive":
        return { 
          color: "bg-gray-50 text-google-gray border-gray-200", 
          icon: Target,
          label: "📁 アーカイブ"
        }
      default:
        return { 
          color: "bg-gray-50 text-google-gray border-gray-200", 
          icon: Lightbulb,
          label: "💡 アイデア"
        }
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

  const statusConfig = getStatusConfig(idea.status)
  const StatusIcon = statusConfig.icon
  
  return (
    <Card
      className={cn(
        "group relative w-full cursor-pointer transition-all duration-500 ease-out flex flex-col h-full overflow-hidden",
        "bg-white border border-gray-200/60 shadow-google hover:shadow-google-hover",
        "hover:scale-[1.02] active:scale-[0.98]",
        isDragging && "scale-105 rotate-1",
        className,
      )}
      style={{
        transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
      }}
      onClick={!isDragging ? handleCardClick : undefined}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Status Badge - Google Style */}
      <div className="absolute top-4 right-4 z-10">
        <Badge className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs border",
          "backdrop-blur-sm transition-all duration-300",
          statusConfig.color
        )}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </Badge>
      </div>
      
      {/* Gradient overlay for visual depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/[0.02] pointer-events-none" />

      <CardHeader className="pb-3 pt-6 pr-20">
        <div className="space-y-3">
          {/* Title with Google-style typography */}
          <h3 className="text-xl font-semibold text-gray-900 leading-tight line-clamp-2 group-hover:text-google-blue transition-colors duration-300">
            {idea.title}
          </h3>
          
          {/* Target section with subtle styling */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-google-blue animate-pulse" />
            <p className="text-sm font-medium text-google-gray line-clamp-1">{idea.target}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col px-6">
        {/* Why section - Google Material style */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-google-yellow/10 flex items-center justify-center">
              <Lightbulb className="w-3 h-3 text-google-yellow" />
            </div>
            <span className="text-xs font-semibold text-google-yellow uppercase tracking-wide">Why</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 pl-8">{whyText}</p>
        </div>

        {/* What section - if available */}
        {whatText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-google-green/10 flex items-center justify-center">
                <Rocket className="w-3 h-3 text-google-green" />
              </div>
              <span className="text-xs font-semibold text-google-green uppercase tracking-wide">What</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 pl-8">{whatText}</p>
          </div>
        )}
        
        {/* Spacer for better layout */}
        <div className="flex-1" />

        {/* Author and Date - Google Material style */}
        <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-google-blue to-google-green flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{authorNickname}</p>
              <p className="text-xs text-google-gray">
                {new Date(isSupabaseIdea ? (idea as IdeaWithUser).created_at : (idea as Idea).createdAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>
        </div>

        {/* Interaction Buttons - Google Material style */}
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-1">
            {/* Like button */}
            <Button
              variant="ghost"
              size="sm"
              disabled={isLiking}
              onClick={(e) => {
                e.stopPropagation()
                handleLike()
              }}
              className={cn(
                "group relative h-9 px-3 rounded-full transition-all duration-300",
                isLiked 
                  ? "bg-google-red/10 text-google-red hover:bg-google-red/15" 
                  : "text-google-gray hover:bg-gray-100 hover:text-google-red"
              )}
            >
              <div className="flex items-center gap-2">
                <Heart className={cn(
                  "w-4 h-4 transition-all duration-300",
                  isLiked ? "fill-current scale-110" : "group-hover:scale-110"
                )} />
                <span className="font-medium text-sm">{likesCount}</span>
              </div>
            </Button>

            {/* Comment button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-full text-google-gray hover:bg-gray-100 hover:text-google-blue transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-medium text-sm">
                  {isSupabaseIdea ? (idea as IdeaWithUser).comments_count : (idea as Idea).comments.length}
                </span>
              </div>
            </Button>
          </div>

          {/* Share button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-full text-google-gray hover:bg-gray-100 hover:text-google-blue transition-all duration-300"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
      
      {/* Subtle bottom gradient for visual enhancement */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-google-blue via-google-green to-google-yellow opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
    </Card>
  )
}
