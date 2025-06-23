#!/usr/bin/env node

// Test script to verify Supabase likes table access
// Run with: node test-supabase-likes.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLikesAccess() {
  console.log('Testing Supabase likes table access...\n')
  
  const testWalletAddress = '0x1234567890123456789012345678901234567890'
  const testIdeaId = 'test-idea-id'
  
  try {
    // Test 1: Direct select without setting wallet
    console.log('Test 1: Direct SELECT without wallet set')
    const { data: data1, error: error1 } = await supabase
      .from('likes')
      .select('id')
      .limit(1)
    
    console.log('Result:', { data: data1, error: error1 })
    console.log('')
    
    // Test 2: Set wallet address first
    console.log('Test 2: Set wallet address via RPC')
    const { error: rpcError } = await supabase.rpc('set_current_user_wallet', {
      wallet_address: testWalletAddress
    })
    
    console.log('RPC Result:', { error: rpcError })
    console.log('')
    
    // Test 3: Select after setting wallet
    console.log('Test 3: SELECT after wallet set')
    const { data: data3, error: error3 } = await supabase
      .from('likes')
      .select('id')
      .limit(1)
    
    console.log('Result:', { data: data3, error: error3 })
    console.log('')
    
    // Test 4: Check RLS policy details
    console.log('Test 4: Check if we can query with specific conditions')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', testWalletAddress)
      .single()
    
    console.log('User lookup:', { data: userData, error: userError })
    
    if (userData) {
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userData.id)
        .limit(1)
      
      console.log('Likes with user_id:', { data: likesData, error: likesError })
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testLikesAccess()