-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (wallet_address = current_setting('app.current_user_wallet'::text, true));

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (wallet_address = current_setting('app.current_user_wallet'::text, true));

-- Ideas policies
CREATE POLICY "Anyone can view published ideas" ON ideas
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own ideas" ON ideas
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

CREATE POLICY "Users can update own ideas" ON ideas
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

CREATE POLICY "Users can delete own ideas" ON ideas
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

-- Comments policies
CREATE POLICY "Anyone can view comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

-- Likes policies
CREATE POLICY "Anyone can view likes" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage own likes" ON likes
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

-- Collaborations policies
CREATE POLICY "Users can view collaborations for their ideas" ON collaborations
  FOR SELECT USING (
    idea_id IN (
      SELECT id FROM ideas WHERE user_id IN (
        SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
      )
    )
    OR user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

CREATE POLICY "Users can request collaboration" ON collaborations
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

CREATE POLICY "Idea owners can manage collaboration requests" ON collaborations
  FOR UPDATE USING (
    idea_id IN (
      SELECT id FROM ideas WHERE user_id IN (
        SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
      )
    )
  );

-- Create a function to set the current user context
CREATE OR REPLACE FUNCTION set_current_user_wallet(wallet_address TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_wallet', wallet_address, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;