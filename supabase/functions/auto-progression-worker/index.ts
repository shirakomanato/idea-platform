import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ProgressionRule {
  from_status: string
  to_status: string
  like_threshold_percentage: number
  minimum_likes: number
}

interface AutoProgressionResult {
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

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action } = await req.json()
    let result: AutoProgressionResult

    switch (action) {
      case 'check_progression':
        result = await checkIdeaProgression(supabase)
        break
      case 'check_inactive':
        result = await checkInactiveIdeas(supabase)
        break
      case 'full_check':
      default:
        const progressionResult = await checkIdeaProgression(supabase)
        const delegationResult = await checkInactiveIdeas(supabase)
        
        result = {
          success: progressionResult.success && delegationResult.success,
          promotions: [...progressionResult.promotions, ...delegationResult.promotions],
          delegations: [...progressionResult.delegations, ...delegationResult.delegations],
          errors: [...progressionResult.errors, ...delegationResult.errors]
        }
        break
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  } catch (error) {
    console.error('Auto progression worker error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        promotions: [],
        delegations: [],
        errors: [error.message]
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  }
})

async function checkIdeaProgression(supabase: any): Promise<AutoProgressionResult> {
  const result: AutoProgressionResult = {
    success: true,
    promotions: [],
    delegations: [],
    errors: []
  }

  try {
    console.log('🔍 Checking idea progressions...')

    // 進行可能なアイデアを取得
    const { data: ideas, error: ideaError } = await supabase
      .from('ideas')
      .select('id, title, status, likes_count, user_id, created_at')
      .in('status', ['idea', 'pre-draft', 'draft'])

    if (ideaError) {
      result.errors.push(`Failed to fetch ideas: ${ideaError.message}`)
      return result
    }

    if (!ideas?.length) {
      console.log('No ideas found for progression check')
      return result
    }

    // 総ユーザー数を取得
    const { count: totalUsers, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (userError) {
      result.errors.push(`Failed to get user count: ${userError.message}`)
      return result
    }

    if (!totalUsers || totalUsers === 0) {
      console.log('No users found')
      return result
    }

    console.log(`Checking ${ideas.length} ideas against ${totalUsers} total users`)

    // 進行ルール
    const progressionRules: ProgressionRule[] = [
      { from_status: 'idea', to_status: 'pre-draft', like_threshold_percentage: 30, minimum_likes: 5 },
      { from_status: 'pre-draft', to_status: 'draft', like_threshold_percentage: 40, minimum_likes: 10 },
      { from_status: 'draft', to_status: 'commit', like_threshold_percentage: 50, minimum_likes: 15 }
    ]

    // 各アイデアをチェック
    for (const idea of ideas) {
      const likeRatio = (idea.likes_count / totalUsers) * 100
      
      const applicableRule = progressionRules.find(rule => 
        rule.from_status === idea.status &&
        likeRatio >= rule.like_threshold_percentage &&
        idea.likes_count >= rule.minimum_likes
      )

      if (applicableRule) {
        console.log(`Promoting idea ${idea.id}: ${idea.status} → ${applicableRule.to_status}`)
        
        const promotion = await promoteIdea(
          supabase,
          idea.id,
          idea.status,
          applicableRule.to_status,
          `${applicableRule.like_threshold_percentage}%いいね率達成 (${likeRatio.toFixed(1)}%, ${idea.likes_count}いいね)`
        )

        if (promotion) {
          result.promotions.push(promotion)
        }
      }
    }

    console.log(`✅ Progression check completed: ${result.promotions.length} promotions`)
    return result
  } catch (error) {
    console.error('Error in checkIdeaProgression:', error)
    result.success = false
    result.errors.push(`Progression check failed: ${error.message}`)
    return result
  }
}

async function promoteIdea(
  supabase: any,
  ideaId: string,
  fromStatus: string,
  toStatus: string,
  reason: string
): Promise<{ ideaId: string; fromStatus: string; toStatus: string; reason: string } | null> {
  try {
    // ステータスを更新
    const { error: updateError } = await supabase
      .from('ideas')
      .update({
        status: toStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', ideaId)

    if (updateError) {
      console.error('Failed to update idea status:', updateError)
      return null
    }

    // プログレッション履歴を記録
    await supabase
      .from('idea_progressions')
      .insert({
        idea_id: ideaId,
        from_status: fromStatus,
        to_status: toStatus,
        trigger_type: 'AUTO_PROGRESSION',
        trigger_data: { reason, automated: true, worker: true }
      })

    // 作者に通知を送信
    await sendPromotionNotification(supabase, ideaId, fromStatus, toStatus, reason)

    return { ideaId, fromStatus, toStatus, reason }
  } catch (error) {
    console.error('Error promoting idea:', error)
    return null
  }
}

async function checkInactiveIdeas(supabase: any): Promise<AutoProgressionResult> {
  const result: AutoProgressionResult = {
    success: true,
    promotions: [],
    delegations: [],
    errors: []
  }

  try {
    console.log('🔍 Checking inactive ideas...')

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    // 14日以上更新されていないアイデアを取得
    const { data: inactiveIdeas, error } = await supabase
      .from('ideas')
      .select('id, title, user_id, status, updated_at')
      .in('status', ['pre-draft', 'draft'])
      .lt('updated_at', fourteenDaysAgo.toISOString())

    if (error) {
      result.errors.push(`Failed to fetch inactive ideas: ${error.message}`)
      return result
    }

    if (!inactiveIdeas?.length) {
      console.log('No inactive ideas found')
      return result
    }

    console.log(`Found ${inactiveIdeas.length} inactive ideas`)

    // 各非アクティブアイデアを処理
    for (const idea of inactiveIdeas) {
      if (!idea.user_id) continue

      // 既存の委譲リクエストがないかチェック
      const { data: existingDelegation } = await supabase
        .from('idea_delegations')
        .select('*')
        .eq('idea_id', idea.id)
        .eq('status', 'pending')
        .single()

      if (existingDelegation) {
        console.log(`Delegation already exists for idea ${idea.id}`)
        continue
      }

      // 最も貢献度の高いユーザーを見つける
      const topContributor = await findTopContributor(supabase, idea.id)
      if (!topContributor) {
        console.log(`No suitable contributor found for idea ${idea.id}`)
        continue
      }

      // 委譲リクエストを作成
      const { error: delegationError } = await supabase
        .from('idea_delegations')
        .insert({
          idea_id: idea.id,
          from_user_id: idea.user_id,
          to_user_id: topContributor.id,
          reason: 'INACTIVITY'
        })

      if (delegationError) {
        console.error('Failed to create delegation:', delegationError)
        result.errors.push(`Failed to create delegation for idea ${idea.id}`)
        continue
      }

      // 委譲通知を送信
      await sendDelegationNotifications(supabase, idea.id, idea.user_id, topContributor.id, idea.title)

      result.delegations.push({
        ideaId: idea.id,
        fromUserId: idea.user_id,
        toUserId: topContributor.id,
        reason: 'Inactivity delegation'
      })

      console.log(`Created delegation request for idea ${idea.id}`)
    }

    console.log(`✅ Inactive check completed: ${result.delegations.length} delegations`)
    return result
  } catch (error) {
    console.error('Error in checkInactiveIdeas:', error)
    result.success = false
    result.errors.push(`Inactive check failed: ${error.message}`)
    return result
  }
}

async function findTopContributor(supabase: any, ideaId: string): Promise<{ id: string } | null> {
  try {
    // いいねをしたユーザーを取得
    const { data: likes } = await supabase
      .from('likes')
      .select('user_id')
      .eq('idea_id', ideaId)

    // コメントをしたユーザーを取得
    const { data: comments } = await supabase
      .from('comments')
      .select('user_id')
      .eq('idea_id', ideaId)

    const contributors: Record<string, number> = {}

    // いいね貢献度
    likes?.forEach((like: any) => {
      contributors[like.user_id] = (contributors[like.user_id] || 0) + 1
    })

    // コメント貢献度（より高い重み）
    comments?.forEach((comment: any) => {
      contributors[comment.user_id] = (contributors[comment.user_id] || 0) + 2
    })

    // 最も貢献度の高いユーザーを選択
    const topContributorId = Object.entries(contributors)
      .sort((a, b) => b[1] - a[1])[0]?.[0]

    return topContributorId ? { id: topContributorId } : null
  } catch (error) {
    console.error('Error finding top contributor:', error)
    return null
  }
}

async function sendPromotionNotification(
  supabase: any,
  ideaId: string,
  fromStatus: string,
  toStatus: string,
  reason: string
): Promise<void> {
  try {
    const { data: idea } = await supabase
      .from('ideas')
      .select('title, user_id')
      .eq('id', ideaId)
      .single()

    if (!idea?.user_id) return

    await supabase
      .from('notifications')
      .insert({
        user_id: idea.user_id,
        idea_id: ideaId,
        type: 'STATUS_CHANGE',
        title: '🎉 アイデアが自動昇格しました！',
        message: `「${idea.title}」が${fromStatus}から${toStatus}に進化しました。${reason}`,
        action_required: false,
        data: {
          from_status: fromStatus,
          to_status: toStatus,
          reason: reason,
          automated: true
        }
      })
  } catch (error) {
    console.error('Error sending promotion notification:', error)
  }
}

async function sendDelegationNotifications(
  supabase: any,
  ideaId: string,
  fromUserId: string,
  toUserId: string,
  ideaTitle: string
): Promise<void> {
  try {
    // 新しいオーナーに通知
    await supabase
      .from('notifications')
      .insert({
        user_id: toUserId,
        idea_id: ideaId,
        type: 'DELEGATION',
        title: 'アイデアの委譲リクエスト',
        message: `「${ideaTitle}」の管理権限が委譲されました。元の作者が14日間非アクティブのため、あなたが新しいオーナーに選ばれました。`,
        action_required: true,
        data: {
          delegation_id: ideaId,
          from_user_id: fromUserId,
          reason: 'INACTIVITY'
        }
      })

    // 元のオーナーにも通知
    await supabase
      .from('notifications')
      .insert({
        user_id: fromUserId,
        idea_id: ideaId,
        type: 'DELEGATION',
        title: 'アイデアが委譲されました',
        message: `「${ideaTitle}」の管理権限が他のユーザーに委譲されました。14日間の非アクティブが原因です。`,
        action_required: false,
        data: {
          to_user_id: toUserId,
          reason: 'INACTIVITY'
        }
      })
  } catch (error) {
    console.error('Error sending delegation notifications:', error)
  }
}