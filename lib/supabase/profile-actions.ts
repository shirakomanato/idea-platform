import { createClient } from './client'

/**
 * Update user profile in Supabase
 */
export async function updateUserProfile(walletAddress: string, updates: {
  nickname?: string
  bio?: string
  avatar_url?: string
}) {
  console.log('updateUserProfile called with:', { walletAddress, updates })
  
  const supabase = createClient()
  
  try {
    // First, check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, wallet_address, nickname')
      .eq('wallet_address', walletAddress)
      .single()

    console.log('Fetch user result:', { existingUser, fetchError })

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Unexpected fetch error:', fetchError)
      throw fetchError
    }

    if (!existingUser) {
      console.log('User not found, creating new user...')
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          wallet_address: walletAddress,
          ...updates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      console.log('Created new user:', newUser)
      return newUser
    } else {
      // User exists, update their profile
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      console.log('Updated user profile:', updatedUser)
      return updatedUser
    }
  } catch (error) {
    console.error('Error updating user profile details:', {
      error,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      walletAddress,
      updates,
      errorString: String(error),
      errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error))
    })
    throw error
  }
}

/**
 * Get user profile from Supabase
 */
export async function getUserProfile(walletAddress: string) {
  console.log('getUserProfile called with:', { walletAddress })
  
  const supabase = createClient()
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    console.log('Retrieved user profile:', user)
    return user
  } catch (error) {
    console.error('Error getting user profile:', error)
    throw error
  }
}

/**
 * Check if nickname is available
 */
export async function checkNicknameAvailability(nickname: string, currentWalletAddress?: string) {
  console.log('checkNicknameAvailability called with:', { nickname, currentWalletAddress })
  
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('users')
      .select('wallet_address')
      .eq('nickname', nickname)

    // Exclude current user if updating their own nickname
    if (currentWalletAddress) {
      query = query.neq('wallet_address', currentWalletAddress)
    }

    const { data: existingUsers, error } = await query

    if (error) {
      throw error
    }

    const isAvailable = !existingUsers || existingUsers.length === 0
    console.log('Nickname availability:', { nickname, isAvailable })
    
    return {
      available: isAvailable,
      conflictUsers: existingUsers || []
    }
  } catch (error) {
    console.error('Error checking nickname availability:', error)
    throw error
  }
}