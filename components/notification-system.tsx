"use client"

import { useState } from 'react'
import { Bell, X, Check, CheckCheck, Clock, MessageSquare, Zap, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { type Notification } from '@/lib/services/notification-service'
import { DelegationService } from '@/lib/services/delegation-service'
import { useNotifications } from '@/lib/contexts/notification-context'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { user } = useAppStore()
  const { toast } = useToast()
  const { notifications, loading, markAsRead, markAllAsRead, loadNotifications } = useNotifications()
  const delegationService = new DelegationService()

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleDelegationAction = async (notificationId: string, delegationId: string, action: 'accept' | 'decline') => {
    if (!user) return

    try {
      if (action === 'accept') {
        const result = await delegationService.acceptDelegation(delegationId, user.id)
        if (result.success) {
          toast({
            title: "委譲を承認しました",
            description: "アイデアの管理権限を取得しました",
          })
        } else {
          toast({
            title: "エラー",
            description: result.message,
            variant: "destructive",
          })
        }
      } else {
        const result = await delegationService.declineDelegation(delegationId, user.id)
        if (result.success) {
          toast({
            title: "委譲を辞退しました",
          })
        } else {
          toast({
            title: "エラー",
            description: result.message,
            variant: "destructive",
          })
        }
      }

      // 通知を既読にする
      await handleMarkAsRead(notificationId)
      
      // 通知リストを更新
      loadNotifications()
    } catch (error) {
      console.error('Error handling delegation action:', error)
      toast({
        title: "エラー",
        description: "操作に失敗しました",
        variant: "destructive",
      })
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return <ArrowRight className="w-4 h-4 text-blue-500" />
      case 'DELEGATION':
        return <Users className="w-4 h-4 text-purple-500" />
      case 'LIKE_MILESTONE':
        return <Zap className="w-4 h-4 text-yellow-500" />
      case 'COMMENT':
        return <MessageSquare className="w-4 h-4 text-green-500" />
      case 'COLLABORATION':
        return <Users className="w-4 h-4 text-indigo-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '今'
    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    return `${diffDays}日前`
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end pt-16 pr-4">
      <Card className="w-96 max-h-[600px] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <CardTitle className="text-lg">通知</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  全て既読
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                読み込み中...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                通知はありません
              </div>
            ) : (
              <div className="space-y-0">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelegationAction={handleDelegationAction}
                    getIcon={getNotificationIcon}
                    formatTime={formatTimeAgo}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelegationAction: (notificationId: string, delegationId: string, action: 'accept' | 'decline') => void
  getIcon: (type: Notification['type']) => JSX.Element
  formatTime: (date: string) => string
}

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelegationAction, 
  getIcon, 
  formatTime 
}: NotificationItemProps) {
  const isUnread = !notification.read_at
  const isDelegation = notification.type === 'DELEGATION' && notification.action_required

  return (
    <div 
      className={`p-4 border-b hover:bg-muted/50 transition-colors ${
        isUnread ? 'bg-blue-50 dark:bg-blue-950/20' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground truncate">
              {notification.title}
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(notification.created_at)}
              </span>
              {isUnread && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          {/* 委譲アクション */}
          {isDelegation && (
            <div className="flex space-x-2 mt-3">
              <Button
                size="sm"
                onClick={() => onDelegationAction(notification.id, notification.data?.delegation_id, 'accept')}
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                承認
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelegationAction(notification.id, notification.data?.delegation_id, 'decline')}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                辞退
              </Button>
            </div>
          )}

          {/* アイデアへのリンク */}
          {notification.idea_id && !isDelegation && (
            <div className="mt-2">
              <Link 
                href={`/idea/${notification.idea_id}`}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
                  アイデアを見る
                </Button>
              </Link>
            </div>
          )}

          {/* 既読ボタン */}
          {isUnread && !isDelegation && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkAsRead(notification.id)}
                className="text-xs h-6 px-2"
              >
                <Check className="w-3 h-3 mr-1" />
                既読にする
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 通知ベルアイコンコンポーネント
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount } = useNotifications()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      <NotificationCenter 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  )
}