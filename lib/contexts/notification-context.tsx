"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { NotificationService, type Notification } from '@/lib/services/notification-service'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  loadNotifications: () => Promise<void>
  refresh: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const notificationService = new NotificationService()
  const subscriptionRef = useRef<(() => void) | null>(null)
  const isSubscribedRef = useRef(false)

  // 通知を読み込む
  const loadNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await notificationService.getUserNotifications(user.id)
      setNotifications(data)
      
      const unreadCountData = await notificationService.getUnreadCount(user.id)
      setUnreadCount(unreadCountData)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // リアルタイム購読の管理
  useEffect(() => {
    if (!user || isSubscribedRef.current) return

    console.log('Setting up notification subscription for user:', user.id)
    
    try {
      const unsubscribe = notificationService.subscribeToNotifications(user.id, (newNotification) => {
        console.log('Received new notification:', newNotification)
        
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
        
        // トーストで新しい通知を表示
        toast({
          title: newNotification.title,
          description: newNotification.message,
        })
      })

      subscriptionRef.current = unsubscribe
      isSubscribedRef.current = true

      // 初回読み込み
      loadNotifications()
    } catch (error) {
      console.error('Error setting up notification subscription:', error)
    }

    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up notification subscription')
        subscriptionRef.current()
        subscriptionRef.current = null
        isSubscribedRef.current = false
      }
    }
  }, [user])

  // 既読にする
  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      await notificationService.markAsRead(notificationId, user.id)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // 全て既読にする
  const markAllAsRead = async () => {
    if (!user) return

    try {
      await notificationService.markAllAsRead(user.id)
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
      toast({
        title: "全ての通知を既読にしました",
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // 手動リフレッシュ
  const refresh = () => {
    loadNotifications()
  }

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    loadNotifications,
    refresh
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}