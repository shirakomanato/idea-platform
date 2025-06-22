# デプロイメントガイド

## 本番環境へのデプロイ手順

### 1. Vercelでのデプロイ

1. **Vercelアカウントを作成**
   - https://vercel.com でアカウント作成

2. **GitHubリポジトリを接続**
   - "New Project" → GitHubリポジトリを選択
   - `shirakomanato/idea-platform` を選択

3. **環境変数の設定**
   Vercelのプロジェクト設定で以下の環境変数を追加：

   **方法1: Vercel Dashboardで設定（推奨）**
   - Project Settings → Environment Variables
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://bimzstqncmvadktxjnbq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[Supabase Anon Key]
   SUPABASE_SERVICE_ROLE_KEY=[Supabase Service Role Key]
   OPENAI_API_KEY=[OpenAI API Key]
   ```
   
   **方法2: Vercel CLIで設定**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add OPENAI_API_KEY
   ```

4. **デプロイ実行**
   - "Deploy" ボタンをクリック
   - 自動的にビルドとデプロイが実行されます

### 2. Supabaseデータベースの設定

1. **Supabase Dashboard**にアクセス
   - https://app.supabase.com/project/bimzstqncmvadktxjnbq

2. **SQL Editorで初期設定**
   - `supabase/setup.sql` の内容を実行

3. **リアルタイム機能を有効化**
   - Database → Replication でテーブルのリアルタイム機能を有効化

### 3. 本番環境での確認事項

- [ ] MetaMask接続が正常に動作
- [ ] AI生成機能が動作
- [ ] データベースへの読み書きが正常
- [ ] リアルタイム更新が動作
- [ ] レスポンシブデザインが正常

### 4. 環境変数の説明

| 変数名 | 説明 | 取得場所 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー | Supabase Dashboard > Settings > API |
| `OPENAI_API_KEY` | OpenAI APIキー | https://platform.openai.com/api-keys |

### 5. トラブルシューティング

**AI生成機能が動作しない場合:**
- OpenAI APIキーが正しく設定されているか確認
- APIキーの使用量制限に達していないか確認

**データベース接続エラーの場合:**
- Supabase URLとキーが正しく設定されているか確認
- RLSポリシーが正しく設定されているか確認

**MetaMask接続エラーの場合:**
- HTTPSでアクセスしているか確認
- MetaMask拡張機能がインストールされているか確認