-- Fix for likes table RLS policies to prevent 406 errors
-- This script updates the RLS policies to be less restrictive for SELECT operations

-- Drop existing likes policies
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
DROP POLICY IF EXISTS "Users can manage likes by wallet" ON likes;

-- Create new, more permissive policies for likes table

-- Policy 1: Anyone can view likes (no wallet requirement for SELECT)
CREATE POLICY "Public can view all likes" ON likes
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- Policy 2: Users can insert their own likes (requires wallet)
CREATE POLICY "Users can insert own likes by wallet" ON likes
  FOR INSERT 
  TO anon
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

-- Policy 3: Users can delete their own likes (requires wallet)
CREATE POLICY "Users can delete own likes by wallet" ON likes
  FOR DELETE 
  TO anon
  USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'likes'
ORDER BY policyname;