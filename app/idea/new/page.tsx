"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { IdeaInsert } from "@/types/database"

export default function NewIdeaPage() {
  const [formData, setFormData] = useState({
    title: "",
    target: "",
    why: "",
    what: "",
    how: "",
    impact: "",
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { user, addIdea } = useAppStore()
  const router = useRouter()
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const generateWithAI = async () => {
    if (!formData.title || !formData.target || !formData.why) {
      toast({
        title: "エラー",
        description: "タイトル、ターゲット、Whyを入力してください",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          target: formData.target,
          why: formData.why,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'AI生成に失敗しました')
      }

      if (result.success && result.data) {
        setFormData((prev) => ({
          ...prev,
          what: result.data.what || prev.what,
          how: result.data.how || prev.how,
          impact: result.data.impact || prev.impact,
        }))

        toast({
          title: "🤖 AI生成完了",
          description: "アイデアの詳細が生成されました",
        })
      } else {
        throw new Error('生成されたデータが不正です')
      }
    } catch (error) {
      console.error('AI生成エラー:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "AI生成に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "エラー",
        description: "ログインが必要です",
        variant: "destructive",
      })
      return
    }

    if (!formData.title || !formData.target || !formData.why) {
      toast({
        title: "エラー",
        description: "必須項目を入力してください",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // まずローカルストアに追加（確実に動作させるため）
      addIdea({
        ...formData,
        author: user.address,
        authorNickname: user.nickname || `User_${user.address.slice(-4)}`,
        likes: 0,
        likedBy: [],
        comments: [],
        status: "idea",
      })

      // Supabaseにも保存を試す
      try {
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        
        const supabase = createClient()
        
        // Supabaseが設定されていない場合はスキップ
        if (!supabase) {
          console.warn('Supabase not configured, saved to local store only')
          toast({
            title: "投稿完了",
            description: "アイデアが投稿されました（ローカルモード）",
          })
          router.push("/dashboard")
          return
        }
        
        // ユーザーコンテキストを設定
        try {
          await supabase.rpc('set_current_user_wallet', { 
            wallet_address: user.address 
          })
        } catch (rpcError) {
          console.warn('RPC function error:', rpcError)
        }

        // Supabaseにアイデアを保存
        const ideaData: IdeaInsert = {
          user_id: user.id === user.address ? null : user.id, // ウォレットアドレスと同じ場合はnull
          wallet_address: user.address,
          title: formData.title,
          target: formData.target,
          why_description: formData.why,
          what_description: formData.what || '',
          how_description: formData.how || '',
          impact_description: formData.impact || '',
          status: 'idea'
        }

        const { data, error } = await supabase
          .from('ideas')
          .insert(ideaData)
          .select()
          .single()

        if (error) {
          console.warn('Supabase save error:', error)
          console.warn('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
        } else {
          console.log('Successfully saved to Supabase:', data)
        }
      } catch (dbError) {
        console.warn('Database error, idea saved locally only:', dbError)
      }

      toast({
        title: "投稿完了",
        description: "アイデアが投稿されました",
      })

      router.push("/dashboard")
    } catch (error: unknown) {
      console.error('Idea creation error:', error)
      
      let errorMessage = "投稿に失敗しました"
      
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('Error details:', error)
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
        console.error('Error object:', error)
      }
      
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">新しいアイデア</h1>
        <div className="w-10" />
      </div>

      {/* Form */}
      <div className="p-4 pb-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span>アイデアを投稿</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル *</Label>
              <Input
                id="title"
                placeholder="アイデアのタイトルを入力"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">ターゲット *</Label>
              <Input
                id="target"
                placeholder="誰のためのアイデアか"
                value={formData.target}
                onChange={(e) => handleInputChange("target", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="why">Why（なぜ必要か） *</Label>
              <Textarea
                id="why"
                placeholder="なぜこのアイデアが必要なのか"
                value={formData.why}
                onChange={(e) => handleInputChange("why", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-center">
              <Button
                onClick={generateWithAI}
                disabled={isGenerating || !formData.title || !formData.target || !formData.why}
                variant="outline"
                className="flex items-center space-x-2"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>AIで詳細を生成</span>
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="what">What（何を作るか）</Label>
              <Textarea
                id="what"
                placeholder="具体的なソリューション"
                value={formData.what}
                onChange={(e) => handleInputChange("what", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="how">How（どのように実現するか）</Label>
              <Textarea
                id="how"
                placeholder="実現方法・技術スタック"
                value={formData.how}
                onChange={(e) => handleInputChange("how", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="impact">Impact（期待される効果）</Label>
              <Textarea
                id="impact"
                placeholder="期待される効果・数値目標"
                value={formData.impact}
                onChange={(e) => handleInputChange("impact", e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-12">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  投稿中...
                </>
              ) : (
                "アイデアを投稿"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
