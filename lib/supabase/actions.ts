import { createClient } from './client'
import type { CommentInsert, LikeInsert } from '@/types/database'

// ユーザーのいいね状態を取得
export async function getUserLikeStatus(ideaId: string, walletAddress: string) {
  const supabase = createClient()
  
  try {
    // ウォレットアドレスからユーザーIDを取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError || !userData) {
      return { liked: false }
    }

    // いいね状態をチェック
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('idea_id', ideaId)
      .eq('user_id', userData.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    return { liked: !!existingLike }
  } catch (error) {
    console.error('Error checking like status:', error)
    return { liked: false }
  }
}

// いいね機能
export async function toggleLike(ideaId: string, walletAddress: string) {
  const supabase = createClient()
  
  try {
    // ウォレットアドレスからユーザーIDを取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError || !userData) {
      // ユーザーが存在しない場合は作成
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          wallet_address: walletAddress,
          nickname: `User_${walletAddress.slice(-4)}`
        })
        .select('id')
        .single()

      if (createError) throw createError
      userData = newUser
    }

    const userId = userData.id

    // 既存のいいねをチェック
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('idea_id', ideaId)
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existingLike) {
      // いいねを削除
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id)

      if (deleteError) throw deleteError
      return { liked: false }
    } else {
      // いいねを追加
      const likeData: LikeInsert = {
        idea_id: ideaId,
        user_id: userId
      }

      const { error: insertError } = await supabase
        .from('likes')
        .insert(likeData)

      if (insertError) throw insertError
      return { liked: true }
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    throw error
  }
}

// コメント追加
export async function addComment(ideaId: string, userId: string, content: string) {
  const supabase = createClient()
  
  try {
    const commentData: CommentInsert = {
      idea_id: ideaId,
      user_id: userId,
      content: content
    }

    const { data, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select(`
        *,
        users (
          id,
          nickname,
          avatar_url,
          wallet_address
        )
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

// コメント取得
export async function getComments(ideaId: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users (
          id,
          nickname,
          avatar_url,
          wallet_address
        )
      `)
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching comments:', error)
    throw error
  }
}

// アイデア詳細取得
export async function getIdeaWithDetails(ideaId: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
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

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching idea details:', error)
    throw error
  }
}