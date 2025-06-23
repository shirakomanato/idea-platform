"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp, Users, Zap, ArrowRight, Eye } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

interface ProgressionStat {
  from_status: string
  to_status: string
  count: number
  trigger_type: string
}

interface StatusDistribution {
  status: string
  count: number
  percentage: number
}

export default function AdminDashboard() {
  const { user } = useAppStore()
  const [progressionStats, setProgressionStats] = useState<ProgressionStat[]>([])
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([])
  const [totalIdeas, setTotalIdeas] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [recentProgressions, setRecentProgressions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!supabase) return

    setLoading(true)
    try {
      // プログレッション統計
      const { data: progressions } = await supabase
        .from('idea_progressions')
        .select('from_status, to_status, trigger_type')

      if (progressions) {
        const stats = progressions.reduce((acc: Record<string, ProgressionStat>, p) => {
          const key = `${p.from_status}-${p.to_status}-${p.trigger_type}`
          if (!acc[key]) {
            acc[key] = {
              from_status: p.from_status || 'unknown',
              to_status: p.to_status,
              trigger_type: p.trigger_type,
              count: 0
            }
          }
          acc[key].count++
          return acc
        }, {})
        
        setProgressionStats(Object.values(stats))
      }

      // ステータス分布
      const { data: ideas } = await supabase
        .from('ideas')
        .select('status')

      if (ideas) {
        setTotalIdeas(ideas.length)
        const statusCounts = ideas.reduce((acc: Record<string, number>, idea) => {
          acc[idea.status] = (acc[idea.status] || 0) + 1
          return acc
        }, {})

        const distribution = Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count: count as number,
          percentage: Math.round((count as number / ideas.length) * 100)
        }))

        setStatusDistribution(distribution)
      }

      // 総ユーザー数
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      setTotalUsers(userCount || 0)

      // 最近のプログレッション
      const { data: recentData } = await supabase
        .from('idea_progressions')
        .select(`
          *,
          ideas!inner(title)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentProgressions(recentData || [])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
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
      'finish': 'bg-emerald-100 text-emerald-800',
      'archive': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">管理ダッシュボード</h1>
            <p className="text-muted-foreground">プログレッション統計とシステム監視</p>
          </div>
          <Button onClick={loadDashboardData} disabled={loading}>
            <TrendingUp className="w-4 h-4 mr-2" />
            更新
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総アイデア数</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalIdeas}</div>
              <p className="text-xs text-muted-foreground">全ステータス合計</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">登録済みユーザー</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">自動プログレッション</CardTitle>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {progressionStats.filter(p => p.trigger_type === 'LIKE_THRESHOLD').reduce((sum, p) => sum + p.count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">いいね閾値による進化</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">進行中アイデア</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statusDistribution.find(s => s.status === 'in-progress')?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">実装フェーズ</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ステータス分布 */}
          <Card>
            <CardHeader>
              <CardTitle>ステータス分布</CardTitle>
              <CardDescription>現在のアイデアのステータス別内訳</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {item.count} 件
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* プログレッション統計 */}
          <Card>
            <CardHeader>
              <CardTitle>プログレッション統計</CardTitle>
              <CardDescription>ステータス遷移の実行回数</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {progressionStats.slice(0, 8).map((stat, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {stat.from_status}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">
                        {stat.to_status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">
                        {stat.trigger_type === 'LIKE_THRESHOLD' ? '自動' : '手動'}
                      </span>
                      <span className="font-medium">{stat.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 最近のプログレッション */}
        <Card>
          <CardHeader>
            <CardTitle>最近のプログレッション</CardTitle>
            <CardDescription>直近のステータス変更履歴</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentProgressions.map((progression) => (
                <div key={progression.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(progression.from_status || 'unknown')} variant="outline">
                        {progression.from_status || 'unknown'}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <Badge className={getStatusColor(progression.to_status)}>
                        {progression.to_status}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{progression.ideas?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {progression.trigger_type === 'LIKE_THRESHOLD' ? 'いいね閾値達成' : progression.trigger_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(progression.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}