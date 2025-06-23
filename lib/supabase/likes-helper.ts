import { createClient } from './client'
import { IdeaProgressionService } from '../services/idea-progression'
import { NotificationService } from '../services/notification-service'

interface LikeOperation {
  ideaId: string
  walletAddress: string
}

interface LikeResult {
  success: boolean
  liked?: boolean
  likesCount?: number
  progressionTriggered?: boolean
  newStatus?: string
  error?: string
}

/**
 * Safe wrapper for likes operations that handles RLS requirements
 */
export class LikesHelper {
  private static async ensureUserExists(supabase: any, walletAddress: string) {
    // Check if user exists
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .maybeSingle()

    if (userError) {
      console.error('Error checking user:', userError)
      return null
    }

    if (!userData) {
      // Create user if doesn't exist
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          wallet_address: walletAddress,
          nickname: `User_${walletAddress.slice(-4)}`
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return null
      }
      
      return newUser
    }

    return userData
  }

  static async checkLikeStatus({ ideaId, walletAddress }: LikeOperation): Promise<LikeResult> {
    const supabase = createClient()
    
    if (!supabase) {
      // Fallback to localStorage
      const empathizedKey = `empathized_${walletAddress}`
      const empathized = JSON.parse(localStorage.getItem(empathizedKey) || '[]')
      return { success: true, liked: empathized.includes(ideaId) }
    }

    try {
      // Set wallet for RLS
      const { error: walletError } = await supabase.rpc('set_current_user_wallet', { 
        wallet_address: walletAddress 
      })
      
      if (walletError) {
        console.warn('Failed to set wallet, using localStorage fallback:', walletError)
        const empathizedKey = `empathized_${walletAddress}`
        const empathized = JSON.parse(localStorage.getItem(empathizedKey) || '[]')
        return { success: true, liked: empathized.includes(ideaId) }
      }

      // Get user
      const userData = await this.ensureUserExists(supabase, walletAddress)
      if (!userData) {
        return { success: true, liked: false }
      }

      // Check like status - with proper error handling for 406
      try {
        const { data: likes, error: likesError } = await supabase
          .from('likes')
          .select('id')
          .eq('idea_id', ideaId)
          .eq('user_id', userData.id)

        if (likesError) {
          if (likesError.code === 'PGRST301' || likesError.message?.includes('406')) {
            console.warn('RLS policy issue, using direct query approach')
            // Try alternative approach
            const { data: altLikes } = await supabase
              .from('likes')
              .select('id')
              .match({ idea_id: ideaId, user_id: userData.id })
            
            return { success: true, liked: !!(altLikes && altLikes.length > 0) }
          }
          throw likesError
        }

        return { success: true, liked: !!(likes && likes.length > 0) }
      } catch (queryError) {
        console.warn('Likes query failed, using localStorage:', queryError)
        const empathizedKey = `empathized_${walletAddress}`
        const empathized = JSON.parse(localStorage.getItem(empathizedKey) || '[]')
        return { success: true, liked: empathized.includes(ideaId) }
      }
    } catch (error) {
      console.error('Error in checkLikeStatus:', error)
      // Final fallback
      const empathizedKey = `empathized_${walletAddress}`
      const empathized = JSON.parse(localStorage.getItem(empathizedKey) || '[]')
      return { success: true, liked: empathized.includes(ideaId) }
    }
  }

  static async toggleLike({ ideaId, walletAddress }: LikeOperation): Promise<LikeResult> {
    const supabase = createClient()
    
    if (!supabase) {
      // Handle locally
      const empathizedKey = `empathized_${walletAddress}`
      const empathized = JSON.parse(localStorage.getItem(empathizedKey) || '[]')
      const isLiked = empathized.includes(ideaId)
      
      if (isLiked) {
        const updated = empathized.filter((id: string) => id !== ideaId)
        localStorage.setItem(empathizedKey, JSON.stringify(updated))
      } else {
        empathized.push(ideaId)
        localStorage.setItem(empathizedKey, JSON.stringify(empathized))
      }
      
      return { success: true, liked: !isLiked, likesCount: 0 }
    }

    try {
      // Set wallet for RLS
      const { error: walletError } = await supabase.rpc('set_current_user_wallet', { 
        wallet_address: walletAddress 
      })
      
      if (walletError) {
        throw new Error('Failed to set wallet: ' + walletError.message)
      }

      // Ensure user exists
      const userData = await this.ensureUserExists(supabase, walletAddress)
      if (!userData) {
        throw new Error('Failed to create or find user')
      }

      const userId = userData.id

      // Check current like status
      const currentStatus = await this.checkLikeStatus({ ideaId, walletAddress })
      const isCurrentlyLiked = currentStatus.liked || false

      if (isCurrentlyLiked) {
        // Remove like
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .match({ idea_id: ideaId, user_id: userId })

        if (deleteError) throw deleteError
      } else {
        // Add like
        const { error: insertError } = await supabase
          .from('likes')
          .insert({ idea_id: ideaId, user_id: userId })

        if (insertError) throw insertError
      }

      // Update local storage as well
      const empathizedKey = `empathized_${walletAddress}`
      const empathized = JSON.parse(localStorage.getItem(empathizedKey) || '[]')
      
      if (isCurrentlyLiked) {
        const updated = empathized.filter((id: string) => id !== ideaId)
        localStorage.setItem(empathizedKey, JSON.stringify(updated))
      } else {
        if (!empathized.includes(ideaId)) {
          empathized.push(ideaId)
          localStorage.setItem(empathizedKey, JSON.stringify(empathized))
        }
      }

      // Get updated likes count and idea info
      const { data: ideaData } = await supabase
        .from('ideas')
        .select('likes_count, status, user_id')
        .eq('id', ideaId)
        .single()

      const newLikesCount = ideaData?.likes_count || 0

      // Update the likes_count in the ideas table to trigger progression check
      await supabase
        .from('ideas')
        .update({ 
          likes_count: isCurrentlyLiked ? Math.max(0, newLikesCount - 1) : newLikesCount + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', ideaId)

      const finalLikesCount = isCurrentlyLiked ? Math.max(0, newLikesCount - 1) : newLikesCount + 1

      // Record activity for progression tracking
      const progressionService = new IdeaProgressionService()
      if (userData.id) {
        await progressionService.recordActivity(userData.id, ideaId, 'LIKE')
      }

      // Check for progression after like
      let progressionTriggered = false
      let newStatus = undefined

      if (!isCurrentlyLiked) { // Only check progression on new likes
        try {
          const progressionResult = await progressionService.checkProgressionEligibility(ideaId)
          if (progressionResult.success && progressionResult.newStatus) {
            progressionTriggered = true
            newStatus = progressionResult.newStatus
          }
        } catch (error) {
          console.warn('Error checking progression:', error)
        }

        // Check for like milestones
        const milestones = [5, 10, 25, 50, 100, 250, 500, 1000]
        if (milestones.includes(finalLikesCount) && ideaData?.user_id) {
          const notificationService = new NotificationService()
          await notificationService.sendLikeMilestoneNotification(
            ideaId,
            ideaData.user_id,
            finalLikesCount,
            finalLikesCount
          )
        }
      }

      return { 
        success: true, 
        liked: !isCurrentlyLiked, 
        likesCount: finalLikesCount,
        progressionTriggered,
        newStatus
      }
    } catch (error) {
      console.error('Error in toggleLike:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}