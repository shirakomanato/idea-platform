import { createClient } from './client'
import type { CommentInsert, LikeInsert } from '@/types/database'
import { LikesHelper } from './likes-helper'

// 推薦機能
export async function recommendIdea(ideaId: string, walletAddress: string) {
  console.log('recommendIdea called with:', { ideaId, walletAddress })
  
  try {
    // 推薦記録をローカルストレージに保存（Supabaseを使わずシンプルに）
    const recommendedKey = `recommended_${walletAddress}`
    const recommended = JSON.parse(localStorage.getItem(recommendedKey) || '[]')
    
    if (!recommended.includes(ideaId)) {
      recommended.push(ideaId)
      localStorage.setItem(recommendedKey, JSON.stringify(recommended))
      console.log('Added to recommended list:', ideaId)
    } else {
      console.log('Already in recommended list:', ideaId)
    }

    return { recommended: true }
  } catch (error) {
    console.error('Error recommending idea raw:', error)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorString: String(error),
      errorJSON: JSON.stringify(error),
      ideaId,
      walletAddress
    })
    throw error
  }
}

// 共感機能（ローカルストレージベース）
export async function empathizeWithIdea(ideaId: string, walletAddress: string) {
  console.log('empathizeWithIdea called with:', { ideaId, walletAddress })
  
  try {
    // 共感したアイデアをローカルストレージに記録
    const empathizedKey = `empathized_${walletAddress}`
    const empathized = JSON.parse(localStorage.getItem(empathizedKey) || '[]')
    
    if (!empathized.includes(ideaId)) {
      empathized.push(ideaId)
      localStorage.setItem(empathizedKey, JSON.stringify(empathized))
      console.log('Added to empathized list:', ideaId)
      console.log('Current empathized list:', empathized)
    } else {
      console.log('Already in empathized list:', ideaId)
    }

    // Use the new LikesHelper for better error handling
    try {
      const likeResult = await LikesHelper.toggleLike({ ideaId, walletAddress })
      console.log('LikesHelper.toggleLike result:', likeResult)
      
      if (likeResult.success) {
        return { 
          liked: likeResult.liked || true, 
          empathized: true, 
          likesCount: likeResult.likesCount || 0 
        }
      } else {
        console.warn('Like operation failed:', likeResult.error)
        return { liked: true, empathized: true, likesCount: 0 }
      }
    } catch (likeError) {
      console.warn('Supabase like failed, but empathy recorded locally:', likeError)
      return { liked: true, empathized: true, likesCount: 0 }
    }
  } catch (error) {
    console.error('Error empathizing with idea raw:', error)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorString: String(error),
      errorJSON: JSON.stringify(error),
      ideaId,
      walletAddress
    })
    throw error
  }
}

// ユーザーが推薦したアイデア一覧を取得
export function getRecommendedIdeas(walletAddress: string): string[] {
  try {
    const recommendedKey = `recommended_${walletAddress}`
    const result = JSON.parse(localStorage.getItem(recommendedKey) || '[]')
    console.log('getRecommendedIdeas result:', result)
    return result
  } catch (error) {
    console.error('Error getting recommended ideas:', error)
    return []
  }
}

// ユーザーが共感したアイデア一覧を取得
export function getEmpathizedIdeas(walletAddress: string): string[] {
  try {
    const empathizedKey = `empathized_${walletAddress}`
    const result = JSON.parse(localStorage.getItem(empathizedKey) || '[]')
    console.log('getEmpathizedIdeas result:', result)
    return result
  } catch (error) {
    console.error('Error getting empathized ideas:', error)
    return []
  }
}

// ユーザーのいいね状態を取得
export async function getUserLikeStatus(ideaId: string, walletAddress: string) {
  const result = await LikesHelper.checkLikeStatus({ ideaId, walletAddress })
  return { liked: result.liked || false }
}

// いいね機能
export async function toggleLike(ideaId: string, walletAddress: string) {
  console.log('toggleLike called with:', { ideaId, walletAddress })
  
  const result = await LikesHelper.toggleLike({ ideaId, walletAddress })
  
  if (!result.success) {
    console.error('toggleLike failed:', result.error)
    throw new Error(result.error || 'Failed to toggle like')
  }
  
  return { 
    liked: result.liked || false, 
    likesCount: result.likesCount || 0 
  }
}

// コメント追加（ローカルストレージフォールバック付き）
export async function addComment(ideaId: string, userAddress: string, content: string) {
  console.log('addComment called with:', { ideaId, userAddress, content })
  
  try {
    const supabase = createClient()
    
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    // まずウォレットアドレスを設定（RLSポリシー用）
    const { error: walletError } = await supabase.rpc('set_current_user_wallet', { 
      wallet_address: userAddress 
    })
    
    if (walletError) {
      console.error('Error setting wallet:', walletError)
      throw new Error('Failed to set wallet: ' + walletError.message)
    }

    // ウォレットアドレスからユーザーIDを取得
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, nickname')
      .eq('wallet_address', userAddress)
      .single()

    if (userError || !userData) {
      // ユーザーが存在しない場合は作成
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          wallet_address: userAddress,
          nickname: `User_${userAddress.slice(-4)}`
        })
        .select('id, nickname')
        .single()

      if (createError) throw createError
      userData = newUser
    }

    const commentData: CommentInsert = {
      idea_id: ideaId,
      user_id: userData.id,
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
    console.log('Comment added successfully:', data)
    return data
  } catch (error) {
    console.error('Error adding comment raw:', error)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    
    // ローカルストレージにフォールバック
    try {
      const localComment = {
        id: Date.now().toString(),
        idea_id: ideaId,
        user_id: userAddress,
        content: content,
        created_at: new Date().toISOString(),
        users: {
          id: userAddress,
          nickname: `User_${userAddress.slice(-4)}`,
          avatar_url: null,
          wallet_address: userAddress
        }
      }
      
      // ローカルストレージに保存
      const commentsKey = `comments_${ideaId}`
      const existingComments = JSON.parse(localStorage.getItem(commentsKey) || '[]')
      existingComments.push(localComment)
      localStorage.setItem(commentsKey, JSON.stringify(existingComments))
      
      console.log('Comment saved to local storage:', localComment)
      return localComment
    } catch (localError) {
      console.error('Local storage fallback failed:', localError)
      throw error
    }
  }
}

// コメント取得（ローカルストレージと統合）
export async function getComments(ideaId: string, walletAddress?: string) {
  console.log('getComments called for ideaId:', ideaId)
  
  try {
    const supabase = createClient()
    let supabaseComments = []
    
    if (supabase) {
      try {
        // ウォレットアドレスが提供されている場合は設定
        if (walletAddress) {
          const { error: walletError } = await supabase.rpc('set_current_user_wallet', { 
            wallet_address: walletAddress 
          })
          
          if (walletError) {
            console.warn('Error setting wallet for comments:', walletError)
          }
        }
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

        if (!error && data) {
          supabaseComments = data
          console.log('Supabase comments:', supabaseComments.length)
        } else {
          console.warn('Supabase comments fetch failed:', error)
        }
      } catch (supabaseError) {
        console.warn('Supabase error, falling back to local storage:', supabaseError)
      }
    }

    // ローカルストレージからコメントを取得
    const commentsKey = `comments_${ideaId}`
    const localComments = JSON.parse(localStorage.getItem(commentsKey) || '[]')
    console.log('Local comments:', localComments.length)

    // Supabaseとローカルのコメントを統合（重複を除去）
    const allComments = [...supabaseComments]
    
    localComments.forEach(localComment => {
      const exists = allComments.some(comment => comment.id === localComment.id)
      if (!exists) {
        allComments.push(localComment)
      }
    })

    // 作成日時でソート
    allComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    
    console.log('Total comments returned:', allComments.length)
    return allComments
  } catch (error) {
    console.error('Error fetching comments:', error)
    
    // 完全にフォールバック: ローカルストレージのみ
    try {
      const commentsKey = `comments_${ideaId}`
      const localComments = JSON.parse(localStorage.getItem(commentsKey) || '[]')
      console.log('Fallback to local comments only:', localComments.length)
      return localComments
    } catch (localError) {
      console.error('Local storage fallback failed:', localError)
      return []
    }
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