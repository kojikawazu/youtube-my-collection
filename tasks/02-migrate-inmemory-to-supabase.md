# タスク02: インメモリからSupabaseへ移行

## 目的
インメモリの`INITIAL_VIDEOS`をSupabase永続化へ置き換える。

## 範囲
- Supabaseスキーマ定義（Prismaまたは直接）
- リポジトリ/データアクセス層の作成
- Next.js Route HandlersでCRUD実装
- UI側のデータ取得をAPI経由に変更

## 手順
- `front/` にPrismaスキーマを追加しSupabaseへ接続
- `video_entries` のマイグレーション作成
- `GET /api/videos` と `GET /api/videos/:id` を実装
- `POST /api/videos`, `PATCH /api/videos/:id`, `DELETE /api/videos/:id` を実装
- UIの`useState(INITIAL_VIDEOS)`をAPIフェッチへ置き換え

## 注意
- UI構成は現状のまま維持
- 並び順（追加/公開/評価）を維持

## 進捗
- Prismaスキーマ追加
- API Route HandlersでCRUD実装
- UIはAPI経由に切替済み

## 残り
- UI入力バリデーション強化(対応中)
- サムネ/タイトル自動取得の正式化
- エラーハンドリング整理
