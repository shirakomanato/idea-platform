import { useEffect, useState } from 'react'
import { createClient } from './client'
import type { IdeaWithUser } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useIdeas() {
  const [ideas, setIdeas] = useState<IdeaWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()
    
    // 初期データの取得
    const fetchIdeas = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('ideas')
          .select(`
            *,
            users (
              id,
              nickname,
              avatar_url,
              wallet_address
            )
          `)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        setIdeas(data as IdeaWithUser[])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchIdeas()

    // リアルタイム更新の設定
    const channel = supabase
      .channel('ideas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ideas'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === 'INSERT') {
            // 新しいアイデアが追加された場合、ユーザー情報と一緒に取得
            const { data } = await supabase
              .from('ideas')
              .select(`
                *,
                users (
                  id,
                  nickname,
                  avatar_url,
                  wallet_address
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setIdeas(prev => [data as IdeaWithUser, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            // アイデアが更新された場合
            const { data } = await supabase
              .from('ideas')
              .select(`
                *,
                users (
                  id,
                  nickname,
                  avatar_url,
                  wallet_address
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setIdeas(prev => prev.map(idea => 
                idea.id === payload.new.id ? (data as IdeaWithUser) : idea
              ))
            }
          } else if (payload.eventType === 'DELETE') {
            // アイデアが削除された場合
            setIdeas(prev => prev.filter(idea => idea.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // クリーンアップ
    return () => {
      channel.unsubscribe()
    }
  }, [])

  return { ideas, loading, error }
}

export function useIdeaDetails(ideaId: string) {
  const [idea, setIdea] = useState<IdeaWithUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!ideaId) return

    const supabase = createClient()
    
    // 初期データの取得
    const fetchIdea = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('ideas')
          .select(`
            *,
            users (
              id,
              nickname,
              avatar_url,
              wallet_address
            )
          `)
          .eq('id', ideaId)
          .single()

        if (fetchError) throw fetchError
        setIdea(data as IdeaWithUser)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchIdea()

    // リアルタイム更新の設定
    const channel = supabase
      .channel(`idea_${ideaId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ideas',
          filter: `id=eq.${ideaId}`
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          const { data } = await supabase
            .from('ideas')
            .select(`
              *,
              users (
                id,
                nickname,
                avatar_url,
                wallet_address
              )
            `)
            .eq('id', ideaId)
            .single()

          if (data) {
            setIdea(data as IdeaWithUser)
          }
        }
      )
      .subscribe()

    // クリーンアップ
    return () => {
      channel.unsubscribe()
    }
  }, [ideaId])

  return { idea, loading, error }
}