# タスク01: Supabase Postgres 初期構築

## 目的
Supabaseプロジェクトを作成し、DBアクセスの準備を整える。

## 範囲
- Supabaseプロジェクト作成
- 接続情報/キーの取得
- 環境変数の雛形を用意
- ローカル疎通の確認

## 手順
- Supabaseプロジェクト作成（name: youtube-my-collection）
- DBパスワード作成
- Project URL / anon key / service role key を取得
- `front/.env.local` に追加（値はローカルのみ）
- Supabaseダッシュボード or SDKで疎通確認

## 注意
- キーはコミットしない
- `.env.local` を使用する
