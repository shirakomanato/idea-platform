# Idea Platform - Web3アイデア共創プラットフォーム

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![MetaMask](https://img.shields.io/badge/MetaMask-Auth-orange?style=for-the-badge&logo=ethereum)](https://metamask.io/)

## 概要

Idea Platformは、Web3技術を活用したアイデア共創プラットフォームです。MetaMaskウォレット認証により、ユーザーは安全にアイデアを投稿・共有・評価できます。

### 主な機能

- 🦊 **MetaMaskウォレット認証** - 安全でシンプルなWeb3認証
- 💡 **アイデア投稿** - Why/What/How/Impact形式での構造化されたアイデア投稿
- 🤖 **AI生成支援** - GPT-4を使用したアイデア詳細の自動生成
- 📱 **スワイプUI** - Tinder風の直感的なアイデア閲覧体験
- 🔄 **リアルタイム更新** - Supabaseによるリアルタイムデータ同期
- 💬 **コメント&いいね** - コミュニティとのインタラクション

## 技術スタック

- **Frontend**: Next.js 15.2.4 (App Router), React 19, TypeScript
- **UI/UX**: Tailwind CSS, shadcn/ui, Radix UI
- **Database**: Supabase (PostgreSQL + Realtime)
- **State**: Zustand
- **Web3**: MetaMask Integration
- **AI**: OpenAI GPT-4

## セットアップ

### 必要な環境

- Node.js 18+
- pnpm
- MetaMask拡張機能
- Supabaseアカウント

### インストール手順

1. リポジトリをクローン
```bash
git clone https://github.com/shirakomanato/idea-platform.git
cd idea-platform
```

2. 依存関係をインストール
```bash
pnpm install
```

3. 環境変数を設定
```bash
cp .env.local.example .env.local
```

4. `.env.local`に必要な値を設定
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

5. 開発サーバーを起動
```bash
pnpm dev
```

## データベース設定

Supabaseプロジェクトで以下のマイグレーションを実行してください：

```bash
supabase/migrations/
├── 001_initial_schema.sql
├── 002_rls_policies.sql
├── 003_add_wallet_address_to_ideas.sql
└── 004_wallet_address_policies.sql
```

## デプロイ

### Vercelへのデプロイ

1. Vercelでプロジェクトをインポート
2. 環境変数を設定
3. デプロイ

```bash
pnpm build
pnpm start
```

## ライセンス

MIT