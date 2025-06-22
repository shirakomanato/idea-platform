"use client"

import { useEffect, useState, Suspense } from "react"
import { useAppStore } from "@/lib/store"
import { SwipeCard } from "@/components/swipe-card"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { useIdeas } from "@/lib/supabase/hooks"
import { useToast } from "@/hooks/use-toast"
import { getEmpathizedIdeas } from "@/lib/supabase/actions"
import type { IdeaWithUser } from "@/types/database"

function EmpathizedContent() {
  const { user } = useAppStore()
  const { ideas: allIdeas, loading, error } = useIdeas()
  const router = useRouter()
  const { toast } = useToast()
  const [empathizedIdeas, setEmpathizedIdeas] = useState<string[]>([])
  const [filteredIdeas, setFilteredIdeas] = useState<IdeaWithUser[]>([])

  useEffect(() => {
    if (!user) {
      router.push("/connect")
      return
    }

    // ユーザーが共感したアイデアIDを取得
    const empathizedIds = getEmpathizedIdeas(user.address)
    console.log('Loading empathized ideas for user:', user.address, empathizedIds)
    setEmpathizedIdeas(empathizedIds)
  }, [user, router])

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-sm text-muted-foreground">共感済みアイデアを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <Heart className="w-5 h-5 text-red-500" />
          <h1 className="text-lg font-semibold">共感したアイデア</h1>
        </div>
        
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 pb-20">
        {filteredIdeas.length > 0 ? (
          <div className="grid gap-6 max-w-2xl mx-auto">
            {filteredIdeas.map((idea) => (
              <SwipeCard
                key={idea.id}
                idea={idea}
                className="hover:scale-105 transition-transform duration-200"
              />
            ))}
          </div>
        ) : (
          <Card className="w-full max-w-sm mx-auto mt-12">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Heart className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">共感したアイデアがありません</h3>
              <p className="text-muted-foreground mb-4">アイデアに共感すると、ここで追跡できるようになります。</p>
              <Button onClick={() => router.push("/dashboard")}>
                アイデアを見る
              </Button>
            </CardContent>
          </Card>
        )}
        
        {filteredIdeas.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {filteredIdeas.length}個のアイデアに共感しています
            </p>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    }>
      <EmpathizedContent />
    </Suspense>
  )
}