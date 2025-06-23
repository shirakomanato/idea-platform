import { createClient } from '@/lib/supabase/client'
import type { User, Idea } from '@/types/database'

export interface DelegationRequest {
  id: string
  idea_id: string
  from_user_id: string
  to_user_id: string
  reason: 'INACTIVITY' | 'MANUAL' | 'TOP_CONTRIBUTOR'
  delegated_at: string
  accepted_at?: string
  status: 'pending' | 'accepted' | 'declined'
}

export interface DelegationResult {
  success: boolean
  message: string
  data?: any
}

export class DelegationService {
  private supabase = createClient()

  /**
   * 非アクティブなアイデアの委譲をチェック
   */
  async checkInactivityDelegation(ideaId: string): Promise<DelegationResult> {
    if (!this.supabase) {
      return { success: false, message: 'Supabase client not available' }
    }

    try {
      // アイデア情報を取得
      const { data: idea, error: ideaError } = await this.supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .single()

      if (ideaError || !idea) {
        return { success: false, message: 'Idea not found' }
      }

      if (!idea.user_id) {
        return { success: false, message: 'Idea has no owner' }
      }

      // 最後のアクティビティを取得
      const lastActivity = await this.getLastActivity(ideaId, idea.user_id)
      
      if (!lastActivity) {
        return { success: false, message: 'No activity found' }
      }

      const daysSinceActivity = this.getDaysDifference(lastActivity, new Date())
      
      // 14日以上非アクティブの場合
      if (daysSinceActivity >= 14) {
        const topContributor = await this.getTopContributor(ideaId)
        
        if (!topContributor) {
          return { success: false, message: 'No eligible contributors found' }
        }

        // 既存の委譲リクエストがないかチェック
        const { data: existingDelegation } = await this.supabase
          .from('idea_delegations')
          .select('*')
          .eq('idea_id', ideaId)
          .eq('status', 'pending')
          .single()

        if (existingDelegation) {
          return { success: false, message: 'Delegation request already exists' }
        }

        return await this.createDelegationRequest(
          ideaId,
          idea.user_id,
          topContributor.id,
          'INACTIVITY',
          { days_inactive: daysSinceActivity }
        )
      }

      return { success: false, message: 'Not enough inactivity time' }
    } catch (error) {
      console.error('Error checking inactivity delegation:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * 委譲リクエストを作成
   */
  async createDelegationRequest(
    ideaId: string,
    fromUserId: string,
    toUserId: string,
    reason: 'INACTIVITY' | 'MANUAL' | 'TOP_CONTRIBUTOR',
    metadata?: any
  ): Promise<DelegationResult> {
    if (!this.supabase) {
      return { success: false, message: 'Supabase client not available' }
    }

    try {
      // 委譲リクエストを作成
      const { data: delegation, error: delegationError } = await this.supabase
        .from('idea_delegations')
        .insert({
          idea_id: ideaId,
          from_user_id: fromUserId,
          to_user_id: toUserId,
          reason: reason
        })
        .select()
        .single()

      if (delegationError) {
        return { success: false, message: 'Failed to create delegation request' }
      }

      // 通知を送信
      await this.sendDelegationNotifications(ideaId, fromUserId, toUserId, reason, metadata)

      return {
        success: true,
        message: 'Delegation request created successfully',
        data: delegation
      }
    } catch (error) {
      console.error('Error creating delegation request:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * 委譲リクエストを承認
   */
  async acceptDelegation(delegationId: string, userId: string): Promise<DelegationResult> {
    if (!this.supabase) {
      return { success: false, message: 'Supabase client not available' }
    }

    try {
      // 委譲リクエストを取得
      const { data: delegation, error: fetchError } = await this.supabase
        .from('idea_delegations')
        .select('*')
        .eq('id', delegationId)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .single()

      if (fetchError || !delegation) {
        return { success: false, message: 'Delegation request not found or not authorized' }
      }

      // アイデアの所有者を変更
      const { error: ideaUpdateError } = await this.supabase
        .from('ideas')
        .update({ 
          user_id: delegation.to_user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', delegation.idea_id)

      if (ideaUpdateError) {
        return { success: false, message: 'Failed to update idea ownership' }
      }

      // 委譲ステータスを更新
      const { error: delegationUpdateError } = await this.supabase
        .from('idea_delegations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', delegationId)

      if (delegationUpdateError) {
        console.warn('Failed to update delegation status:', delegationUpdateError)
      }

      // 通知を送信
      await this.sendAcceptanceNotifications(delegation.idea_id, delegation.from_user_id, delegation.to_user_id)

      return {
        success: true,
        message: 'Delegation accepted successfully'
      }
    } catch (error) {
      console.error('Error accepting delegation:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * 委譲リクエストを拒否
   */
  async declineDelegation(delegationId: string, userId: string): Promise<DelegationResult> {
    if (!this.supabase) {
      return { success: false, message: 'Supabase client not available' }
    }

    try {
      const { error } = await this.supabase
        .from('idea_delegations')
        .update({ status: 'declined' })
        .eq('id', delegationId)
        .eq('to_user_id', userId)
        .eq('status', 'pending')

      if (error) {
        return { success: false, message: 'Failed to decline delegation' }
      }

      return {
        success: true,
        message: 'Delegation declined successfully'
      }
    } catch (error) {
      console.error('Error declining delegation:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * ユーザーの委譲リクエストを取得
   */
  async getUserDelegationRequests(userId: string): Promise<DelegationRequest[]> {
    if (!this.supabase) return []

    try {
      const { data, error } = await this.supabase
        .from('idea_delegations')
        .select(`
          *,
          ideas!inner(title),
          from_user:users!idea_delegations_from_user_id_fkey(nickname, wallet_address)
        `)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .order('delegated_at', { ascending: false })

      if (error) {
        console.error('Error fetching delegation requests:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching delegation requests:', error)
      return []
    }
  }

  /**
   * 最後のアクティビティを取得
   */
  private async getLastActivity(ideaId: string, userId: string): Promise<Date | null> {
    if (!this.supabase) return null

    try {
      const { data, error } = await this.supabase
        .from('user_activities')
        .select('created_at')
        .eq('idea_id', ideaId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        // フォールバック: アイデアの更新日時を使用
        const { data: ideaData } = await this.supabase
          .from('ideas')
          .select('updated_at')
          .eq('id', ideaId)
          .single()

        return ideaData ? new Date(ideaData.updated_at) : null
      }

      return new Date(data.created_at)
    } catch {
      return null
    }
  }

  /**
   * 最も貢献度の高いユーザーを取得
   */
  private async getTopContributor(ideaId: string): Promise<User | null> {
    if (!this.supabase) return null

    try {
      // まずコラボレーション履歴から取得を試す
      const { data: collaborations } = await this.supabase
        .from('collaborations')
        .select(`
          user_id,
          users!inner(id, nickname, wallet_address, avatar_url)
        `)
        .eq('idea_id', ideaId)
        .eq('status', 'accepted')

      if (collaborations?.length) {
        return collaborations[0].users as User
      }

      // 次にアクティビティ履歴から取得
      const { data: activities } = await this.supabase
        .from('user_activities')
        .select(`
          user_id,
          users!inner(id, nickname, wallet_address, avatar_url)
        `)
        .eq('idea_id', ideaId)

      if (!activities?.length) return null

      // 貢献度を集計
      const contributions = activities.reduce((acc: Record<string, any>, activity: any) => {
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
   * 日数の差を計算
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * 委譲通知を送信
   */
  private async sendDelegationNotifications(
    ideaId: string,
    fromUserId: string,
    toUserId: string,
    reason: string,
    metadata?: any
  ): Promise<void> {
    if (!this.supabase) return

    try {
      const { data: idea } = await this.supabase
        .from('ideas')
        .select('title')
        .eq('id', ideaId)
        .single()

      if (!idea) return

      let message = ''
      switch (reason) {
        case 'INACTIVITY':
          message = `「${idea.title}」の管理権限が委譲されました。元の作者が${metadata?.days_inactive || 14}日間非アクティブのため、あなたが新しいオーナーに選ばれました。`
          break
        case 'MANUAL':
          message = `「${idea.title}」の管理権限があなたに委譲されました。`
          break
        case 'TOP_CONTRIBUTOR':
          message = `「${idea.title}」の管理権限が委譲されました。あなたの貢献度が最も高いため、新しいオーナーに選ばれました。`
          break
      }

      // 新しいオーナーに通知
      await this.supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          idea_id: ideaId,
          type: 'DELEGATION',
          title: 'アイデアの委譲リクエスト',
          message: message,
          action_required: true
        })

      // 元のオーナーにも通知（非アクティブでない場合）
      if (reason !== 'INACTIVITY') {
        await this.supabase
          .from('notifications')
          .insert({
            user_id: fromUserId,
            idea_id: ideaId,
            type: 'DELEGATION',
            title: 'アイデアを委譲しました',
            message: `「${idea.title}」の管理権限を委譲しました。`,
            action_required: false
          })
      }
    } catch (error) {
      console.warn('Failed to send delegation notifications:', error)
    }
  }

  /**
   * 承認通知を送信
   */
  private async sendAcceptanceNotifications(
    ideaId: string,
    fromUserId: string,
    toUserId: string
  ): Promise<void> {
    if (!this.supabase) return

    try {
      const { data: idea } = await this.supabase
        .from('ideas')
        .select('title')
        .eq('id', ideaId)
        .single()

      if (!idea) return

      // 元のオーナーに通知
      await this.supabase
        .from('notifications')
        .insert({
          user_id: fromUserId,
          idea_id: ideaId,
          type: 'DELEGATION',
          title: '委譲が承認されました',
          message: `「${idea.title}」の委譲が承認されました。`,
          action_required: false
        })

      // 新しいオーナーに通知
      await this.supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          idea_id: ideaId,
          type: 'DELEGATION',
          title: 'アイデアの管理権限を取得しました',
          message: `「${idea.title}」の管理権限を正式に取得しました。`,
          action_required: false
        })
    } catch (error) {
      console.warn('Failed to send acceptance notifications:', error)
    }
  }
}