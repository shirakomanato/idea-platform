"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Share2, User, Calendar, GitBranch } from "lucide-react"
import { type Idea, useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface SwipeCardProps {
  idea: Idea
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
}

export function SwipeCard({ idea, onSwipeLeft, onSwipeRight, className }: SwipeCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
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

  const handleLike = () => {
    if (user) {
      likeIdea(idea.id, user.address)
    }
  }

  const handleCardClick = () => {
    router.push(`/idea/${idea.id}`)
  }

  const isLiked = user ? idea.likedBy.includes(user.address) : false

  return (
    <Card
      className={cn(
        "w-full max-w-sm mx-auto cursor-pointer transition-all duration-200 hover:shadow-lg",
        isDragging && "scale-105",
        className,
      )}
      style={{
        transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.1}deg)`,
      }}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge className={getStatusColor(idea.status)}>{getStatusLabel(idea.status)}</Badge>
          {idea.githubRepo && <GitBranch className="w-4 h-4 text-muted-foreground" />}
        </div>
        <h3 className="text-lg font-semibold line-clamp-2">{idea.title}</h3>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Target</p>
            <p className="text-sm line-clamp-2">{idea.target}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Why</p>
            <p className="text-sm line-clamp-3">{idea.why}</p>
          </div>

          {idea.what && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">What</p>
              <p className="text-sm line-clamp-2">{idea.what}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
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
              onClick={(e) => {
                e.stopPropagation()
                handleLike()
              }}
              className={cn("flex items-center space-x-1", isLiked && "text-red-500")}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              <span>{idea.likes}</span>
            </Button>

            <Button variant="ghost" size="sm" className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>{idea.comments.length}</span>
            </Button>
          </div>

          <Button variant="ghost" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
