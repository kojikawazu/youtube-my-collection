# アトミックデザイン段階的導入計画

## 背景

`front/src/app/page.tsx` が1,053行に肥大化しており、表示ロジック・ビジネスロジック・状態管理がすべて1ファイルに集中している。
段階的にアトミックデザインを導入し、可読性・再利用性・保守性を向上させる。

## 目的

- page.tsx を ~250行まで縮小する
- UI部品を再利用可能なコンポーネントに分割する
- ロジックをカスタムフックに抽出し、表示と分離する
- 既存のE2Eテスト（12ケース）を壊さない

## 対象外

- 状態管理ライブラリ（Zustand等）の導入
- Storybook の導入
- コンポーネントの単体テスト追加（将来課題として別途検討）

---

## page.tsx の役割

page.tsx は**単一ルートのスクリーン切替コーディネーター**として残す。
所有する状態は `currentScreen` と `selectedVideo` のみ。
ビジネスロジック（認証・データ取得・CRUD）はすべてカスタムフックに委譲する。

## ディレクトリ構成（最終形）

```
front/src/
├── app/
│   └── page.tsx                  ← 画面切替コーディネーターのみ (~250行)
├── components/
│   ├── atoms/
│   │   ├── Rating.tsx            ← 既存を移動
│   │   └── Markdown.tsx          ← 既存を移動
│   ├── molecules/
│   │   ├── SearchBar.tsx         ← 検索アイコン + input
│   │   ├── SortSelect.tsx        ← 並び替えセレクト
│   │   ├── Pagination.tsx        ← ページ番号 + 前へ/次へ
│   │   ├── TagList.tsx           ← タグチップの並び
│   │   ├── Toast.tsx             ← トースト通知
│   │   └── SkeletonCard.tsx      ← ローディング用スケルトンカード
│   ├── organisms/
│   │   ├── Header.tsx            ← ナビゲーションバー
│   │   ├── VideoCard.tsx         ← カード1枚
│   │   ├── VideoDetail.tsx       ← 詳細画面全体
│   │   ├── VideoForm.tsx         ← 追加/編集フォーム
│   │   ├── LoginScreen.tsx       ← ログイン画面
│   │   └── Footer.tsx            ← フッター
│   └── Modal.tsx                 ← 既存のまま維持
└── hooks/
    ├── useAuth.ts                ← セッション管理・管理者判定・ログイン/ログアウト
    ├── useVideos.ts              ← 一覧取得・検索・ソート・ページネーション
    ├── useVideoForm.ts           ← フォーム状態・バリデーション・保存
    ├── useConfirmModal.ts        ← モーダル開閉・確認実行
    └── useToast.ts               ← トースト表示制御
```

## カスタムフック責務境界

各フックの責務と公開APIを以下に定義する。
フック間の依存は引数で注入し、フック同士が直接参照し合わない。

| フック | 責務 | read | write |
|--------|------|------|-------|
| `useToast` | トースト表示・自動消去 | `toastMessage` | `showToast(message)` |
| `useAuth` | 認証の read + write 全体 | `isAdmin`, `accessToken` | `login()`, `logout()` |
| `useVideos` | 一覧取得・検索・ソート・ページネーション・削除 | `videos`, `totalCount`, `currentPage`, `sortOption`, `searchQuery`, `isLoading`, `loadError`, `totalPages`, `visiblePageNumbers` | `setCurrentPage()`, `setSortOption()`, `setSearchQuery()`, `refreshListPage()`, `refreshCurrentPage()`, `deleteVideo()` |
| `useVideoForm` | フォーム状態・バリデーション・保存 | `formData`, `formErrors` | `initAdd()`, `initEdit(video)`, `updateField()`, `clearError()`, `handleSave()` |
| `useConfirmModal` | モーダル開閉・確認実行 | `isOpen`, `config` | `openDeleteModal()`, `openSaveModal()`, `close()` |

### 依存関係

```
useToast          ← 依存なし
useAuth           ← showToast, onNonAdminRejected を受け取る
useVideos         ← 依存なし（deleteVideo は accessToken を引数で受け取る）
useVideoForm      ← accessToken, showToast, refreshListPage, refreshCurrentPage を受け取る
useConfirmModal   ← 依存なし（onConfirm は呼び出し側が渡す）
```

---

## Phase 1: Organisms（画面単位の分割）

### 概要

page.tsx の JSX 表示部分を画面単位でコンポーネントに切り出す。
**ロジック（state, useEffect, handler）は page.tsx に残し、propsで渡す。**

### 作業内容

#### 1-1. Header.tsx

- **元の位置**: page.tsx 413-455行
- **責務**: ロゴ、管理者バッジ、ログイン/ログアウトボタン
- **props**:
  - `isAdmin: boolean`
  - `onLogout: () => void`
  - `onLogin: () => void`
  - `onLogoClick: () => void`

#### 1-2. VideoCard.tsx

- **元の位置**: page.tsx 513-562行（`videos.map` 内のカード1枚分）
- **責務**: サムネイル、タイトル、タグ、カテゴリ、評価、削除ボタンの描画
- **props**:
  - `video: VideoItem`
  - `isAdmin: boolean`
  - `onClick: (video: VideoItem) => void`
  - `onDelete: (id: string, title: string, e?: React.MouseEvent) => void`

#### 1-3. VideoDetail.tsx

- **元の位置**: page.tsx 613-724行
- **責務**: 詳細画面全体（サムネイル、メタ情報、良かったポイント、メモ、YouTubeリンク）
- **props**:
  - `video: VideoItem`
  - `isAdmin: boolean`
  - `onBack: () => void`
  - `onEdit: (video: VideoItem) => void`
  - `onDelete: (id: string, title: string) => void`

#### 1-4. VideoForm.tsx

- **元の位置**: page.tsx 727-933行
- **責務**: 追加/編集フォーム全体（入力欄、バリデーションエラー表示、保存/キャンセル）
- **props**:
  - `mode: "add" | "edit"`
  - `formData: Partial<VideoItem>`
  - `formErrors: ValidationErrors`
  - `onFormChange: (data: Partial<VideoItem>) => void`
  - `onErrorClear: (field: keyof ValidationErrors) => void`
  - `onSave: () => void`
  - `onCancel: () => void`

#### 1-5. LoginScreen.tsx

- **元の位置**: page.tsx 936-1003行
- **責務**: ログイン画面（Googleログインボタン、戻るリンク）
- **props**:
  - `onGoogleLogin: () => void`
  - `onBack: () => void`

#### 1-6. Footer.tsx

- **元の位置**: page.tsx 1042-1050行
- **責務**: フッター表示
- **props**: なし

### 完了基準

- [ ] 上記6コンポーネントが `components/organisms/` に作成されている
- [ ] page.tsx から画面単位のJSXが切り出されている（ロジックは残して良い）
- [ ] `pnpm run build` が成功する
- [ ] `pnpm run lint` がエラーなし
- [ ] E2Eテスト12ケースがすべて通過する
- [ ] 管理者フロー手動確認（下記チェックリスト）がすべて通過する

### 管理者フロー手動確認チェックリスト

`admin.spec.ts` により管理者フローの大部分が E2E 自動化済み（`docs/04.e2e-cases.md` 参照）。手動確認必須は実 Google OAuth を必要とする項目のみ。

- [ ] 許可メールでGoogleログイン → 管理者バッジ表示・FAB表示 **【手動必須 — 実OAuth】**
- [x] 非許可メールでGoogleログイン → 「権限がありません」トースト表示・ログアウト状態に戻る（`admin.spec.ts` S-1）
- [x] 管理者ログアウト → 管理者バッジ非表示・FAB非表示・リスト画面に戻る（`admin.spec.ts` N-6）
- [x] 動画追加（FABクリック → フォーム入力 → 保存モーダル確定） → 「追加しました。」トースト・リストに反映（`admin.spec.ts` N-2）
- [x] 動画編集（詳細 → 編集ボタン → フォーム変更 → 保存モーダル確定） → 「更新しました。」トースト・詳細に反映（`admin.spec.ts` N-3）
- [x] 動画削除（カード上の削除ボタン → 削除モーダル確定） → 「削除しました。」トースト・リストから消える（`admin.spec.ts` N-4）
- [x] 動画削除（詳細画面の削除ボタン → 削除モーダル確定） → リスト画面に戻る（`admin.spec.ts` N-5）
- [x] バリデーションエラー（タイトル空・URL空） → エラー表示・保存されない（`admin.spec.ts` S-2）
- [x] 保存/削除のAPI失敗時 → モーダルが閉じない・エラーアラート表示・再操作可能（`admin.spec.ts` S-3a, S-3b, S-4）
- [x] モーダル確定ボタン連打 → 二重送信されない（ボタンが disabled になる）（`admin.spec.ts` S-5）
- [x] モーダル閉じた後 → `body` のスクロール（`overflow`）が元に戻る（`admin.spec.ts` A-1）

---

## Phase 2: Molecules（共通UIパーツの切り出し）

### 概要

画面を横断して使われるUIの塊を organisms から切り出し、独立コンポーネントにする。

### 作業内容

#### 2-1. SearchBar.tsx

- **元の位置**: page.tsx 478-487行
- **責務**: 検索アイコン + テキスト入力
- **props**:
  - `value: string`
  - `onChange: (value: string) => void`

#### 2-2. SortSelect.tsx

- **元の位置**: page.tsx 488-496行
- **責務**: 並び替えプルダウン
- **props**:
  - `value: SortOption`
  - `onChange: (value: SortOption) => void`

#### 2-3. Pagination.tsx

- **元の位置**: page.tsx 566-607行
- **責務**: ページ番号ボタン、前へ/次へ、現在ページ表示
- **props**:
  - `currentPage: number`
  - `totalPages: number`
  - `visiblePageNumbers: number[]`
  - `onPageChange: (page: number) => void`

#### 2-4. TagList.tsx

- **使用箇所**: VideoCard内、VideoDetail内
- **責務**: タグチップの並び表示
- **props**:
  - `tags: string[]`
  - `size?: "sm" | "md"`

#### 2-5. Toast.tsx

- **元の位置**: page.tsx 1017-1028行
- **責務**: 右上のトースト通知
- **props**:
  - `message: string | null`

### 完了基準

- [ ] 上記5コンポーネントが `components/molecules/` に作成されている
- [ ] organisms 内で molecules を使用している
- [ ] `pnpm run build` が成功する
- [ ] `pnpm run lint` がエラーなし
- [ ] E2Eテスト12ケースがすべて通過する
- [ ] 管理者フロー手動確認チェックリスト（Phase 1 参照）がすべて通過する

---

## Phase 3: カスタムフック（ロジック分離）

### 概要

page.tsx に残ったビジネスロジック・状態管理をカスタムフックに抽出し、page.tsx を純粋な画面切替コーディネーターにする。
page.tsx が所有する状態は `currentScreen` と `selectedVideo` のみとする。

### 作業内容

#### 3-1. useToast.ts

- **元の位置**: page.tsx 47-48行(state), 150-158行(showToast)
- **責務**: トースト表示・自動消去
- **依存**: なし
- **公開API**:
  - `toastMessage: string | null`
  - `showToast: (message: string) => void`

#### 3-2. useAuth.ts

- **元の位置**: page.tsx 37-38行(state), 160-238行(セッション管理), 432-438行(ログアウト処理), 965-967行(Googleログイン起動)
- **責務**: Supabase Auth のセッション監視、管理者判定、非管理者の拒否、ログイン起動、ログアウト実行
- **依存**: `showToast`, `onNonAdminRejected` を引数で受け取る
- **公開API**:
  - `isAdmin: boolean` — 管理者かどうか
  - `accessToken: string | null` — Bearer トークン
  - `login: () => void` — Google OAuth ログインを起動
  - `logout: () => Promise<void>` — サインアウトし状態をクリア
- **設計意図**: 認証に関する read（判定）と write（ログイン/ログアウト）を一箇所に集約する。page.tsx や Header から `signInWithGoogle()` / `signOut()` を直接呼ばない。

#### 3-3. useVideos.ts

- **元の位置**: page.tsx 39-53行(state), 71-118行(loadVideos/refresh), 120-140行(effects), 271-295行(削除処理)
- **責務**: 動画一覧の取得、検索・並び替え・ページネーション、動画の削除
- **依存**: なし（純粋なデータ操作。削除時の `accessToken` は引数で受け取る）
- **公開API**:
  - `videos: VideoItem[]`
  - `totalCount: number`
  - `currentPage: number`
  - `setCurrentPage: (page: number) => void`
  - `sortOption: SortOption`
  - `setSortOption: (option: SortOption) => void`
  - `searchQuery: string`
  - `setSearchQuery: (query: string) => void`
  - `isLoading: boolean`
  - `loadError: string | null`
  - `totalPages: number`
  - `visiblePageNumbers: number[]`
  - `refreshListPage: (page: number) => Promise<void>` — 指定ページを再取得（追加後の1ページ目戻しに使用）
  - `refreshCurrentPage: () => Promise<void>` — 現在ページを再取得（編集後のリスト同期に使用）
  - `deleteVideo: (id: string, accessToken: string | null) => Promise<void>` — 動画を削除し、削除後のページ位置を自動調整して再取得
  - `pageSize: number`

#### 3-4. useVideoForm.ts

- **元の位置**: page.tsx 68-69行(state), 250-263行(navigateToAdd/Edit初期化), 308-399行(handleSave)
- **責務**: フォーム状態管理、入力バリデーション、新規作成/更新のAPI呼び出し
- **依存**: `accessToken`, `showToast`, `refreshListPage`, `refreshCurrentPage` を引数で受け取る
- **公開API**:
  - `formData: Partial<VideoItem>`
  - `formErrors: ValidationErrors`
  - `initAdd: () => void` — 新規追加用にフォームを初期化
  - `initEdit: (video: VideoItem) => void` — 編集用にフォームを初期化
  - `updateField: (field: string, value: unknown) => void` — フィールド更新 + エラークリア
  - `clearError: (field: keyof ValidationErrors) => void`
  - `handleSave: (mode: "add" | "edit", selectedVideoId?: string) => { action: () => Promise<VideoItem | null>, valid: boolean }` — バリデーション実行し、有効なら保存用のアクションを返す。追加時は `null`、編集時は更新後の `VideoItem` を返す
- **設計意図**: 保存フローは `handleSave` がバリデーション＋APIコール用アクションを返し、呼び出し側（page.tsx）が `useConfirmModal.openSaveModal` に渡す。フォーム自身はモーダル制御に関与しない。
- **編集成功後のselectedVideo更新契約**: 編集時の `action()` は APIレスポンスの `VideoItem` を返す。page.tsx はこの戻り値で `setSelectedVideo` を呼び、詳細画面に最新データを反映してから `Screen.Detail` に遷移する。これにより、編集後に詳細が stale になることを防ぐ。

```tsx
// page.tsx での使用イメージ
const { action, valid } = form.handleSave("edit", selectedVideo?.id);
if (!valid) return;
modal.openSaveModal(async () => {
  const updated = await action();
  if (updated) setSelectedVideo(updated); // ← 最新化
  setCurrentScreen(Screen.Detail);
});
```

#### 3-5. useConfirmModal.ts

- **元の位置**: page.tsx 55-66行(state), 271-306行(openDeleteModal), 392-398行(保存モーダル)
- **責務**: 確認モーダルの開閉、設定（タイトル・メッセージ・variant）、確認アクションの保持
- **依存**: なし（`onConfirm` は呼び出し側が渡す）
- **公開API**:
  - `isOpen: boolean`
  - `config: { title: string; message: string; variant: "danger" | "info"; onConfirm: () => Promise<void> }`
  - `openDeleteModal: (title: string, onConfirm: () => Promise<void>) => void`
  - `openSaveModal: (onConfirm: () => Promise<void>) => void`
  - `close: () => void`
- **設計意図**: モーダルの状態管理と表示設定のみを担当。実際の削除/保存ロジックは `onConfirm` として外部から注入される。

### 完了基準

- [ ] 上記5フックが `hooks/` に作成されている
- [ ] page.tsx が ~250行以下になっている
- [ ] page.tsx に残る状態は `currentScreen` と `selectedVideo` のみ
- [ ] page.tsx から `signInWithGoogle`, `signOut`, `fetch`, `supabase.auth` の直接呼び出しがない
- [ ] `pnpm run build` が成功する
- [ ] `pnpm run lint` がエラーなし
- [ ] E2Eテスト12ケースがすべて通過する
- [ ] 管理者フロー手動確認チェックリスト（Phase 1 参照）がすべて通過する

---

## Phase 4: Atoms 整理（既存コンポーネントの移動）

### 概要

既存の `Rating.tsx`, `Markdown.tsx` を `atoms/` に移動し、import パスを更新する。

### 作業内容

- `components/Rating.tsx` → `components/atoms/Rating.tsx`
- `components/Markdown.tsx` → `components/atoms/Markdown.tsx`
- 全ファイルの import パスを更新

### 完了基準

- [ ] 既存コンポーネントが `atoms/` に移動されている
- [ ] import パスがすべて更新されている
- [ ] `pnpm run build` が成功する
- [ ] `pnpm run lint` がエラーなし
- [ ] E2Eテスト12ケースがすべて通過する
- [ ] 管理者フロー手動確認チェックリスト（Phase 1 参照）がすべて通過する

---

## 実施順序

| 順序 | Phase | 理由 |
|------|-------|------|
| 1 | Phase 1 (Organisms) | 最大の効果（page.tsx -600行）。画面単位なのでリスクが低い |
| 2 | Phase 3 (Hooks) | ロジック分離でpage.tsxをさらに縮小。Organisms のprops設計が安定した後が適切 |
| 3 | Phase 2 (Molecules) | Organisms の中身を細分化。Phase 1完了後に共通パターンが見えてから着手 |
| 4 | Phase 4 (Atoms移動) | 最後にディレクトリ構成を整える。機能変更がないため最もリスクが低い |

## リスクと対策

| リスク | 対策 |
|--------|------|
| E2Eテストの破損 | 各Phase完了ごとに全E2Eを実行。HTML出力を変えない分割を徹底する |
| 管理者フローの回帰 | E2Eでは管理者操作が対象外のため、各Phaseで手動確認チェックリストを実施する |
| propsバケツリレーの肥大 | Phase 3 のカスタムフック導入で軽減。それでも深い場合は React Context を検討 |
| フック間の責務漏れ | 「カスタムフック責務境界」の表に従い、read/write がフックをまたがないことを確認する |
| import パスの混乱 | `@/components/organisms/` 等のパスエイリアスを統一する |
| Vercelデプロイへの影響 | 各Phase完了ごとに `pnpm run build` で検証。コンポーネント分割はビルド出力に影響しない |
