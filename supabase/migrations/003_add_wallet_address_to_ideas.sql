-- Add wallet_address column to ideas table for direct wallet address storage
ALTER TABLE ideas ADD COLUMN wallet_address TEXT;

-- Create index for wallet_address for better performance
CREATE INDEX idx_ideas_wallet_address ON ideas(wallet_address);

-- Update RLS policies to work with wallet_address as well
DROP POLICY IF EXISTS "Users can insert own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete own ideas" ON ideas;

-- New RLS policies that work with both user_id and wallet_address
CREATE POLICY "Users can insert own ideas" ON ideas
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
    OR wallet_address = current_setting('app.current_user_wallet'::text, true)
  );

CREATE POLICY "Users can update own ideas" ON ideas
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
    OR wallet_address = current_setting('app.current_user_wallet'::text, true)
  );

CREATE POLICY "Users can delete own ideas" ON ideas
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
    OR wallet_address = current_setting('app.current_user_wallet'::text, true)
  );