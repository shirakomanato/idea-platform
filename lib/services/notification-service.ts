import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  idea_id?: string
  type: 'STATUS_CHANGE' | 'DELEGATION' | 'LIKE_MILESTONE' | 'COMMENT' | 'COLLABORATION'
  title: string
  message: string
  action_required: boolean
  read_at?: string
  data?: any
  created_at: string
  updated_at: string
}

export interface NotificationResult {
  success: boolean
  message: string
  data?: any
}

export class NotificationService {
  private supabase = createClient()

  /**
   * ユーザーの通知を取得
   */
  async getUserNotifications(userId: string, limit = 20): Promise<Notification[]> {
    if (!this.supabase) return []

    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select(`
          *,
          ideas(title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching notifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  /**
   * 未読通知数を取得
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!this.supabase) return 0

    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null)

      if (error) {
        console.error('Error fetching unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }

  /**
   * 通知を既読にする
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationResult> {
    if (!this.supabase) {
      return { success: false, message: 'Supabase client not available' }
    }

    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) {
        return { success: false, message: 'Failed to mark notification as read' }
      }

      return { success: true, message: 'Notification marked as read' }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * 全ての通知を既読にする
   */
  async markAllAsRead(userId: string): Promise<NotificationResult> {
    if (!this.supabase) {
      return { success: false, message: 'Supabase client not available' }
    }

    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)

      if (error) {
        return { success: false, message: 'Failed to mark all notifications as read' }
      }

      return { success: true, message: 'All notifications marked as read' }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * 通知を作成
   */
  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    options?: {
      ideaId?: string
      actionRequired?: boolean
      data?: any
    }
  ): Promise<NotificationResult> {
    if (!this.supabase) {
      return { success: false, message: 'Supabase client not available' }
    }

    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          idea_id: options?.ideaId,
          type: type,
          title: title,
          message: message,
          action_required: options?.actionRequired || false,
          data: options?.data
        })
        .select()
        .single()

      if (error) {
        return { success: false, message: 'Failed to create notification' }
      }

      return { 
        success: true, 
        message: 'Notification created successfully',
        data: data
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * 通知を削除
   */
  async deleteNotification(notificationId: string, userId: string): Promise<NotificationResult> {
    if (!this.supabase) {
      return { success: false, message: 'Supabase client not available' }
    }

    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) {
        return { success: false, message: 'Failed to delete notification' }
      }

      return { success: true, message: 'Notification deleted successfully' }
    } catch (error) {
      console.error('Error deleting notification:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * いいねマイルストーン通知を送信
   */
  async sendLikeMilestoneNotification(
    ideaId: string,
    userId: string,
    likesCount: number,
    milestone: number
  ): Promise<void> {
    if (!this.supabase) return

    try {
      const { data: idea } = await this.supabase
        .from('ideas')
        .select('title')
        .eq('id', ideaId)
        .single()

      if (!idea) return

      await this.createNotification(
        userId,
        'LIKE_MILESTONE',
        `🎉 ${milestone}いいね達成！`,
        `「${idea.title}」が${likesCount}いいねを獲得しました！`,
        {
          ideaId: ideaId,
          data: { likes_count: likesCount, milestone: milestone }
        }
      )
    } catch (error) {
      console.warn('Failed to send like milestone notification:', error)
    }
  }

  /**
   * コメント通知を送信
   */
  async sendCommentNotification(
    ideaId: string,
    ideaOwnerId: string,
    commenterNickname: string
  ): Promise<void> {
    if (!this.supabase) return

    try {
      const { data: idea } = await this.supabase
        .from('ideas')
        .select('title')
        .eq('id', ideaId)
        .single()

      if (!idea) return

      await this.createNotification(
        ideaOwnerId,
        'COMMENT',
        '新しいコメントがあります',
        `${commenterNickname}さんが「${idea.title}」にコメントしました`,
        {
          ideaId: ideaId,
          data: { commenter: commenterNickname }
        }
      )
    } catch (error) {
      console.warn('Failed to send comment notification:', error)
    }
  }

  /**
   * コラボレーション通知を送信
   */
  async sendCollaborationNotification(
    ideaId: string,
    userId: string,
    type: 'REQUEST' | 'ACCEPTED' | 'DECLINED',
    collaboratorNickname?: string
  ): Promise<void> {
    if (!this.supabase) return

    try {
      const { data: idea } = await this.supabase
        .from('ideas')
        .select('title')
        .eq('id', ideaId)
        .single()

      if (!idea) return

      let title = ''
      let message = ''

      switch (type) {
        case 'REQUEST':
          title = 'コラボレーションリクエスト'
          message = `${collaboratorNickname}さんが「${idea.title}」のコラボレーションを申請しました`
          break
        case 'ACCEPTED':
          title = 'コラボレーション承認'
          message = `「${idea.title}」のコラボレーションが承認されました`
          break
        case 'DECLINED':
          title = 'コラボレーション辞退'
          message = `「${idea.title}」のコラボレーションが辞退されました`
          break
      }

      await this.createNotification(
        userId,
        'COLLABORATION',
        title,
        message,
        {
          ideaId: ideaId,
          actionRequired: type === 'REQUEST',
          data: { type: type, collaborator: collaboratorNickname }
        }
      )
    } catch (error) {
      console.warn('Failed to send collaboration notification:', error)
    }
  }

  /**
   * 通知の リアルタイム購読を設定
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ): () => void {
    if (!this.supabase) {
      return () => {}
    }

    const subscription = this.supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }
}