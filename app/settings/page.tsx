"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, User, Bell, Palette, Shield, Save, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { useProtectedRoute } from "@/hooks/useProtectedRoute"
import { BottomNavigation } from "@/components/bottom-navigation"
import { updateUserProfile, checkNicknameAvailability } from "@/lib/supabase/profile-actions"

function SettingsContent() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, setUser } = useAppStore()
  const { isAuthenticated, isLoading } = useProtectedRoute()
  
  // フォーム状態
  const [formData, setFormData] = useState({
    nickname: "",
    bio: "",
    email: "",
    notifications: {
      likes: true,
      comments: true,
      mentions: true,
      newsletter: false
    },
    privacy: {
      profilePublic: true,
      showActivity: true,
      allowDirectMessages: true
    }
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        nickname: user.nickname || "",
        bio: user.bio || "",
        // 他の設定は必要に応じて追加
      }))
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-google-blue" />
          <p className="text-sm text-google-gray">設定を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const handleSave = async () => {
    setIsSaving(true)
    let updates: any = {}
    
    try {
      if (!user) {
        throw new Error("ユーザー情報がありません")
      }

      // ニックネームのバリデーション
      if (formData.nickname) {
        // 長さチェック
        if (formData.nickname.length > 50) {
          toast({
            title: "ニックネームエラー",
            description: "ニックネームは50文字以内で入力してください",
            variant: "destructive",
          })
          return
        }
        
        // 文字種チェック（英数字、ひらがな、カタカナ、漢字、一部記号のみ）
        const validNicknameRegex = /^[a-zA-Z0-9ひらがなカタカナ漢字\-_\s]+$/u
        if (!validNicknameRegex.test(formData.nickname)) {
          toast({
            title: "ニックネームエラー",
            description: "ニックネームに使用できない文字が含まれています",
            variant: "destructive",
          })
          return
        }
      }

      // ニックネームの重複チェック（変更がある場合のみ）
      if (formData.nickname && formData.nickname !== user.nickname) {
        const { available } = await checkNicknameAvailability(formData.nickname, user.address)
        if (!available) {
          toast({
            title: "ニックネームエラー",
            description: "このニックネームは既に使用されています",
            variant: "destructive",
          })
          return
        }
      }

      // Supabaseにプロフィール更新を送信
      if (formData.nickname !== user.nickname) {
        updates.nickname = formData.nickname || null
      }
      if (formData.bio !== (user.bio || "")) {
        updates.bio = formData.bio || null
      }

      console.log('Prepared updates:', updates)

      // 更新が必要な項目がある場合のみSupabaseに送信
      if (Object.keys(updates).length > 0) {
        console.log('Calling updateUserProfile with:', { address: user.address, updates })
        const updatedUser = await updateUserProfile(user.address, updates)
        
        // ローカルストレージのユーザー情報も更新
        setUser({
          ...user,
          ...updates,
          id: updatedUser.id
        })

        // キャッシュクリア: ニックネーム変更時は関連データをリフレッシュ
        if (updates.nickname) {
          // ローカルストレージのコメントキャッシュをクリア
          const cacheKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('comments_') || key.startsWith('ideas_cache_')
          )
          cacheKeys.forEach(key => localStorage.removeItem(key))
          console.log('Cleared cache keys due to nickname change:', cacheKeys)
        }

        console.log('User profile updated successfully:', updatedUser)
      }
      
      toast({
        title: "設定を保存しました",
        description: "変更が正常に保存されました",
      })
    } catch (error) {
      console.error('Settings save error details:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorString: String(error),
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        userAddress: user?.address,
        formData,
        updates
      })
      
      let errorMessage = "設定の保存に失敗しました"
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = error.message || error.error_description || error.msg || "設定の保存に失敗しました"
      }
      
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev],
        [field]: value
      }
    }))
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Google-style Header */}
      <div className="sticky top-0 z-40 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 bg-google-gradient rounded-full flex items-center justify-center shadow-google">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-google-blue rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-gray-900">設定</h1>
              <p className="text-xs text-google-gray font-medium">アカウント設定</p>
            </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-google-blue hover:bg-google-blue/90 text-white shadow-google hover:shadow-google-hover transition-all duration-300 rounded-full px-4"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center p-6 pb-24">
        <div className="w-full max-w-md space-y-6">
          
          {/* Profile Settings */}
          <Card className="bg-white border border-gray-200/60 shadow-google">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-google-blue" />
                プロフィール設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium text-gray-900">
                  ニックネーム
                </Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange("nickname", e.target.value)}
                  placeholder="ニックネームを入力"
                  className="border-gray-200 focus:border-google-blue focus:ring-google-blue/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium text-gray-900">
                  自己紹介
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="自己紹介を入力（任意）"
                  rows={3}
                  className="border-gray-200 focus:border-google-blue focus:ring-google-blue/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                  メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="メールアドレス（任意）"
                  className="border-gray-200 focus:border-google-blue focus:ring-google-blue/20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-white border border-gray-200/60 shadow-google">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-google-yellow" />
                通知設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">いいね通知</p>
                  <p className="text-sm text-google-gray">アイデアにいいねがついた時</p>
                </div>
                <Switch
                  checked={formData.notifications.likes}
                  onCheckedChange={(checked) => handleNestedChange("notifications", "likes", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">コメント通知</p>
                  <p className="text-sm text-google-gray">アイデアにコメントがついた時</p>
                </div>
                <Switch
                  checked={formData.notifications.comments}
                  onCheckedChange={(checked) => handleNestedChange("notifications", "comments", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">メンション通知</p>
                  <p className="text-sm text-google-gray">メンションされた時</p>
                </div>
                <Switch
                  checked={formData.notifications.mentions}
                  onCheckedChange={(checked) => handleNestedChange("notifications", "mentions", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">ニュースレター</p>
                  <p className="text-sm text-google-gray">週次の活動サマリー</p>
                </div>
                <Switch
                  checked={formData.notifications.newsletter}
                  onCheckedChange={(checked) => handleNestedChange("notifications", "newsletter", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card className="bg-white border border-gray-200/60 shadow-google">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-google-green" />
                プライバシー設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">公開プロフィール</p>
                  <p className="text-sm text-google-gray">他のユーザーがプロフィールを閲覧可能</p>
                </div>
                <Switch
                  checked={formData.privacy.profilePublic}
                  onCheckedChange={(checked) => handleNestedChange("privacy", "profilePublic", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">活動状況の表示</p>
                  <p className="text-sm text-google-gray">最近の活動を他のユーザーに表示</p>
                </div>
                <Switch
                  checked={formData.privacy.showActivity}
                  onCheckedChange={(checked) => handleNestedChange("privacy", "showActivity", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">ダイレクトメッセージ</p>
                  <p className="text-sm text-google-gray">他のユーザーからのメッセージを受信</p>
                </div>
                <Switch
                  checked={formData.privacy.allowDirectMessages}
                  onCheckedChange={(checked) => handleNestedChange("privacy", "allowDirectMessages", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Wallet Info */}
          <Card className="bg-gradient-to-br from-google-lightGray/30 to-google-lightGray/50 border border-gray-200/60 shadow-google">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-google-red" />
                ウォレット情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">接続済みウォレット</p>
                <p className="text-sm text-google-gray font-mono bg-white px-3 py-2 rounded-lg border">
                  {user.address.slice(0, 8)}...{user.address.slice(-8)}
                </p>
                <p className="text-xs text-google-gray">
                  ウォレットの切断は「ログアウト」から行えます
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-google-blue" />
          <p className="text-sm text-google-gray">読み込み中...</p>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}