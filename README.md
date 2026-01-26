# YouTube My Collection

YouTubeで良かった動画を後から見返せる公開コレクションのフロント実装。

## 状態
- `front/` に Next.js + Tailwind でUI実装済み
- データは `/api/videos` 経由で取得（Prisma + Supabase Postgres）
- 画面はリスト/詳細/ログイン/追加/編集を実装
- デザインは `base/` のUIを再現（日本語UI）
- Supabase AuthのGoogle OAuth + allowlistで管理者操作を保護

## 起動
```bash
cd front
npm install
npm run dev
```

## 主要ファイル
- `front/src/app/page.tsx`: 画面/UI本体
- `front/src/app/api/videos/*`: Videos API
- `front/src/lib/types.ts`: 型定義
- `front/src/components/*`: UI部品
- `docs/`: 要件・仕様・設計ドキュメント

## メモ
- ログアウト時は必ずリストへ戻る
- 背景色は薄いピンク(#fff4f4)でカードとのコントラストを確保
- CRUD成功時は右上に通知を表示
