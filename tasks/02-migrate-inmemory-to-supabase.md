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

## 進捗
- 完了（Issue #2 対応済み）

## メモ
- 追加/編集/削除は認証が必要（Supabase Auth + allowlist）
