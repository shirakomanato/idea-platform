"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  Zap, 
  Clock, 
  Users, 
  ArrowRight, 
  Play, 
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { AutoProgressionService, type ProgressionStats, type AutoProgressionResult } from '@/lib/services/auto-progression-service'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function ProgressionTracker() {
  const [stats, setStats] = useState<ProgressionStats | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)
  const [lastResult, setLastResult] = useState<AutoProgressionResult | null>(null)
  const { toast } = useToast()
  const { user } = useAppStore()

  const autoProgressionService = new AutoProgressionService()

  useEffect(() => {
    loadStats()
    
    // 5分ごとに統計を更新
    const interval = setInterval(loadStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      const progressionStats = await autoProgressionService.getProgressionStats()
      setStats(progressionStats)
    } catch (error) {
      console.error('Error loading progression stats:', error)
    }
  }

  const runAutoProgression = async () => {
    if (isRunning) return

    setIsRunning(true)
    try {
      const result = await autoProgressionService.runAutoProgression()
      setLastResult(result)
      setLastRun(new Date())

      if (result.success) {
        const totalActions = result.promotions.length + result.delegations.length
        
        if (totalActions > 0) {
          toast({
            title: "🚀 自動進行完了",
            description: `${result.promotions.length}件の昇格、${result.delegations.length}件の委譲を実行しました`,
          })
        } else {
          toast({
            title: "✅ チェック完了",
            description: "現在進行可能なアイデアはありません",
          })
        }
      } else {
        toast({
          title: "⚠️ 自動進行エラー",
          description: result.errors.join(', '),
          variant: "destructive",
        })
      }

      // 統計を更新
      await loadStats()
    } catch (error) {
      console.error('Error running auto progression:', error)
      toast({
        title: "エラー",
        description: "自動進行の実行に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'idea': 'bg-blue-100 text-blue-800',
      'pre-draft': 'bg-purple-100 text-purple-800',
      'draft': 'bg-indigo-100 text-indigo-800',
      'commit': 'bg-green-100 text-green-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'test': 'bg-orange-100 text-orange-800',
      'finish': 'bg-emerald-100 text-emerald-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatTime = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計概要 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>プログレッション統計</span>
              </CardTitle>
              <CardDescription>
                アイデアの自動進行システムの状況
              </CardDescription>
            </div>
            <Button 
              onClick={runAutoProgression}
              disabled={isRunning}
              className="flex items-center space-x-2"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isRunning ? '実行中...' : '手動実行'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalIdeas}</div>
              <div className="text-sm text-muted-foreground">総アイデア数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.progressionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">進行率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.finishStage}</div>
              <div className="text-sm text-muted-foreground">完成済み</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.inProgressStage}</div>
              <div className="text-sm text-muted-foreground">開発中</div>
            </div>
          </div>

          {/* プログレスバー */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>全体進行度</span>
              <span className="font-medium">{stats.progressionRate.toFixed(1)}%</span>
            </div>
            <Progress 
              value={stats.progressionRate} 
              className="h-3" 
              variant="gradient"
              showPercentage={false}
            />
            <div className="text-xs text-muted-foreground text-center">
              {stats.progressionRate >= 75 ? "🎉 素晴らしい進行率です！" :
               stats.progressionRate >= 50 ? "📈 順調に進行中" :
               stats.progressionRate >= 25 ? "🚀 まだまだこれから" :
               "💡 アイデアを育てていきましょう"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ステータス分布 */}
      <Card>
        <CardHeader>
          <CardTitle>ステータス分布</CardTitle>
          <CardDescription>各段階のアイデア数</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'ideaStage', label: 'アイデア', status: 'idea' },
              { key: 'preDraftStage', label: 'プリドラフト', status: 'pre-draft' },
              { key: 'draftStage', label: 'ドラフト', status: 'draft' },
              { key: 'commitStage', label: 'コミット', status: 'commit' },
              { key: 'inProgressStage', label: '進行中', status: 'in-progress' },
              { key: 'testStage', label: 'テスト', status: 'test' },
              { key: 'finishStage', label: '完成', status: 'finish' }
            ].map(({ key, label, status }) => {
              const count = stats[key as keyof ProgressionStats] as number
              const percentage = stats.totalIdeas > 0 ? (count / stats.totalIdeas) * 100 : 0
              
              return (
                <div key={key} className="p-3 rounded-lg border space-y-2">
                  <div className="text-center">
                    <Badge className={getStatusColor(status)} variant="outline">
                      {label}
                    </Badge>
                    <div className="text-xl font-bold mt-2">{count}</div>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-1"
                    indicatorClassName={cn(
                      status === 'finish' ? 'bg-emerald-500' :
                      status === 'test' ? 'bg-orange-500' :
                      status === 'in-progress' ? 'bg-yellow-500' :
                      status === 'commit' ? 'bg-green-500' :
                      status === 'draft' ? 'bg-indigo-500' :
                      status === 'pre-draft' ? 'bg-purple-500' :
                      'bg-blue-500'
                    )}
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 最後の実行結果 */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {lastResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span>最後の実行結果</span>
            </CardTitle>
            {lastRun && (
              <CardDescription>
                {formatTime(lastRun)} に実行
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 昇格 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center space-x-2">
                  <ArrowRight className="w-4 h-4" />
                  <span>昇格 ({lastResult.promotions.length}件)</span>
                </h4>
                <div className="space-y-2">
                  {lastResult.promotions.length > 0 ? (
                    lastResult.promotions.map((promotion, index) => (
                      <div key={index} className="p-2 bg-green-50 rounded-lg text-sm">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(promotion.fromStatus)} variant="outline">
                            {promotion.fromStatus}
                          </Badge>
                          <ArrowRight className="w-3 h-3" />
                          <Badge className={getStatusColor(promotion.toStatus)}>
                            {promotion.toStatus}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {promotion.reason}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">昇格なし</div>
                  )}
                </div>
              </div>

              {/* 委譲 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>委譲 ({lastResult.delegations.length}件)</span>
                </h4>
                <div className="space-y-2">
                  {lastResult.delegations.length > 0 ? (
                    lastResult.delegations.map((delegation, index) => (
                      <div key={index} className="p-2 bg-blue-50 rounded-lg text-sm">
                        <div className="font-medium">委譲リクエスト作成</div>
                        <div className="text-xs text-muted-foreground">
                          {delegation.reason}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">委譲なし</div>
                  )}
                </div>
              </div>
            </div>

            {/* エラー */}
            {lastResult.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">エラー</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {lastResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// プログレッション状況を表示する小さなウィジェット
export function ProgressionWidget() {
  const [stats, setStats] = useState<ProgressionStats | null>(null)
  const autoProgressionService = new AutoProgressionService()

  useEffect(() => {
    const loadStats = async () => {
      try {
        const progressionStats = await autoProgressionService.getProgressionStats()
        setStats(progressionStats)
      } catch (error) {
        console.error('Error loading progression stats:', error)
      }
    }

    loadStats()
    const interval = setInterval(loadStats, 10 * 60 * 1000) // 10分ごと
    return () => clearInterval(interval)
  }, [])

  if (!stats) return null

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">自動進行</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {stats.progressionRate.toFixed(0)}%
          </Badge>
        </div>
        <div className="mt-2">
          <Progress 
            value={stats.progressionRate} 
            className="h-1.5" 
            variant="striped"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{stats.totalIdeas}件のアイデア</span>
          <span>{stats.finishStage}件完成</span>
        </div>
      </CardContent>
    </Card>
  )
}