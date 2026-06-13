# OpenAPI / Swagger UI 導入計画（Zod 単一ソース化 / A1: 完全置換）

API の検証・型・ドキュメントを **Zod スキーマを単一の真実のソース** に統合し、そこから OpenAPI を自動生成して Swagger UI で公開する計画。`docs/07-api-specification.md`（Markdown 仕様）と実装の手動同期を、構造的な自動生成へ寄せて乖離を防ぐ。

> ステータス: **実装済み**（A1: 完全置換）。本メモは品質ゲート（設計→レビュー→実装）の設計成果物として作成し、実装完了後に追補した。

## 目次

- [背景・狙い](#背景狙い)
- [方針（A1: 完全置換）](#方針a1-完全置換)
- [段階分けと将来（TypeSpec / Go 移行）](#段階分けと将来typespec--go-移行)
- [設計](#設計)
  - [1. 依存追加](#1-依存追加)
  - [2. Zod スキーマ設計](#2-zod-スキーマ設計)
  - [3. validateVideoInput のアダプタ化（公開契約は不変）](#3-validatevideoinput-のアダプタ化公開契約は不変)
  - [4. OpenAPI 生成](#4-openapi-生成)
  - [5. Swagger UI の配信](#5-swagger-ui-の配信)
  - [6. 型の統合（types.ts）](#6-型の統合typests)
- [テスト方針](#テスト方針)
- [リスクと対策](#リスクと対策)
- [ドキュメント更新（完了条件）](#ドキュメント更新完了条件)
- [作業ステップ](#作業ステップ)
- [スコープ外](#スコープ外)

## 背景・狙い

- 現状、API 検証は `front/src/lib/validation.ts` の独自実装、型は `front/src/lib/types.ts` の手書き、仕様は `docs/07-api-specification.md` の Markdown と **3 箇所に分散**している。
- これらを **Zod スキーマ 1 つ** に集約し、「検証ロジック＝OpenAPI＝型」を 1 ソースから導出する。
- `.claude/rules/documentation.md` が手動ルールで担保している「API 変更 → 仕様更新」を、生成で一部自動化する。

## 方針（A1: 完全置換）

`validation.ts` の独自ロジックを Zod に**一本化**する。検証エンジンを Zod に差し替えつつ、**`validateVideoInput` の公開シグネチャと戻り値の形（`{ data, errors }`）・日本語エラーメッセージは完全維持**する。これにより:

- 既存の Route Handler（`api/videos`・`api/videos/[id]`）は**無変更**で動く。
- `test-design/01-unit-validation.md` のユニットテストが**パリティの保証**になる（テストは実装に合わせず、実装をテストへ通す）。
- 同じ Zod スキーマが OpenAPI 生成のソースを兼ねる。

```
Zod スキーマ（単一の真実）
  ├─ validateVideoInput（アダプタ経由でランタイム検証）← 公開契約は不変
  ├─ OpenAPI(JSON) 自動生成 ──→ Swagger UI
  └─ 型 z.infer ──→ types.ts（VideoItem 等）へ統合
```

## 段階分けと将来（TypeSpec / Go 移行）

- 本計画で **OpenAPI と Swagger UI は完成する**（Zod から生成されるため）。
- 後回しにするのは **TypeSpec を「言語非依存の真実のソース」に据えること** のみ。これは `notes/go-echo-backend-plan.md` の Go + Echo 共通バックエンド移行と同時に行うのが費用対効果が高い。
- 移行時は「ゼロから契約を書く」のではなく、本計画で得た **自動生成 OpenAPI を TypeSpec に起こし直し**、OpenAPI を Next/Go の共有契約に格上げする（真実のソースを Zod → TypeSpec へ反転）。

## 設計

### 1. 依存追加

| パッケージ | 区分 | 用途 |
|---|---|---|
| `zod` | dependencies | スキーマ定義・ランタイム検証 |
| `@asteasolutions/zod-to-openapi` | dependencies | Zod に `.openapi()` を拡張し、レジストリから OpenAPI を生成 |

- Swagger UI は **CDN 配信の HTML** で表示し、`swagger-ui-react` は使わない（React 19 とのピア依存の摩擦を回避するため。詳細は[リスク](#リスクと対策)）。
- 依存追加に伴い `README.md` / `docs/09-architecture-specification.md` を更新（影響マップ準拠）。

### 2. Zod スキーマ設計

`front/src/lib/schemas/video.ts`（新規）に定義。現行 `validation.ts` の挙動・メッセージを 1:1 で再現する。

| フィールド | ルール（現行踏襲） | メッセージ |
|---|---|---|
| youtubeUrl | trim 後に必須 | `YouTube URLは必須です。` |
| title | trim 後に必須 | `タイトルは必須です。` |
| thumbnailUrl | 任意・string・trim | — |
| tags | `string[]` または カンマ区切り string を正規化（trim・空除去）、各 10 文字以内 | `タグは10文字以内です。` |
| category | 10 文字以内、空なら `未分類` にフォールバック | `カテゴリは10文字以内です。` |
| goodPoints | 2000 文字以内 | `良かったポイントは2000文字以内です。` |
| memo | 2000 文字以内 | `メモは2000文字以内です。` |
| rating | 数値化して 1〜5 の整数 | `評価は1〜5で入力してください。` |
| publishDate | nullable・日付パース（不正は未設定扱い） | — |

- **作成（POST）**: 必須項目あり。
- **更新（PATCH）**: 上記の `.partial()`（現行 `validateVideoInput(input, { partial: true })` 相当。送信されたフィールドのみ検証）。
- 正規化（tags のカンマ分割、category の `未分類` フォールバック、trim）は Zod の `transform` で表現する。

### 3. validateVideoInput のアダプタ化（公開契約は不変）

- `validateVideoInput(input, { partial })` の**インターフェースは変えない**。内部を Zod の `safeParse` に置き換える。
- Zod の `error.flatten().fieldErrors`（フィールド→メッセージ配列）を、現行と同じ **フィールド→単一メッセージ** の `ValidationErrors` 形へ変換する小さなアダプタを実装。
- 戻り値 `{ data: NormalizedVideo, errors: ValidationErrors }` を維持し、Route Handler とテストの呼び出し側を無変更に保つ。

### 4. OpenAPI 生成

`front/src/lib/openapi.ts`（新規）でレジストリを構築し `OpenApiGeneratorV3` で JSON を生成。

- **パス**: `GET /api/videos`、`GET|PATCH|DELETE /api/videos/{id}`、`POST /api/videos`、`GET /api/auth/admin`。
- **クエリ**: `sort`(`added`/`published`/`rating`)・`order`(`desc`/`asc`)・`q`・`tag`・`category`・`limit`(1-100)・`offset`(≥0)。
- **レスポンスヘッダー**: `x-total-count`・`x-limit`・`x-offset`（一覧）。
- **ステータス**: 200 / 201 / 400(`{ errors }`) / 401(`Unauthorized`) / 403(`Forbidden`)。
- **セキュリティ**: 管理操作は `Authorization: Bearer <token>`（bearerAuth）。
- 仕様の正準は引き続き `07-api-specification.md`。OpenAPI はそこから参照される「動く版」。

### 5. Swagger UI の配信

- `GET /api/openapi.json`（Route Handler）: 生成した OpenAPI を返す。
- `/docs`（page）: CDN の Swagger UI を読み込み `/api/openapi.json` を指すページ。
- **公開範囲（更新）**: 当初は読み取り専用ドキュメントとして公開していたが、**管理者限定に変更**した。`/api/openapi.json` を `requireAdmin`（`ADMIN_EMAIL` allowlist）で保護し、`/docs` はクライアントガードで管理者セッションが無ければログイン誘導を表示する（Swagger UI は `requestInterceptor` で Bearer トークンを注入）。`NODE_ENV` ガードではなく既存の Bearer 認証に揃えることで、認証モデルの二重化を避けた。

### 6. 型の統合（types.ts）

- レスポンス型 `VideoItem` を Zod レスポンススキーマの `z.infer` から導出し、`types.ts` の手書き定義を置き換える（型の二重管理を解消）。
- `Category` 等の UI 都合の型は現状維持（プリセットは UI 層の関心）。

## テスト方針

`.claude/rules/testing.md` 準拠（正常 1 : 異常 2 以上、外部 I/O 以外モックしない、具体値で検証）。

- **既存 `validation.test.ts` を緑のまま維持**（パリティの証明。落ちたら実装を直す）。
- **OpenAPI 生成テスト（新規）**:
  - 正常系: 生成物に想定パス・スキーマ・ステータス・セキュリティ定義が含まれる。
  - 異常系/準正常系: 必須欠落・上限超過・rating 範囲外が `400 { errors }` のスキーマに合致／PATCH partial の境界。
- 既存 E2E（Playwright）には影響しない想定（API 契約不変のため）。

## リスクと対策

| リスク | 対策 |
|---|---|
| Zod 移植でメッセージ・挙動が変わる | `validateVideoInput` を**アダプタ化**し公開契約を固定。既存ユニットテストをパリティ基準にする |
| `swagger-ui-react` と React 19 のピア依存衝突 | UI ライブラリを使わず **CDN の Swagger UI を HTML 配信**して回避 |
| partial モードの意味差（送信フィールドのみ検証） | Zod `.partial()` + 「存在するが不正」のケースを明示テスト |
| transform が不正値時に走る副作用 | `safeParse` 成功時のみ `data` を構築、失敗時は `errors` のみ返す現行挙動を維持 |

## ドキュメント更新（完了条件）

影響マップ（`.claude/rules/documentation.md`）に基づき、実装 PR で同時更新する。

- `docs/07-api-specification.md`: OpenAPI/Swagger UI セクション追加（`/api/openapi.json`・`/docs`）。
- `docs/09-architecture-specification.md`: 技術スタックに zod / zod-to-openapi、ドキュメント生成構成を追記（依存追加）。
- `README.md`: 依存追加と「API ドキュメント（`/docs`）」の言及。
- `docs/05-data-specification.md`: バリデーション制約が Zod 由来になる旨を注記。
- `docs/README.md`: notes 索引に本メモを追加（本 PR で対応済み）。

## 作業ステップ

1. ✅ （本メモ）設計レビュー
2. ✅ 依存追加（zod / zod-to-openapi）
3. ✅ Zod スキーマ実装（`schemas/video.ts`）
4. ✅ `validateVideoInput` をアダプタ化し既存テストを緑に（21 件パス）
5. ✅ OpenAPI 生成（`openapi.ts`）+ `/api/openapi.json`
6. ✅ `/docs`（Swagger UI / CDN・SRI 付き）
7. ✅ `types.ts` を `z.infer` へ統合（`VideoItem` / `Category`）
8. ✅ OpenAPI 生成テスト追加（7 件）
9. ✅ ドキュメント更新（完了条件）
10. ⏳ セルフレビュー（`/self-review`）→ PR

## スコープ外

- TypeSpec の導入（Go + Echo 移行直前。`notes/go-echo-backend-plan.md` 参照）
- OpenAPI からのクライアント SDK 自動生成
- 認証フロー自体の変更（[`06-security-specification.md`](../06-security-specification.md) のまま）
