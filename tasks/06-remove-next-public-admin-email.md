# タスク06: `NEXT_PUBLIC_ADMIN_EMAIL` 依存の除去

## 目的
管理者メールアドレスがクライアントへ露出しないようにしつつ、「許可メール以外は拒否」の仕様を維持する。

## 範囲
- クライアント側の `NEXT_PUBLIC_ADMIN_EMAIL` 参照削除
- 管理者判定の `/api/auth/admin` への一本化
- 認証/環境変数ドキュメントの更新

## 手順
- `front/src/lib/auth.ts` からメール比較ロジックを削除
- `front/src/app/page.tsx` の管理者判定をサーバー確認に変更
- 非管理者ログイン時の拒否フロー（サインアウト + 通知）を維持
- `docs/04-auth-security.md`, `docs/11-supabase-setup.md` を更新
- `rg -n "NEXT_PUBLIC_ADMIN_EMAIL"` で残存確認

## 受け入れ基準
- `NEXT_PUBLIC_ADMIN_EMAIL` がコード/ドキュメントに残っていない
- 管理者のみ追加/編集/削除が可能
- 非管理者はログインしても管理操作できない

## 進捗
- 完了

## 確認結果
- `front/src/` から `NEXT_PUBLIC_ADMIN_EMAIL` 参照を削除
- 管理者判定は `/api/auth/admin` + `ADMIN_EMAIL` に統一
- `/api/auth/admin` のBearerトークン処理を `supabase.auth.getUser(token)` に統一し、401を解消

## 検証
- `npm run lint` 実行（エラーなし）
- `npm run build` 実行（成功）
- 本番環境でログイン確認し、401が解消したことを確認

## 関連PR
- https://github.com/kojikawazu/youtube-my-collection/pull/28
- https://github.com/kojikawazu/youtube-my-collection/pull/29
