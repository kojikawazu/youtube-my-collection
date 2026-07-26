---
description: Vercel のデプロイ制御ルール — vercel.json でいつデプロイを走らせるか
globs: "front/vercel.json"
---

# Vercel デプロイ制御ルール

**「デプロイに影響のある変更のときだけデプロイを走らせる」** を原則とする。Vercel の Git 連携は **GitHub Actions を経由せず push を直接拾う**ため、[`github-actions.md`](./github-actions.md) のパスフィルタではデプロイを止められない。制御は **`vercel.json` 側で行う**。

## vercel.json の配置

- Vercel プロジェクト設定の **Root Directory 直下**に置く。本プロジェクトはフロントが `front/` なので [`front/vercel.json`](../../front/vercel.json)（リポジトリ直下ではない）。
- 先頭に `"$schema": "https://openapi.vercel.sh/vercel.json"` を宣言する（エディタ補完とスキーマ検証を効かせるため）。

## ブランチ単位のデプロイ制御（`git.deploymentEnabled`）

**`deploymentEnabled` は「拒否リスト」であり「許可リスト」ではない。** Vercel の既定は「**列挙されていないブランチはデプロイする**」。

> Specify branches that should **not** trigger a deployment upon commits. By default, any unspecified branch is set to `true`.
> — [Vercel: Git Configuration](https://vercel.com/docs/project-configuration/git-configuration)

したがって **`{"main": true}` とだけ書いても何も止まらない**（main は元々 true、他ブランチも既定 true）。「設定したつもりで全ブランチがデプロイされ続ける」状態になるため、この書き方をしない。

止めたいブランチを **`false` 側で明示する**。

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "**": false,
      "main": true
    }
  }
}
```

- **`*` ではなく `**` を使う。** キーは minimatch で解釈され、**`*` は `/` を跨がない**。本リポジトリのブランチは `feat/` `fix/` `chore/` 等のスラッシュ区切り（[`git.md`](./git.md)）なので、`"*": false` では**素通りする**。
- 複数ルールに一致した場合、**1 つでも `true` があればデプロイされる**（**OR 判定。記述順でも最長一致でもない**）。上記は `main` が `**`（false）と `main`（true）の両方に一致し、`true` があるため main だけデプロイされる。
  - **順序で制御しようとしない。** `"main": true` を先に書いても後に書いても結果は同じ。逆に「後勝ち」と誤解して `"**": false` を後ろに移すと、全ブランチが止まると思い込む事故につながる。
- Preview 環境が必要なブランチは**個別に `true` を追加**する（例: `"release/**": true`）。「とりあえず全許可」に戻さない。
- **`deploymentEnabled: false`（オブジェクトでなく真偽値）は全ブランチを止める**。本番デプロイ手段が失われるため使わない。
- 設定変更後は**実際に作業ブランチを push して発火しないことを確認する**。誤った設定は「止まっているつもり」で気づけない。

## ビルドスキップ（`ignoreCommand`）

デプロイ成果物に影響しない変更（ドキュメント・AI ルール・CI 定義）だけの push では、ビルドを実行しない。

**終了コードの規約（直感と逆なので必ず守る）**:

| 終了コード | Vercel の挙動 |
|---|---|
| `0` | ビルドを**スキップ**する |
| `1`（非 0） | ビルドを**実行**する |

### 比較基準に `HEAD^` を使わない（過去に本番凍結を起こした原因）

**本プロジェクトは一度この機能で本番を凍結させている**（[`docs/09-architecture-specification.md`](../../docs/09-architecture-specification.md) の「デプロイ（Vercel）と Ignored Build Step」）。2026-04 以降 `main` マージが連続スキップされ、本番が古いビルドのまま止まった。

原因は除外パスの書き方ではなく**比較基準**にある。`HEAD^` は「直前のコミット」であって「**最後に実際にデプロイされたコミット**」ではない。

- 一度スキップしたコミットの変更は未デプロイのまま、次回の判定窓 `HEAD^..HEAD` の**外に出る**。以降そのずれは**自己修復せず累積する**。
- Rebase and merge や直 push で複数コミットが一度に載ると、評価されるのは先頭 1 コミットのみで**後方の変更は恒久的にこぼれる**。
- いずれも**ビルド失敗として現れない**。「成功したデプロイが並んでいるのに中身が古い」形で表面化するため発見が遅れる。

したがって基準は **`VERCEL_GIT_PREVIOUS_SHA`** を使う。[公式ドキュメント](https://vercel.com/docs/environment-variables/system-environment-variables)の定義:

> The git SHA of the **last successful deployment** for the project and branch.
> **Note:** This variable is only exposed when an **Ignored Build Step is provided**.

**「最後に成功したデプロイ」**であることが要点。スキップされたビルドは成功デプロイではないため、スキップが続く間も基準はそこに留まり、**取りこぼしが累積しない**。

- **変数が空、または基準コミットがローカルに無い場合は必ず非 0（＝ビルド実行）にする。** 上記のとおり初回は空になり、Vercel は既定で shallow clone するため基準がフェッチされていないこともある。**迷ったらビルドする**が唯一の安全な既定。
- 判定ロジックは `vercel.json` の一行文字列に押し込まず、**スクリプトに切り出す**（`front/scripts/vercel-ignore-build.sh`）。一行文字列は JSON とシェルで二重エスケープされ、pathspec が壊れても気づけない。スクリプトなら `VERCEL_GIT_PREVIOUS_SHA=<sha> bash ... ; echo $?` で終了コードを目視できる。
- **スクリプト自身を除外パスに入れない**（判定ロジックの変更がデプロイに反映されなくなる）。
- 除外は「**そのパスだけが変わった状態で本番が古いままでも許容できるか**」で判断する。アプリコード・ロックファイル・環境変数定義・`vercel.json` は除外しない。

### 導入時の必須手順

過去の事故を繰り返さないため、**導入するときは以下を必ず実施する**。

1. ローカルで両方の分岐を確認する（除外パスのみ → `0`、基準が空 → `1`）。
2. 導入後、**アプリコードを変更した push が `Ignored` になっていないこと**をダッシュボードで確認する。`Ignored` なら判定ロジックのバグなので、除外パスより先に**基準（`VERCEL_GIT_PREVIOUS_SHA` が空でないか）**を疑う。
3. **本番が最新コミットと一致しているかを能動的に監視する**。ビルドスキップの失敗はビルド失敗として現れないため、見に行かないと気づけない（`VERCEL_GIT_COMMIT_SHA` をヘルスチェックで公開する等）。

> **現状**: `front/vercel.json` に `ignoreCommand` は設定していない（過去の撤去以来）。上記の安全な方式での再導入は [issue #164](https://github.com/kojikawazu/youtube-my-collection/issues/164) で扱う。**`HEAD^` を使う旧方式には戻さない。**

## GitHub Actions との役割分担（重複させない）

| 観点 | 担当 |
|---|---|
| Vercel のデプロイをいつ走らせるか（ブランチ） | 本ファイル ＝ `front/vercel.json` |
| lint / test / build を CI でいつ走らせるか | [`github-actions.md`](./github-actions.md) ＝ ワークフローの `paths` |

- Vercel は GitHub Actions を経由しないため、**両者の設定は独立している**。片方を変えても他方は追従しない。
- GitHub Actions から Vercel CLI でデプロイする構成へ移行した場合は、Git 連携を無効化して発火制御を `github-actions.md` に一本化する。

## レビュー観点

- `deploymentEnabled` が**拒否側（`false`）で書かれているか**。`{"main": true}` だけの形になっていないか。
- ブランチのパターンが `/` を含む名前に届いているか（`*` ではなく `**`）。
- `ignoreCommand` を入れる場合、**比較基準が `VERCEL_GIT_PREVIOUS_SHA` になっているか**。`HEAD^` を使っていたら差し戻す（過去に本番凍結を起こした方式）。
- 基準が取れないケースが**非 0（ビルド実行）に倒れているか**。`0` に倒すとデプロイ漏れになる。
- 除外パスにアプリコード・ロックファイル・`vercel.json`・判定スクリプト自身が含まれていないか。
