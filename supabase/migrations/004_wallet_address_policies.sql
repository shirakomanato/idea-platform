-- Drop existing RLS policies for ideas table
DROP POLICY IF EXISTS "Users can insert own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete own ideas" ON ideas;

-- Create new wallet address based policies

-- Allow insert with wallet address (temporary solution)
CREATE POLICY "Allow insert with wallet address" ON ideas
  FOR INSERT 
  TO anon
  WITH CHECK (wallet_address IS NOT NULL AND wallet_address != '');

-- Allow users to update their own ideas based on wallet address
CREATE POLICY "Users can update own ideas by wallet" ON ideas
  FOR UPDATE 
  TO anon
  USING (wallet_address IS NOT NULL AND wallet_address = current_setting('app.current_user_wallet'::text, true));

-- Allow users to delete their own ideas based on wallet address
CREATE POLICY "Users can delete own ideas by wallet" ON ideas
  FOR DELETE 
  TO anon
  USING (wallet_address IS NOT NULL AND wallet_address = current_setting('app.current_user_wallet'::text, true));

-- Allow anyone to view ideas (no change)
-- The existing "Anyone can view published ideas" policy should remain

-- Update likes table policies to work with wallet addresses
DROP POLICY IF EXISTS "Authenticated users can manage own likes" ON likes;

-- For likes table, we need to handle the user_id reference
-- Create a more flexible likes policy
CREATE POLICY "Users can manage likes by wallet" ON likes
  FOR ALL 
  TO anon
  USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

-- Update comments table policies
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

CREATE POLICY "Users can insert comments by wallet" ON comments
  FOR INSERT 
  TO anon
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

CREATE POLICY "Users can update own comments by wallet" ON comments
  FOR UPDATE 
  TO anon
  USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

CREATE POLICY "Users can delete own comments by wallet" ON comments
  FOR DELETE 
  TO anon
  USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );