---
description: GitHub Actions の発火ルール — 何を変更したときに何を動かすか
globs: ".github/workflows/**"
---

# GitHub Actions の発火ルール

**「変更した内容に関係のあるジョブだけを動かす」** を原則とする。ドキュメントやルールの更新でテスト・ビルド・デプロイを回さない（CI 時間・コストの浪費、キュー待ちによる他 PR のブロック、無意味なデプロイの発生を防ぐ）。

本プロジェクトの CI は [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)（format:check → lint → typecheck → unit → IT → E2E）。デプロイは Vercel に委譲している。

## トリガの基本形

| ワークフロー | トリガ | 補足 |
| --- | --- | --- |
| CI（lint / test / build） | `pull_request`（対象: `main`）+ `push`（`main` のみ） | **全ブランチの push で回さない**。PR で回れば十分 |
| CD（デプロイ） | `push`（`main` のみ）または `release` | PR では動かさない |
| 手動運用（再デプロイ・ロールバック） | `workflow_dispatch` | 手動実行の口を必ず用意する |

- **`concurrency` を必ず設定する**。同一 PR で連続 push した際に古い実行をキャンセルする。

  ```yaml
  concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true   # CD（デプロイ）では false にする（中断で不整合が起きるため）
  ```

- **`permissions` は最小権限**を明示する（既定の広い権限に依存しない）。読み取りだけなら `contents: read`。

## 変更内容と実行対象

| 変更内容 | lint / test / build | デプロイ | 実行する軽量チェック |
| --- | --- | --- | --- |
| アプリケーションコード（`front/src/**`、`front/prisma/**`） | ✅ | ✅（main マージ時） | — |
| テストコード | ✅ | ❌ | — |
| `docs/**`、`*.md`、`README.md` | ❌ | ❌ | markdown lint、リンク切れチェック |
| `.claude/**`（rules / skills） | ❌ | ❌ | markdown lint |
| `.github/workflows/**` | ✅（自身の検証のため） | ❌ | actionlint（実際は変更種別を問わず常時実行 — 下記「actionlint」） |
| 依存関係（`front/pnpm-lock.yaml`） | ✅ | ✅ | — |
| **すべての変更**（種別を問わない） | — | — | Secret scan（秘匿ファイルの追跡検出。`secret-scan.yml`・常時実行） |

- **Secret scan はパスフィルタを付けず常時実行する**。秘匿ファイルはどの種類の変更でも混入しうるうえ、`git ls-files` を読むだけで数秒で終わるため、分岐させて削れる時間がない。
- **ドキュメント変更でも「何も動かさない」にはしない**。markdown lint・リンク切れ・必須ファイル（README.md / CLAUDE.md）の存在検証は軽量なので実行する。

## パスフィルタの実装（重要な落とし穴）

**ワークフローレベルの `paths` / `paths-ignore` を、required status check（ブランチ保護の必須チェック）と併用してはならない。**

- ワークフロー自体が起動しないと、必須チェックは **`pending` のまま永久に完了せず、PR がマージできなくなる**。
- 一方、**ジョブレベルの `if:` でスキップした場合は「skipped」となり、必須チェックとしては成功扱い**になる。

したがって、**必須チェックにするジョブは「常に起動し、中身をスキップする」形にする**。

```yaml
on:
  pull_request:
    branches: [main]

jobs:
  changes:                      # 変更範囲を判定する
    runs-on: ubuntu-latest
    outputs:
      app: ${{ steps.filter.outputs.app }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            app:
              - '!(docs/**|**/*.md|.claude/**)'

  lint-and-test:                # 必須チェック。常に起動し、中身だけスキップする
    needs: changes
    if: needs.changes.outputs.app == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "run tests"
```

> **現行 `ci.yml` の注意点**: `pull_request` にワークフローレベルの `paths:`（`front/**` / `ci.yml`）が設定されている。`lint-and-test` を required status check に指定する場合は、上記の形（`paths` を外し、`paths-filter` + ジョブ `if:`）へ移行しないと、ドキュメントのみの PR がマージ不能になる。

- 必須チェックにしないワークフロー（デプロイ等）は、ワークフローレベルの `paths-ignore` を使ってよい（起動そのものを止める方が安価）。
- **判定条件は「除外リスト」で書く**（`docs/**` 以外はアプリ変更とみなす）。「対象リスト」で書くと、**新しいディレクトリが増えたときに黙ってテストが走らなくなる**。安全側に倒す。

## デプロイの発火

- **デプロイは `main` へのマージを唯一のトリガとする**。PR ブランチから本番へデプロイしない。
- **Environments（`environment:`）を使い、本番は承認ゲートを置く**。シークレットは Environment 単位で管理し、PR からは参照できないようにする。
- **fork からの PR で `pull_request_target` を安易に使わない**。`pull_request_target` は base リポジトリの権限とシークレットで動くため、fork のコードをチェックアウトして実行するとシークレットが漏洩する。
- デプロイ workflow には `concurrency.cancel-in-progress: false` を設定し、**デプロイ途中でのキャンセルによる不整合を防ぐ**。

## actionlint（ワークフロー定義の検査）

`.github/workflows/*.yml` は `workflows-lint.yml` で **actionlint** により検査する。実行コマンドは CI・ローカルとも **`make actionlint`** に一本化する（コマンド文字列を 2 箇所に書かない — [`duplication.md`](./duplication.md)）。

### 検出できるもの / できないもの

| 検出できる | 検出できない |
|---|---|
| YAML 構文・未知のキー・必須キーの欠落 | ジョブが**意図どおりの条件で動くか**（パスフィルタの書き漏れ等 — 上記「レビュー観点」で見る） |
| `${{ }}` 式の型・未定義のコンテキスト参照 | 外部 Action の中身の安全性 |
| `run:` 内のシェル（**同梱の shellcheck**）・Python（pyflakes） | `run:` から呼ぶ**スクリプトファイルの中身**（`scripts/*.sh` は対象外。必要なら shellcheck を別途かける） |
| 信頼できない入力（`github.event.*.title` 等）を `run:` に直接展開するスクリプトインジェクション | Secret の値や権限設定の妥当性 |

### 実行方法

- **公式 Docker イメージ（`rhysd/actionlint:<タグ>`）を使う**。イメージは `Makefile` の `ACTIONLINT_IMAGE` が正本で、**タグで固定**する（上流の更新で CI が突然落ちないようにする。更新は意図して行う）。
- **ローカルでも `brew install actionlint` / `go install` を使わず、同じ Docker イメージで実行する。** 理由は手段ごとに違う。
  - **`go install`**: shellcheck を連れてこない。actionlint は shellcheck が見つからないと **`run:` の検査を警告も出さずに飛ばし、終了コード 0 で通る**（2026-09 に v1.7.12 で実測: 同じ `SC2086` を含むファイルが、shellcheck ありでは失敗・なしでは無言で成功した）。「手元では通ったのに CI で落ちる」が、レビューで最も見落とされる層で起きる。
  - **`brew install`**: Homebrew の formula は shellcheck に依存するため検査は効くが、**actionlint・shellcheck ともに brew の最新版になり、CI（タグ固定）とバージョンが揃わない**。新しい検査が手元だけ・CI だけで出る不一致が起きる。
- CI では `actions/checkout` を先に置き、`permissions: contents: read` の最小権限で実行する。
- **ワークフローレベルの `paths` を付けず常時実行する**。数秒で終わるためパスフィルタで削れる時間がなく、必須チェックにした場合に `pending` のまま PR がマージ不能になる罠（上記「パスフィルタの実装」）も避けられる。
- ワークフローを変更したら、PR を出す前にローカルで `make actionlint` を通す（Docker 必須）。

### 抑制の作法

抑制は [`static-analysis.md`](./static-analysis.md) の「抑制コメントの扱い」に従い、**理由を書き、範囲を最小にする**。

| 抑制したいもの | 方法 |
|---|---|
| shellcheck の特定ルール（`run:` 内） | 該当行の直前に `# shellcheck disable=SC2086` ＋ 理由コメント |
| actionlint の特定の指摘（ファイル単位） | `.github/actionlint.yaml` の `paths.<glob>.ignore` に正規表現で登録し、理由をコメントで残す |
| 一時的な無視 | `-ignore` オプションは CI コマンド（`Makefile`）に足さない。全ワークフローに効いてしまい、範囲が最小にならない |

## レビュー観点

- ドキュメント・ルールのみの PR で、テストやデプロイが起動していないか。
- 逆に、**アプリコードを変更したのに必要なジョブがスキップされていないか**（パスフィルタの書き漏れ）。
- 必須チェックにしているジョブが、ワークフローレベルの `paths` / `paths-ignore` で止められていないか（PR がマージ不能になる）。
- `permissions` が明示され、最小権限になっているか。
