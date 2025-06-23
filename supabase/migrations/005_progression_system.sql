-- 005_progression_system.sql
-- プログレッションシステムのためのテーブルとトリガー

-- 通知テーブル
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'STATUS_CHANGE', 'DELEGATION', 'LIKE_MILESTONE', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_required BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    data JSONB, -- 追加のメタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- プログレッション履歴テーブル
CREATE TABLE idea_progressions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- 'LIKE_THRESHOLD', 'MANUAL', 'DELEGATION', etc.
    trigger_data JSONB,
    triggered_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 委譲履歴テーブル
CREATE TABLE idea_delegations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    reason VARCHAR(100) NOT NULL, -- 'INACTIVITY', 'MANUAL', 'TOP_CONTRIBUTOR'
    delegated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'accepted', 'declined'
);

-- アクティビティ追跡テーブル（最後のアクティビティを記録）
CREATE TABLE user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'LIKE', 'COMMENT', 'EDIT', 'STATUS_CHANGE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, idea_id, activity_type, created_at)
);

-- プログレッション設定テーブル
CREATE TABLE progression_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_status VARCHAR(20) NOT NULL,
    to_status VARCHAR(20) NOT NULL,
    like_threshold_percentage DECIMAL(5,2), -- いいね率の閾値 (例: 30.00)
    minimum_likes INTEGER DEFAULT 5, -- 最小いいね数
    inactivity_days INTEGER, -- 非アクティブ日数
    auto_progression BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_status, to_status)
);

-- デフォルトのプログレッション設定を挿入
INSERT INTO progression_settings (from_status, to_status, like_threshold_percentage, minimum_likes, inactivity_days) VALUES
('idea', 'pre-draft', 30.00, 5, NULL),
('pre-draft', 'draft', 40.00, 10, 14),
('draft', 'commit', 50.00, 15, 21),
('commit', 'in-progress', NULL, NULL, 7), -- 手動のみ
('in-progress', 'test', NULL, NULL, 30),
('test', 'finish', NULL, NULL, 14);

-- RLS ポリシー
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_settings ENABLE ROW LEVEL SECURITY;

-- 通知は自分のもののみ見える
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = (SELECT id FROM users WHERE wallet_address = current_setting('app.current_user_wallet', true)));

-- プログレッション履歴は全て見える（公開情報）
CREATE POLICY "Anyone can view idea progressions" ON idea_progressions
    FOR SELECT USING (true);

-- 委譲履歴も公開
CREATE POLICY "Anyone can view idea delegations" ON idea_delegations
    FOR SELECT USING (true);

-- アクティビティは公開
CREATE POLICY "Anyone can view user activities" ON user_activities
    FOR SELECT USING (true);

-- プログレッション設定は読み取り専用（管理者のみ編集）
CREATE POLICY "Anyone can view progression settings" ON progression_settings
    FOR SELECT USING (true);

-- トリガー: いいね数更新時にプログレッションをチェック
CREATE OR REPLACE FUNCTION check_idea_progression()
RETURNS TRIGGER AS $$
DECLARE
    total_users INTEGER;
    current_likes INTEGER;
    like_ratio DECIMAL(5,2);
    progression_rule RECORD;
    new_status VARCHAR(20);
BEGIN
    -- 総ユーザー数を取得
    SELECT COUNT(*) INTO total_users FROM users;
    
    -- 現在のいいね数を取得
    SELECT likes_count INTO current_likes FROM ideas WHERE id = NEW.id;
    
    -- いいね率を計算
    IF total_users > 0 THEN
        like_ratio := (current_likes::DECIMAL / total_users::DECIMAL) * 100;
    ELSE
        like_ratio := 0;
    END IF;
    
    -- 適用可能なプログレッションルールを検索
    SELECT * INTO progression_rule 
    FROM progression_settings 
    WHERE from_status = NEW.status 
        AND auto_progression = true
        AND like_threshold_percentage IS NOT NULL
        AND like_ratio >= like_threshold_percentage
        AND current_likes >= minimum_likes;
    
    IF FOUND THEN
        new_status := progression_rule.to_status;
        
        -- ステータスを更新
        UPDATE ideas 
        SET status = new_status, updated_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
        
        -- プログレッション履歴を記録
        INSERT INTO idea_progressions (idea_id, from_status, to_status, trigger_type, trigger_data)
        VALUES (NEW.id, NEW.status, new_status, 'LIKE_THRESHOLD', 
                json_build_object('like_ratio', like_ratio, 'likes_count', current_likes, 'total_users', total_users));
        
        -- 作者に通知
        INSERT INTO notifications (user_id, idea_id, type, title, message, action_required)
        SELECT user_id, NEW.id, 'STATUS_CHANGE', 
               'アイデアがレベルアップしました！',
               format('「%s」が%sに進化しました。いいね率: %.1f%%', NEW.title, new_status, like_ratio),
               false
        FROM ideas WHERE id = NEW.id AND user_id IS NOT NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- アイデアのlikes_count更新時にトリガーを実行
CREATE TRIGGER trigger_idea_progression
    AFTER UPDATE OF likes_count ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION check_idea_progression();

-- updated_atを自動更新する関数とトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progression_settings_updated_at
    BEFORE UPDATE ON progression_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();