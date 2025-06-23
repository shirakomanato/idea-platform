import { createClient } from '@/lib/supabase/client'
import type { Idea, User } from '@/types/database'

export interface ProgressionRule {
  id: string
  from_status: string
  to_status: string
  like_threshold_percentage?: number
  minimum_likes?: number
  inactivity_days?: number
  auto_progression: boolean
}

export interface ProgressionResult {
  success: boolean
  newStatus?: string
  reason?: string
  data?: any
}

export class IdeaProgressionService {
  private supabase = createClient()

  /**
   * アイデアのプログレッション条件をチェックして自動進行
   */
  async checkProgressionEligibility(ideaId: string): Promise<ProgressionResult> {
    if (!this.supabase) {
      return { success: false, reason: 'Supabase client not available' }
    }

    try {
      // アイデア情報を取得
      const { data: idea, error: ideaError } = await this.supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .single()

      if (ideaError || !idea) {
        return { success: false, reason: 'Idea not found' }
      }

      // 総ユーザー数を取得
      const { count: totalUsers, error: userCountError } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (userCountError) {
        return { success: false, reason: 'Failed to get user count' }
      }

      // 適用可能なプログレッションルールを取得
      const { data: rules, error: rulesError } = await this.supabase
        .from('progression_settings')
        .select('*')
        .eq('from_status', idea.status)
        .eq('auto_progression', true)

      if (rulesError || !rules?.length) {
        return { success: false, reason: 'No applicable progression rules' }
      }

      // 各ルールをチェック
      for (const rule of rules) {
        const result = await this.evaluateRule(idea, rule, totalUsers || 0)
        if (result.success) {
          return result
        }
      }

      return { success: false, reason: 'No conditions met for progression' }
    } catch (error) {
      console.error('Error checking progression eligibility:', error)
      return { success: false, reason: 'Internal error' }
    }
  }

  /**
   * 特定のルールを評価
   */
  private async evaluateRule(
    idea: Idea, 
    rule: ProgressionRule, 
    totalUsers: number
  ): Promise<ProgressionResult> {
    // いいね率による条件チェック
    if (rule.like_threshold_percentage && rule.minimum_likes) {
      const likeRatio = totalUsers > 0 ? (idea.likes_count / totalUsers) * 100 : 0
      
      if (likeRatio >= rule.like_threshold_percentage && idea.likes_count >= rule.minimum_likes) {
        const result = await this.progressIdea(
          idea.id, 
          idea.status, 
          rule.to_status, 
          'LIKE_THRESHOLD',
          {
            like_ratio: likeRatio,
            likes_count: idea.likes_count,
            total_users: totalUsers,
            threshold: rule.like_threshold_percentage
          }
        )
        return result
      }
    }

    // 非アクティブ期間による条件チェック
    if (rule.inactivity_days) {
      const lastActivity = await this.getLastActivity(idea.id, idea.user_id)
      if (lastActivity) {
        const daysSinceActivity = this.getDaysDifference(lastActivity, new Date())
        
        if (daysSinceActivity >= rule.inactivity_days) {
          // 非アクティブな場合は委譲処理を実行
          return await this.handleInactivityDelegation(idea, daysSinceActivity)
        }
      }
    }

    return { success: false, reason: 'Rule conditions not met' }
  }

  /**
   * アイデアを次のステータスに進行
   */
  async progressIdea(
    ideaId: string,
    fromStatus: string,
    toStatus: string,
    triggerType: string,
    triggerData?: any,
    triggeredBy?: string
  ): Promise<ProgressionResult> {
    if (!this.supabase) {
      return { success: false, reason: 'Supabase client not available' }
    }

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
        return { success: false, reason: 'Failed to update idea status' }
      }

      // プログレッション履歴を記録
      const { error: historyError } = await this.supabase
        .from('idea_progressions')
        .insert({
          idea_id: ideaId,
          from_status: fromStatus,
          to_status: toStatus,
          trigger_type: triggerType,
          trigger_data: triggerData,
          triggered_by: triggeredBy
        })

      if (historyError) {
        console.warn('Failed to record progression history:', historyError)
      }

      // 作者に通知を送信
      await this.sendProgressionNotification(ideaId, fromStatus, toStatus, triggerData)

      return { 
        success: true, 
        newStatus: toStatus,
        data: triggerData
      }
    } catch (error) {
      console.error('Error progressing idea:', error)
      return { success: false, reason: 'Internal error' }
    }
  }

  /**
   * 最後のアクティビティを取得
   */
  private async getLastActivity(ideaId: string, userId?: string): Promise<Date | null> {
    if (!this.supabase || !userId) return null

    try {
      const { data, error } = await this.supabase
        .from('user_activities')
        .select('created_at')
        .eq('idea_id', ideaId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null
      return new Date(data.created_at)
    } catch {
      return null
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
   * 非アクティブによる委譲処理
   */
  private async handleInactivityDelegation(idea: Idea, daysSinceActivity: number): Promise<ProgressionResult> {
    // 最も貢献度の高いユーザーを取得
    const topContributor = await this.getTopContributor(idea.id)
    
    if (!topContributor) {
      return { success: false, reason: 'No contributors found for delegation' }
    }

    // 委譲リクエストを作成
    const { error: delegationError } = await this.supabase
      ?.from('idea_delegations')
      .insert({
        idea_id: idea.id,
        from_user_id: idea.user_id,
        to_user_id: topContributor.id,
        reason: 'INACTIVITY'
      })

    if (delegationError) {
      return { success: false, reason: 'Failed to create delegation request' }
    }

    // 委譲通知を送信
    await this.sendDelegationNotification(idea.id, topContributor.id, daysSinceActivity)

    return { 
      success: true, 
      reason: 'Delegation request created',
      data: { delegate: topContributor, inactivity_days: daysSinceActivity }
    }
  }

  /**
   * 最も貢献度の高いユーザーを取得
   */
  private async getTopContributor(ideaId: string): Promise<User | null> {
    if (!this.supabase) return null

    try {
      // いいねとコメントから貢献度を計算
      const { data, error } = await this.supabase
        .from('user_activities')
        .select(`
          user_id,
          users!inner(id, nickname, wallet_address, avatar_url)
        `)
        .eq('idea_id', ideaId)

      if (error || !data?.length) return null

      // 貢献度を集計
      const contributions = data.reduce((acc: Record<string, any>, activity: any) => {
        const userId = activity.user_id
        if (!acc[userId]) {
          acc[userId] = {
            user: activity.users,
            count: 0
          }
        }
        acc[userId].count++
        return acc
      }, {})

      // 最も貢献度の高いユーザーを選択
      const topContributor = Object.values(contributions)
        .sort((a: any, b: any) => b.count - a.count)[0] as any

      return topContributor?.user || null
    } catch {
      return null
    }
  }

  /**
   * プログレッション通知を送信
   */
  private async sendProgressionNotification(
    ideaId: string,
    fromStatus: string,
    toStatus: string,
    triggerData?: any
  ): Promise<void> {
    if (!this.supabase) return

    try {
      // アイデア情報を取得
      const { data: idea } = await this.supabase
        .from('ideas')
        .select('title, user_id')
        .eq('id', ideaId)
        .single()

      if (!idea?.user_id) return

      const likeRatio = triggerData?.like_ratio ? ` (いいね率: ${triggerData.like_ratio.toFixed(1)}%)` : ''
      
      await this.supabase
        .from('notifications')
        .insert({
          user_id: idea.user_id,
          idea_id: ideaId,
          type: 'STATUS_CHANGE',
          title: 'アイデアがレベルアップしました！',
          message: `「${idea.title}」が ${fromStatus} から ${toStatus} に進化しました${likeRatio}`,
          action_required: false
        })
    } catch (error) {
      console.warn('Failed to send progression notification:', error)
    }
  }

  /**
   * 委譲通知を送信
   */
  private async sendDelegationNotification(
    ideaId: string,
    newOwnerId: string,
    inactivityDays: number
  ): Promise<void> {
    if (!this.supabase) return

    try {
      const { data: idea } = await this.supabase
        .from('ideas')
        .select('title')
        .eq('id', ideaId)
        .single()

      if (!idea) return

      await this.supabase
        .from('notifications')
        .insert({
          user_id: newOwnerId,
          idea_id: ideaId,
          type: 'DELEGATION',
          title: 'アイデアの委譲リクエスト',
          message: `「${idea.title}」の管理権限が委譲されました。元の作者が${inactivityDays}日間非アクティブのため、あなたが新しいオーナーに選ばれました。`,
          action_required: true
        })
    } catch (error) {
      console.warn('Failed to send delegation notification:', error)
    }
  }

  /**
   * アクティビティを記録
   */
  async recordActivity(
    userId: string,
    ideaId: string,
    activityType: 'LIKE' | 'COMMENT' | 'EDIT' | 'STATUS_CHANGE'
  ): Promise<void> {
    if (!this.supabase) return

    try {
      await this.supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          idea_id: ideaId,
          activity_type: activityType
        })
    } catch (error) {
      console.warn('Failed to record activity:', error)
    }
  }
}