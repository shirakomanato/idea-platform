-- ================================================
-- Supabase Setup Script for Idea Platform
-- ================================================
-- このスクリプトをSupabaseのSQL Editorで実行してください
-- 
-- 実行順序：
-- 1. このスクリプト全体を実行
-- 2. RLSが有効になっていることを確認
-- 3. 必要に応じてユーザーを作成
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. Initial Schema
-- ================================================

-- Users table (connected via MetaMask wallet)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT,
  title TEXT NOT NULL,
  target TEXT NOT NULL,
  why_description TEXT NOT NULL,
  what_description TEXT NOT NULL DEFAULT '',
  how_description TEXT NOT NULL DEFAULT '',
  impact_description TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'pre-draft', 'draft', 'commit', 'in-progress', 'test', 'finish', 'archive')),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(idea_id, user_id)
);

-- Collaborations table (for co-existence feature)
CREATE TABLE IF NOT EXISTS collaborations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'contributor' CHECK (role IN ('contributor', 'co-owner', 'mentor')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(idea_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_idea_id ON comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_idea_id ON likes(idea_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_idea_id ON collaborations(idea_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);

-- Create functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ideas_updated_at ON ideas;
CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collaborations_updated_at ON collaborations;
CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON collaborations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create functions to update counters
CREATE OR REPLACE FUNCTION update_idea_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ideas SET likes_count = likes_count + 1 WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ideas SET likes_count = likes_count - 1 WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_idea_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ideas SET comments_count = comments_count + 1 WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ideas SET comments_count = comments_count - 1 WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers for counter updates
DROP TRIGGER IF EXISTS trigger_update_idea_likes_count ON likes;
CREATE TRIGGER trigger_update_idea_likes_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_idea_likes_count();

DROP TRIGGER IF EXISTS trigger_update_idea_comments_count ON comments;
CREATE TRIGGER trigger_update_idea_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_idea_comments_count();

-- ================================================
-- 2. Enable RLS (Row Level Security)
-- ================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 3. RLS Policies
-- ================================================

-- Users table policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (wallet_address = current_setting('app.current_user_wallet'::text, true));

-- Ideas table policies
DROP POLICY IF EXISTS "Anyone can view published ideas" ON ideas;
CREATE POLICY "Anyone can view published ideas" ON ideas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert with wallet address" ON ideas;
CREATE POLICY "Allow insert with wallet address" ON ideas
  FOR INSERT 
  TO anon
  WITH CHECK (wallet_address IS NOT NULL AND wallet_address != '');

DROP POLICY IF EXISTS "Users can update own ideas by wallet" ON ideas;
CREATE POLICY "Users can update own ideas by wallet" ON ideas
  FOR UPDATE 
  TO anon
  USING (wallet_address IS NOT NULL AND wallet_address = current_setting('app.current_user_wallet'::text, true));

DROP POLICY IF EXISTS "Users can delete own ideas by wallet" ON ideas;
CREATE POLICY "Users can delete own ideas by wallet" ON ideas
  FOR DELETE 
  TO anon
  USING (wallet_address IS NOT NULL AND wallet_address = current_setting('app.current_user_wallet'::text, true));

-- Comments table policies
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
CREATE POLICY "Anyone can view comments" ON comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert comments by wallet" ON comments;
CREATE POLICY "Users can insert comments by wallet" ON comments
  FOR INSERT 
  TO anon
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

DROP POLICY IF EXISTS "Users can update own comments by wallet" ON comments;
CREATE POLICY "Users can update own comments by wallet" ON comments
  FOR UPDATE 
  TO anon
  USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

DROP POLICY IF EXISTS "Users can delete own comments by wallet" ON comments;
CREATE POLICY "Users can delete own comments by wallet" ON comments
  FOR DELETE 
  TO anon
  USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

-- Likes table policies
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
CREATE POLICY "Anyone can view likes" ON likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage likes by wallet" ON likes;
CREATE POLICY "Users can manage likes by wallet" ON likes
  FOR ALL 
  TO anon
  USING (
    user_id IN (
      SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet'::text, true)
    )
  );

-- Collaborations table policies
DROP POLICY IF EXISTS "Anyone can view accepted collaborations" ON collaborations;
CREATE POLICY "Anyone can view accepted collaborations" ON collaborations
  FOR SELECT USING (status = 'accepted' OR user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can request collaboration" ON collaborations;
CREATE POLICY "Authenticated users can request collaboration" ON collaborations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage own collaborations" ON collaborations;
CREATE POLICY "Users can manage own collaborations" ON collaborations
  FOR UPDATE USING (user_id = auth.uid());

-- ================================================
-- 4. Functions for wallet-based operations
-- ================================================

CREATE OR REPLACE FUNCTION set_current_user_wallet(wallet_address text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_wallet', wallet_address, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon users
GRANT EXECUTE ON FUNCTION set_current_user_wallet(text) TO anon;

-- ================================================
-- 5. Sample Data (Optional)
-- ================================================

-- Uncomment below to insert sample data
/*
-- Insert sample user
INSERT INTO users (wallet_address, nickname, bio) VALUES 
('0x1234567890123456789012345678901234567890', 'サンプルユーザー', 'Web3エンジニア');

-- Get the user id for foreign key references
WITH sample_user AS (
  SELECT id FROM users WHERE wallet_address = '0x1234567890123456789012345678901234567890' LIMIT 1
)
-- Insert sample ideas
INSERT INTO ideas (user_id, wallet_address, title, target, why_description, what_description, how_description, impact_description, status) 
SELECT 
  id,
  '0x1234567890123456789012345678901234567890',
  'AI駆動型学習プラットフォーム',
  '学習効率を向上させたい学生・社会人',
  '従来の学習方法では個人の理解度に合わせた最適化が困難',
  'AIが学習者の理解度を分析し、最適な学習パスを提案するプラットフォーム',
  'Machine Learning + 適応学習アルゴリズム + ゲーミフィケーション',
  '学習効率30%向上、継続率80%改善を目指す',
  'idea'
FROM sample_user;
*/

-- ================================================
-- Setup Complete!
-- ================================================
-- 次のステップ：
-- 1. Supabase DashboardでAnon KeyとService Role Keyを取得
-- 2. .env.localファイルに設定
-- 3. pnpm dev でアプリケーションを起動