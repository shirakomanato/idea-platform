import { createClient } from '@/lib/supabase/client'
import { NotificationService } from './notification-service'
import { DelegationService } from './delegation-service'
import type { Idea, User } from '@/types/database'

export interface ProgressionStats {
  totalIdeas: number
  ideaStage: number
  preDraftStage: number
  draftStage: number
  commitStage: number
  inProgressStage: number
  testStage: number
  finishStage: number
  progressionRate: number
}

export interface AutoProgressionResult {
  success: boolean
  promotions: Array<{
    ideaId: string
    fromStatus: string
    toStatus: string
    reason: string
  }>
  delegations: Array<{
    ideaId: string
    fromUserId: string
    toUserId: string
    reason: string
  }>
  errors: string[]
}

export class AutoProgressionService {
  private supabase = createClient()
  private notificationService = new NotificationService()
  private delegationService = new DelegationService()

  /**
   * すべてのアイデアの自動進行をチェック
   */
  async runAutoProgression(): Promise<AutoProgressionResult> {
    const result: AutoProgressionResult = {
      success: true,
      promotions: [],
      delegations: [],
      errors: []
    }

    if (!this.supabase) {
      result.success = false
      result.errors.push('Supabase client not available')
      return result
    }

    try {
      console.log('🚀 Starting auto-progression check...')

      // 1. アイデアのステータス進行をチェック
      await this.checkIdeaProgressions(result)

      // 2. 非アクティブアイデアの委譲をチェック
      await this.checkInactiveIdeas(result)

      console.log('✅ Auto-progression completed:', result)
      return result
    } catch (error) {
      console.error('❌ Auto-progression failed:', error)
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      return result
    }
  }

  /**
   * アイデアの進行条件をチェックして自動昇格
   */
  private async checkIdeaProgressions(result: AutoProgressionResult): Promise<void> {
    if (!this.supabase) return

    try {
      // 進行可能なアイデアを取得
      const { data: ideas, error } = await this.supabase
        .from('ideas')
        .select('id, title, status, likes_count, user_id, created_at, updated_at')
        .in('status', ['idea', 'pre-draft', 'draft'])

      if (error) {
        result.errors.push(`Failed to fetch ideas: ${error.message}`)
        return
      }

      if (!ideas?.length) return

      // 総ユーザー数を取得
      const { count: totalUsers, error: userError } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (userError) {
        result.errors.push(`Failed to get user count: ${userError.message}`)
        return
      }

      if (!totalUsers || totalUsers === 0) return

      // 各アイデアの進行条件をチェック
      for (const idea of ideas) {
        const promotion = await this.checkSingleIdeaProgression(idea, totalUsers)
        if (promotion) {
          result.promotions.push(promotion)
        }
      }
    } catch (error) {
      result.errors.push(`Error in checkIdeaProgressions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 単一アイデアの進行条件をチェック
   */
  private async checkSingleIdeaProgression(
    idea: Idea, 
    totalUsers: number
  ): Promise<{ ideaId: string; fromStatus: string; toStatus: string; reason: string } | null> {
    const likeRatio = idea.likes_count / totalUsers
    const daysSinceCreation = this.getDaysDifference(new Date(idea.created_at), new Date())
    
    let newStatus: string | null = null
    let reason = ''

    // 進行ルールをチェック
    switch (idea.status) {
      case 'idea':
        if (likeRatio >= 0.3 && idea.likes_count >= 5) {
          newStatus = 'pre-draft'
          reason = `30%いいね率達成 (${(likeRatio * 100).toFixed(1)}%, ${idea.likes_count}いいね)`
        }
        break
      
      case 'pre-draft':
        if (likeRatio >= 0.4 && idea.likes_count >= 10) {
          newStatus = 'draft'
          reason = `40%いいね率達成 (${(likeRatio * 100).toFixed(1)}%, ${idea.likes_count}いいね)`
        }
        break
      
      case 'draft':
        if (likeRatio >= 0.5 && idea.likes_count >= 15) {
          newStatus = 'commit'
          reason = `50%いいね率達成 (${(likeRatio * 100).toFixed(1)}%, ${idea.likes_count}いいね)`
        }
        break
    }

    if (newStatus) {
      const success = await this.promoteIdea(idea.id, idea.status, newStatus, reason)
      if (success) {
        return {
          ideaId: idea.id,
          fromStatus: idea.status,
          toStatus: newStatus,
          reason
        }
      }
    }

    return null
  }

  /**
   * アイデアを次のステータスに昇格
   */
  private async promoteIdea(
    ideaId: string,
    fromStatus: string,
    toStatus: string,
    reason: string
  ): Promise<boolean> {
    if (!this.supabase) return false

    try {
      // ステータスを更新
      const { error: updateError } = await this.supabase
        .from('ideas')
        .update({
          status: toStatus as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', ideaId)

      if (updateError) {
        console.error('Failed to update idea status:', updateError)
        return false
      }

      // プログレッション履歴を記録
      await this.supabase
        .from('idea_progressions')
        .insert({
          idea_id: ideaId,
          from_status: fromStatus,
          to_status: toStatus,
          trigger_type: 'AUTO_PROGRESSION',
          trigger_data: { reason, automated: true }
        })

      // 作者に通知を送信
      await this.sendPromotionNotification(ideaId, fromStatus, toStatus, reason)

      console.log(`✨ Promoted idea ${ideaId}: ${fromStatus} → ${toStatus}`)
      return true
    } catch (error) {
      console.error('Error promoting idea:', error)
      return false
    }
  }

  /**
   * 非アクティブアイデアの委譲をチェック
   */
  private async checkInactiveIdeas(result: AutoProgressionResult): Promise<void> {
    if (!this.supabase) return

    try {
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      // 14日以上更新されていないアイデアを取得
      const { data: inactiveIdeas, error } = await this.supabase
        .from('ideas')
        .select('id, title, user_id, status, updated_at')
        .in('status', ['pre-draft', 'draft'])
        .lt('updated_at', fourteenDaysAgo.toISOString())

      if (error) {
        result.errors.push(`Failed to fetch inactive ideas: ${error.message}`)
        return
      }

      if (!inactiveIdeas?.length) return

      // 各非アクティブアイデアを処理
      for (const idea of inactiveIdeas) {
        const delegation = await this.processDelegation(idea)
        if (delegation) {
          result.delegations.push(delegation)
        }
      }
    } catch (error) {
      result.errors.push(`Error in checkInactiveIdeas: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * アイデアの委譲を処理
   */
  private async processDelegation(
    idea: Idea
  ): Promise<{ ideaId: string; fromUserId: string; toUserId: string; reason: string } | null> {
    if (!idea.user_id) return null

    try {
      // 既存の委譲リクエストがないかチェック
      const { data: existingDelegation } = await this.supabase
        ?.from('idea_delegations')
        .select('*')
        .eq('idea_id', idea.id)
        .eq('status', 'pending')
        .single()

      if (existingDelegation) {
        console.log(`Delegation already exists for idea ${idea.id}`)
        return null
      }

      // 最も貢献度の高いユーザーを見つける
      const topContributor = await this.findTopContributor(idea.id)
      if (!topContributor) {
        console.log(`No suitable contributor found for idea ${idea.id}`)
        return null
      }

      // 委譲リクエストを作成
      const delegationResult = await this.delegationService.createDelegationRequest(
        idea.id,
        idea.user_id,
        topContributor.id,
        'INACTIVITY',
        {
          days_inactive: this.getDaysDifference(new Date(idea.updated_at), new Date()),
          auto_generated: true
        }
      )

      if (delegationResult.success) {
        console.log(`🔄 Created delegation request for idea ${idea.id}`)
        return {
          ideaId: idea.id,
          fromUserId: idea.user_id,
          toUserId: topContributor.id,
          reason: 'Inactivity delegation'
        }
      }

      return null
    } catch (error) {
      console.error('Error processing delegation:', error)
      return null
    }
  }

  /**
   * 最も貢献度の高いユーザーを見つける
   */
  private async findTopContributor(ideaId: string): Promise<User | null> {
    if (!this.supabase) return null

    try {
      // いいねをしたユーザーを取得
      const { data: likes } = await this.supabase
        .from('likes')
        .select(`
          user_id,
          users!inner(id, nickname, wallet_address, avatar_url)
        `)
        .eq('idea_id', ideaId)

      // コメントをしたユーザーを取得
      const { data: comments } = await this.supabase
        .from('comments')
        .select(`
          user_id,
          users!inner(id, nickname, wallet_address, avatar_url)
        `)
        .eq('idea_id', ideaId)

      const contributors: Record<string, { user: User; score: number }> = {}

      // いいね貢献度
      likes?.forEach((like: any) => {
        const userId = like.user_id
        if (!contributors[userId]) {
          contributors[userId] = { user: like.users, score: 0 }
        }
        contributors[userId].score += 1
      })

      // コメント貢献度（より高い重み）
      comments?.forEach((comment: any) => {
        const userId = comment.user_id
        if (!contributors[userId]) {
          contributors[userId] = { user: comment.users, score: 0 }
        }
        contributors[userId].score += 2
      })

      // 最も貢献度の高いユーザーを選択
      const topContributor = Object.values(contributors)
        .sort((a, b) => b.score - a.score)[0]

      return topContributor?.user || null
    } catch (error) {
      console.error('Error finding top contributor:', error)
      return null
    }
  }

  /**
   * 昇格通知を送信
   */
  private async sendPromotionNotification(
    ideaId: string,
    fromStatus: string,
    toStatus: string,
    reason: string
  ): Promise<void> {
    if (!this.supabase) return

    try {
      const { data: idea } = await this.supabase
        .from('ideas')
        .select('title, user_id')
        .eq('id', ideaId)
        .single()

      if (!idea?.user_id) return

      await this.notificationService.createNotification(
        idea.user_id,
        'STATUS_CHANGE',
        '🎉 アイデアが自動昇格しました！',
        `「${idea.title}」が${fromStatus}から${toStatus}に進化しました。${reason}`,
        {
          ideaId: ideaId,
          data: {
            from_status: fromStatus,
            to_status: toStatus,
            reason: reason,
            automated: true
          }
        }
      )
    } catch (error) {
      console.error('Error sending promotion notification:', error)
    }
  }

  /**
   * プログレッション統計を取得
   */
  async getProgressionStats(): Promise<ProgressionStats> {
    const defaultStats: ProgressionStats = {
      totalIdeas: 0,
      ideaStage: 0,
      preDraftStage: 0,
      draftStage: 0,
      commitStage: 0,
      inProgressStage: 0,
      testStage: 0,
      finishStage: 0,
      progressionRate: 0
    }

    if (!this.supabase) return defaultStats

    try {
      const { data: ideas, error } = await this.supabase
        .from('ideas')
        .select('status')

      if (error || !ideas) return defaultStats

      const stats = ideas.reduce((acc, idea) => {
        acc.totalIdeas++
        switch (idea.status) {
          case 'idea': acc.ideaStage++; break
          case 'pre-draft': acc.preDraftStage++; break
          case 'draft': acc.draftStage++; break
          case 'commit': acc.commitStage++; break
          case 'in-progress': acc.inProgressStage++; break
          case 'test': acc.testStage++; break
          case 'finish': acc.finishStage++; break
        }
        return acc
      }, { ...defaultStats })

      // 進行率を計算（最初のステージ以外の割合）
      stats.progressionRate = stats.totalIdeas > 0 
        ? ((stats.totalIdeas - stats.ideaStage) / stats.totalIdeas) * 100
        : 0

      return stats
    } catch (error) {
      console.error('Error getting progression stats:', error)
      return defaultStats
    }
  }

  /**
   * 日数の差を計算
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * 手動でアイデアの進行チェックを実行
   */
  async checkSpecificIdea(ideaId: string): Promise<boolean> {
    if (!this.supabase) return false

    try {
      const { data: idea, error } = await this.supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .single()

      if (error || !idea) return false

      const { count: totalUsers } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (!totalUsers) return false

      const promotion = await this.checkSingleIdeaProgression(idea, totalUsers)
      return !!promotion
    } catch (error) {
      console.error('Error checking specific idea:', error)
      return false
    }
  }
}