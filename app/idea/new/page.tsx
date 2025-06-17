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
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

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
      const prompt = `
以下のアイデアの情報を基に、What（何を作るか）、How（どのように実現するか）、Impact（期待される効果）を提案してください。

タイトル: ${formData.title}
ターゲット: ${formData.target}
Why（なぜ必要か）: ${formData.why}

以下の形式で回答してください：
What: [具体的なソリューション]
How: [実現方法・技術スタック]
Impact: [期待される効果・数値目標]
`

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
      })

      // AIの回答をパース
      const lines = text.split("\n")
      const whatMatch = lines.find((line) => line.startsWith("What:"))
      const howMatch = lines.find((line) => line.startsWith("How:"))
      const impactMatch = lines.find((line) => line.startsWith("Impact:"))

      setFormData((prev) => ({
        ...prev,
        what: whatMatch ? whatMatch.replace("What:", "").trim() : prev.what,
        how: howMatch ? howMatch.replace("How:", "").trim() : prev.how,
        impact: impactMatch ? impactMatch.replace("Impact:", "").trim() : prev.impact,
      }))

      toast({
        title: "AI生成完了",
        description: "アイデアの詳細が生成されました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "AI生成に失敗しました",
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
      addIdea({
        ...formData,
        author: user.address,
        authorNickname: user.nickname || `User_${user.address.slice(-4)}`,
        likes: 0,
        likedBy: [],
        comments: [],
        status: "idea",
      })

      toast({
        title: "投稿完了",
        description: "アイデアが投稿されました",
      })

      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "エラー",
        description: "投稿に失敗しました",
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
