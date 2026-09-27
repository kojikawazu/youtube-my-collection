# テスト設計: カスタムフック ユニットテスト

## 目次

- [対象](#対象)
- [useToast](#usetoast)
  - [正常系](#正常系)
  - [準正常系](#準正常系)
- [useConfirmModal](#useconfirmmodal)
  - [正常系](#正常系-1)
- [useVideos](#usevideos)
  - [正常系](#正常系-2)
  - [準正常系](#準正常系-1)
  - [異常系](#異常系)
  - [競合状態（レスポンスの到着順が逆転するケース）](#競合状態レスポンスの到着順が逆転するケース)
- [useVideoForm](#usevideoform)
  - [正常系](#正常系-3)
  - [準正常系](#準正常系-2)
  - [異常系](#異常系-1)
- [useAuth](#useauth)
  - [正常系](#正常系-4)
  - [準正常系](#準正常系-3)
  - [異常系](#異常系-2)
- [useAuthCallback](#useauthcallback)
  - [正常系](#正常系-5)
  - [準正常系](#準正常系-4)
  - [異常系](#異常系-3)
- [useAuthErrorToast](#useautherrortoast)
  - [正常系](#正常系-6)
  - [準正常系](#準正常系-5)
- [テスト構成](#テスト構成)
  - [ユニットテスト](#ユニットテスト)
- [モック方針](#モック方針)

## 対象

- 対象機能: useToast / useConfirmModal / useVideos / useVideoForm / useAuth / useAuthCallback / useAuthErrorToast
- 対象ファイル:
  - `front/src/hooks/useToast.ts`
  - `front/src/hooks/useConfirmModal.ts`
  - `front/src/hooks/useVideos.ts`
  - `front/src/hooks/useVideoForm.ts`
  - `front/src/hooks/useAuth.ts`
  - `front/src/hooks/useAuthCallback.ts`
  - `front/src/hooks/useAuthErrorToast.ts`
- スタック: Next.js / TypeScript / Vitest + @testing-library/react
- テストファイル（予定）:
  - `front/src/hooks/__tests__/useToast.test.ts`
  - `front/src/hooks/__tests__/useConfirmModal.test.ts`
  - `front/src/hooks/__tests__/useVideos.test.ts`
  - `front/src/hooks/__tests__/useVideoForm.test.ts`
  - `front/src/hooks/__tests__/useAuth.test.ts`
  - `front/src/hooks/__tests__/useAuthCallback.test.ts`
  - `front/src/hooks/__tests__/useAuthErrorToast.test.ts`

---

## useToast

### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | showToast でメッセージがセットされる | `showToast("追加しました。")` | `toastMessage === "追加しました。"` | High |
| N-2 | 2200ms 後にメッセージが null になる | `showToast("追加しました。")` + vi.advanceTimersByTime(2200) | `toastMessage === null` | High |
| N-3 | showToast を連続呼び出すとタイマーがリセットされる | 1回目呼び出し後 1000ms 経過、2回目呼び出し、さらに 2200ms 経過 | 2回目の 2200ms 後に null（合計 3200ms で消える） | Medium |

### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | コンポーネントアンマウント時にタイマーがクリアされる | showToast 後すぐアンマウント | タイマーが残らない（リークなし） | Medium |

---

## useConfirmModal

### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | openDeleteModal → isOpen=true、variant=danger | `openDeleteModal("テスト動画", fn)` | `isOpen===true`, `config.variant==="danger"`, `config.title==="動画を削除しますか？"`, `config.message` に動画タイトルが含まれる（`「テスト動画」を完全に削除します。`） | High |
| N-2 | openSaveModal → isOpen=true、variant=info | `openSaveModal(fn)` | `isOpen===true`, `config.variant==="info"` | High |
| N-3 | close → isOpen=false | `openDeleteModal` 後 `close()` | `isOpen===false` | High |
| N-4 | config.onConfirm に渡した関数がそのまま保持される | `openDeleteModal("x", mockFn)` | `config.onConfirm === mockFn` | Medium |

---

## useVideos

### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | マウント時に GET /api/videos を呼ぶ | fetch モック（200 + x-total-count: "4"） | `videos.length === 4`, `totalCount === 4` | High |
| N-2 | x-total-count ヘッダーが欠落時は配列長をフォールバック | fetch モック（ヘッダーなし、body 3件） | `totalCount === 3` | Medium |
| N-3 | sortOption 変更 → 再フェッチされる | `setSortOption("rating")` | fetch が再度呼ばれる | High |
| N-4 | searchQuery は 300ms デバウンス後に反映される | `setSearchQuery("React")` → advanceTimersByTime(300) | fetch が `q=React` で呼ばれる | High |
| N-5 | totalPages = ceil(totalCount / 10) | totalCount=21 | `totalPages === 3` | High |
| N-6 | visiblePageNumbers は最大 5 件 | totalPages=10, currentPage=1 | `visiblePageNumbers = [1,2,3,4,5]` | High |
| N-7 | visiblePageNumbers が currentPage を中心に窓移動する | totalPages=10, currentPage=6 | `visiblePageNumbers = [4,5,6,7,8]` | High |
| N-8 | deleteVideo → DELETE /api/videos/:id → リフレッシュ | fetch モック（DELETE 204） | DELETE 呼ばれる、その後 GET 呼ばれる（「削除しました。」トーストは page.tsx から showToast が呼ばれるためフック外の責務。E2E admin N-4 でカバー） | High |
| N-9 | 最終ページの最後の1件削除 → 前のページへ戻る | totalCount=11, currentPage=2, 1件削除 | `currentPage` が 1 になる | High |
| N-10 | refreshListPage(1) → GET offset=0 で再フェッチ | `refreshListPage(1)` | `?offset=0` で fetch 呼ばれる | Medium |

### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | API が 500 → loadError セット | fetch モック（500） | `loadError === "データの取得に失敗しました。"` | High |
| S-2 | フィルタ変更時に currentPage が 1 以外 → 1 にリセット | currentPage=3, sortOption 変更 | `currentPage === 1` | High |

### 異常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| A-1 | fetch がネットワーク例外 → loadError セット | fetch が throw | `loadError === "データの取得に失敗しました。"` | High |
| A-2 | deleteVideo API 失敗 → エラーをスロー | DELETE fetch モック（500） | `deleteVideo` が throw する | High |

### 競合状態（レスポンスの到着順が逆転するケース）

完了タイミングをテストから制御できる fetch モック（`controlledFetch`）で、意図的に到着順を逆転させる。

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| R-1 | 古いリクエストが後から完了しても最新結果を上書きしない | 2 件目を先に resolve → 1 件目を後から resolve | `videos` / `totalCount` は 2 件目の結果のまま | High |
| R-2 | 古いリクエストの完了で最新のローディングを解除しない | 1 件目だけ resolve | `isLoading === true` を維持し、2 件目の完了で false | High |
| R-3 | 中止された古いリクエストの失敗を利用者向けエラーにしない | 1 件目を AbortError で reject | `loadError === null` | High |
| R-4 | 新しいリクエスト開始時に進行中の通信を中止する | `setCurrentPage(2)` | 1 件目の `AbortSignal.aborted === true` | Medium |
| R-5 | アンマウント時に進行中の通信を中止する | `unmount()` | `AbortSignal.aborted === true` | Medium |

---

## useVideoForm

### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | initAdd → デフォルト値がセットされる | `initAdd()` | `formData.category === "プログラミング"`, `rating === 3`, errors 空 | High |
| N-2 | initEdit → 動画データがコピーされる | `initEdit(video)` | `formData` が video と同値、errors 空 | High |
| N-3 | updateField → フィールド更新 + 対応エラーがクリアされる | エラーあり状態で `updateField("title", "新タイトル")` | `formData.title === "新タイトル"`, `formErrors.title === undefined` | High |
| N-4 | handleSave(add) バリデーション OK → valid=true, action は POST を呼ぶ | 正常 formData + fetch モック（201） | `valid===true`, POST 呼ばれ `showToast("追加しました。")` | High |
| N-5 | handleSave(edit) バリデーション OK → valid=true, action は PATCH を呼び VideoItem を返す | 正常 formData + fetch モック（200 + VideoItem） | `valid===true`, PATCH 呼ばれ `showToast("更新しました。")`, 返り値が VideoItem | High |

### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | youtubeUrl 空で handleSave → valid=false、errors.youtubeUrl セット | `formData.youtubeUrl = ""` | `valid===false`, `formErrors.youtubeUrl` あり | High |
| S-2 | title 空で handleSave → valid=false、errors.title セット | `formData.title = ""` | `valid===false`, `formErrors.title` あり | High |
| S-3 | タグ超過で handleSave → valid=false | tag が 11 文字 | `valid===false`, `formErrors.tags` あり | High |
| S-4 | edit モードで id がない → action が throw | `formData.id` undefined, `selectedVideoId` undefined | action が throw する | Medium |

### 異常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| A-1 | add モードで API 失敗 → action が throw | POST fetch モック（500） | action が throw する（showToast は呼ばれない） | High |
| A-2 | edit モードで API 失敗 → action が throw | PATCH fetch モック（500） | action が throw する（showToast は呼ばれない） | High |

---

## useAuth

### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | 管理者セッションあり → isAdmin=true, accessToken セット | supabase.getSession → token, /api/auth/admin → `{isAdmin:true}` | `isAdmin===true`, `accessToken` が token と一致 | High |
| N-2 | SIGNED_IN イベント → applySession が呼ばれる | onAuthStateChange で SIGNED_IN 発火 | `isAdmin===true`（admin API モック） | High |
| N-3 | TOKEN_REFRESHED イベント（管理者）→ accessToken が更新される | onAuthStateChange で TOKEN_REFRESHED 発火（admin API → `{isAdmin:true}`） | 新 token が `accessToken` に反映される | Medium |
| N-4 | SIGNED_OUT イベント → isAdmin=false, accessToken=null | onAuthStateChange で SIGNED_OUT 発火 | `isAdmin===false`, `accessToken===null` | High |
| N-5 | logout() → signOut 呼ばれ、状態クリア | `logout()` | `isAdmin===false`, `accessToken===null` | High |
| N-6 | セッションなし → isAdmin=false, accessToken=null | supabase.getSession → null | `isAdmin===false` | High |

> **login() について**: `login()` は `signInWithGoogle()` の 1 行ラッパーであり、OAuth リダイレクトを開始するだけ。ブラウザ遷移が伴うため unit テスト対象外とする。

### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | 非管理者セッション（初回ロード）→ signOut, showToast, onNonAdminRejected | supabase.getSession → token, /api/auth/admin → `{isAdmin:false}` | signOut 呼ばれる, `showToast("このアカウントは権限がありません。")`, `onNonAdminRejected` 呼ばれる | High |
| S-2 | TOKEN_REFRESHED イベント（非管理者）→ rejectNonAdmin が呼ばれる | onAuthStateChange で TOKEN_REFRESHED 発火（admin API → `{isAdmin:false}`） | signOut 呼ばれる, `showToast("このアカウントは権限がありません。")`, `isAdmin===false` | Medium |
| S-3 | /api/auth/admin が 401 → 非管理者として扱う | admin API → 401 | `isAdmin===false` | High |
| S-4 | logout() で signOut が例外 → 状態は正常にクリアされる | signOut が throw | `isAdmin===false`, `accessToken===null`（例外を飲む） | Medium |

### 異常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| A-1 | /api/auth/admin がネットワーク例外 → isAdmin=false | admin API fetch が throw | `isAdmin===false`（false を返す） | Medium |

---

## useAuthCallback

OAuth コールバック（`/auth/callback`）のブラウザ側処理。認可コードをセッションへ交換し、成否に関わらずトップへ置き換え遷移する。

> **交換をブラウザで行う理由**: PKCE の code verifier はログイン開始時のブラウザクライアント storage にしか無く、サーバー側の client からは参照できない（issue #165）。

### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | 認可コードを交換できたらトップへ遷移 | `?code=valid-code`、exchange 成功 | `location.replace("/")`、`exchangeOAuthCode("valid-code")` が呼ばれる | High |
| N-2 | 交換は 1 度しか実行しない | 同上 + 再レンダー | `exchangeOAuthCode` の呼び出しは 1 回（認可コードは使い捨てのため、StrictMode の二重実行で必ず失敗する） | High |

### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | `code` が無い | クエリなし | 交換せず `"/?auth_error=missing_code"` | High |
| S-2 | provider がエラーを返す | `?error=access_denied` | 交換せず `"/?auth_error=provider_denied"` | High |
| S-3 | 交換がエラーを返す | `?code=expired-code`、exchange が error | `"/?auth_error=exchange_failed"` | High |
| S-4 | Supabase 環境変数が欠落 | `NEXT_PUBLIC_SUPABASE_URL` が空 | 交換せず `"/?auth_error=auth_config_error"` | Medium |

### 異常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| A-1 | 交換が reject | exchange が throw | `"/?auth_error=exchange_failed"`（握り潰すと「ログイン処理中」表示のまま固まる） | High |

---

## useAuthErrorToast

`auth_error` クエリを表示メッセージへ解決してトースト表示し、URL から取り除く。

### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | `auth_error` が無い | `/` | トーストを出さず URL も変えない | High |
| N-2 | 既知のコードを文言へ解決 | `?auth_error=provider_denied` | `showToast("ログインがキャンセルされました。")` | High |
| N-3 | 表示後にクエリを除去 | `?auth_error=exchange_failed` | `location.search === ""`（リロードで再表示させない） | High |
| N-4 | 他のクエリは残す | `?page=2&auth_error=exchange_failed` | `location.search === "?page=2"` | Medium |

### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | 未知のコード | `?auth_error=something_new` | 既定文言を表示（無言で失敗させない） | Medium |
| S-2 | 空文字 | `?auth_error=` | 何も表示しない | Medium |

---

## テスト構成

### ユニットテスト

- テストランナー: **Vitest** + `@testing-library/react` (renderHook)
- モック対象:
  - `fetch` → `vi.stubGlobal("fetch", vi.fn())`
  - `supabase` → `vi.mock("@/lib/supabase/client")`
  - `@/lib/auth` (signInWithGoogle, signOut, exchangeOAuthCode) → `vi.mock("@/lib/auth")`
  - `window.location` → `Object.defineProperty` で search / replace を差し替え（jsdom の location は読み取り専用）
  - 環境変数 → `vi.stubEnv()`（`NEXT_PUBLIC_SUPABASE_*` の欠落再現）
- タイマー: `vi.useFakeTimers()` で useToast / useVideos のデバウンス制御
- 完了順の制御: `controlledFetch()` が「呼ばれるたびに未解決の Promise を返す」fetch を差し替える。テストから任意の順で resolve / reject し、レスポンスの到着順逆転を再現する

## モック方針

- モック許可: `fetch`（HTTP 通信）、`supabase`（外部 SDK）、`@/lib/auth`（OAuth SDK ラッパー）
- モック禁止: `validateVideoInput`、`getYoutubeThumbnail`、フック内のビジネスロジック自体
