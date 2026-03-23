# リスト画面ローディング高速化

## 背景

投稿数の増加に伴いリスト画面のローディング時間が増加。
主な原因は Vercel サーバレス関数のコールドスタートとキャッシュ不在。

## 実施内容（Step A）

### 1. Cache-Control ヘッダー追加

**ファイル:** `front/src/app/api/videos/route.ts`

GET /api/videos のレスポンスに以下のヘッダーを追加:

```
Cache-Control: public, s-maxage=30, stale-while-revalidate=59
```

| ディレクティブ | 効果 |
|---------------|------|
| `public` | CDN がキャッシュ可能 |
| `s-maxage=30` | Vercel CDN が 30 秒間キャッシュ |
| `stale-while-revalidate=59` | 30〜89 秒は stale を即座に返しつつバックグラウンドで再検証 |

- POST/PATCH/DELETE には付与しない
- Vercel CDN はクエリ文字列をキャッシュキーに含むため、`sort` / `offset` / `q` 等が異なるリクエストは別のキャッシュエントリになる

### CRUD 後のキャッシュバスティング

管理者が追加・編集・削除した後の一覧再取得は、CDN キャッシュを迂回して最新データを取得する必要がある。
`useVideos.ts` の `loadVideos` に `bustCache` パラメータを追加し、mutation 後の再取得では `_t=<timestamp>` クエリパラメータを付与して CDN キャッシュミスを強制する。

| 経路 | bustCache |
|------|-----------|
| ページ遷移・ソート・検索（通常の閲覧） | `false` — CDN キャッシュを活用 |
| `refreshListPage` / `refreshCurrentPage`（mutation 後） | `true` — CDN を迂回 |
| `refreshListPage` でページ番号が変わる場合 | `bustCacheNextRef` 経由で次の useEffect に伝播 |

これにより `docs/16-atomic-design-plan.md` の受け入れ条件（追加後に「リストに反映」、削除後に「リストから消える」）との整合性を維持する。

### 2. スケルトンローディング UI

**新規ファイル:** `front/src/components/molecules/SkeletonCard.tsx`

VideoCard のレイアウトに合致するスケルトンカード。
`animate-pulse` で読み込み中であることを視覚的に伝える。

### 3. VideoList ローディング改善

**ファイル:** `front/src/components/organisms/VideoList.tsx`

| 状態 | 表示 |
|------|------|
| 初回ロード (`isLoading && videos.length === 0`) | スケルトンカード 10 枚 |
| ページ遷移/ソート変更 (`isLoading && videos.length > 0`) | 既存カード + ページネーション全体が半透明 (`opacity-50`) + `pointer-events-none`（連打防止） |
| データ取得完了 | カード通常表示 |
| エラー | エラーバナー（変更なし） |

## 未実施（Step B: 将来課題）

- Prisma `select` で一覧取得から `goodPoints` / `memo` を除外
- 詳細遷移時に `GET /api/videos/:id` を個別 fetch
- 現状は詳細画面がリスト API のデータをそのまま使用しているため、Step B にはデータフロー変更が必要

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `front/src/app/api/videos/route.ts` | Cache-Control ヘッダー追加 |
| `front/src/hooks/useVideos.ts` | `bustCache` パラメータ + `bustCacheNextRef` でmutation後のCDN迂回 |
| `front/src/components/molecules/SkeletonCard.tsx` | 新規作成 |
| `front/src/components/organisms/VideoList.tsx` | スケルトン + カード・ページネーション全体のオーバーレイ |

## 検証結果

- `npm run build` — 成功
- `npm run lint` — エラーなし
- E2E テスト 12 ケース — 全通過
