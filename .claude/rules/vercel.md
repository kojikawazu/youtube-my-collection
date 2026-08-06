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

> **現状**: `front/vercel.json` に `deploymentEnabled` は**設定していない**（＝全ブランチで Preview デプロイが発火する）。UI 変更のレビューで実物を確認できることを、ビルド枠の節約より優先する判断（issue #164）。**この節は「止める場合の正しい書き方」を定めるものであり、止めること自体を義務づけるものではない。** 方針を変える際は本節と [`docs/09-architecture-specification.md`](../../docs/09-architecture-specification.md) を併せて更新する。

## ビルドスキップ（`ignoreCommand`）— 入れない

**本プロジェクトでは `ignoreCommand` を設定しない。** docs のみの変更でもビルドが走るが、それを許容する。

### 判断根拠

| | 内容 |
|---|---|
| 得るもの | docs のみの main マージでビルド 1〜2 分の節約 |
| 失うもの | 判定を誤ると**本番が静かに古くなる**。デプロイは成功扱い（緑）のままなので気づけない |
| 安全に運用するコスト | 本番稼働 SHA の監視を別途実装する必要がある。**その手間だけで節約分を超える** |

**失敗の観測可能性が `deploymentEnabled` と非対称**である点が判断を分ける。デプロイが走らないミスは「無いものが見えない」形で発覚するが、ビルドスキップのミスは「**古いものが正常に見えている**」形で潜伏する。1〜2 分のビルド時間と引き換えにこの潜伏リスクを負う理由はない。

本プロジェクトの現行ビルドは **1〜2 分**で、ビルド枠も逼迫していない。`/rules-update` のテンプレートが導入を検討してよいとする条件（1 ビルド 10 分超、月間ビルド枠の逼迫）に**該当しない**。

> **技術的に安全な方式が存在することは、入れる理由にならない。** 後述の `VERCEL_GIT_PREVIOUS_SHA` 方式は下記の欠陥を解消するが、上記の損得は変わらない。「安全になったから入れよう」と再導入しないこと。

### 参考: 過去に本番凍結を起こした 2 つの罠

以下は**将来ビルド時間がボトルネックになった場合**に備えた記録。導入を勧めるものではない。

本プロジェクトは 2026-04 に `ignoreCommand` を導入し、`main` マージが連続スキップされて**本番が凍結**、2026-06 に撤去した（[`docs/09-architecture-specification.md`](../../docs/09-architecture-specification.md) の「デプロイ（Vercel）と Ignored Build Step」）。踏んだ罠は 2 つある。

#### 罠 1: pathspec が Root Directory 基準になる（実際の主因）

**`ignoreCommand` は Vercel の Root Directory（本プロジェクトでは `front/`）をカレントディレクトリとして実行される。** そのため `git diff ... -- front/` は `front/front/` を指し、**何にもマッチしない**。差分は常に空と判定され `exit 0`（＝スキップ）が返り続け、**アプリコードを変更してもスキップされる**状態になった。

```jsonc
// ❌ 本番を凍結させた実際の設定
"ignoreCommand": "git diff HEAD^ HEAD --quiet -- front/"
```

リポジトリルート基準にするには Git の pathspec マジック **`':(top)...'`** が必要（除外なら `':(top,exclude)docs'`）。**この誤りは比較基準を替えても直らない**（実際、基準を `VERCEL_GIT_PREVIOUS_SHA` に替えた修正版でも凍結は続いた）。

#### 罠 2: 比較基準に `HEAD^` を使う

罠 1 を直しても、比較基準が `HEAD^` のままだと別の経路で取りこぼす。`HEAD^` は「直前のコミット」であって「**最後に実際にデプロイされたコミット**」ではない。

- 一度スキップしたコミットの変更は未デプロイのまま、次回の判定窓 `HEAD^..HEAD` の**外に出る**。以降そのずれは**自己修復せず累積する**。
- Rebase and merge や直 push で複数コミットが一度に載ると、評価されるのは先頭 1 コミットのみで**後方の変更は恒久的にこぼれる**。
- いずれも**ビルド失敗として現れない**。「成功したデプロイが並んでいるのに中身が古い」形で表面化するため発見が遅れる。

したがって基準は **`VERCEL_GIT_PREVIOUS_SHA`** を使う。[公式ドキュメント](https://vercel.com/docs/environment-variables/system-environment-variables)の定義:

> The git SHA of the **last successful deployment** for the project and branch.
> **Note:** This variable is only exposed when an **Ignored Build Step is provided**.

**「最後に成功したデプロイ」**であることが要点。スキップされたビルドは成功デプロイではないため、スキップが続く間も基準はそこに留まり、**取りこぼしが累積しない**。

- **変数が空、または基準コミットがローカルに無い場合は必ず非 0（＝ビルド実行）にする。** 上記のとおり初回は空になり、Vercel は既定で shallow clone するため基準がフェッチされていないこともある。**迷ったらビルドする**が唯一の安全な既定。
  - 併せて `git.deploymentEnabled` でプレビューを止めている場合、そのブランチには成功デプロイが無いため**基準は常に空になり、毎回ビルドされる**。**これは正常な動作であり、基準を `HEAD^` に替えて「効かせよう」としない**（スキップされないことを「設定が効いていない」と読み違えると、上記の失敗モードへ逆戻りする）。
- 判定ロジックは `vercel.json` の一行文字列に押し込まず、**スクリプトに切り出す**（`front/scripts/vercel-ignore-build.sh`）。一行文字列は JSON とシェルで二重エスケープされ、pathspec が壊れても気づけない。スクリプトなら `VERCEL_GIT_PREVIOUS_SHA=<sha> bash ... ; echo $?` で終了コードを目視できる。
- **スクリプト自身を除外パスに入れない**（判定ロジックの変更がデプロイに反映されなくなる）。
- 除外は「**そのパスだけが変わった状態で本番が古いままでも許容できるか**」で判断する。アプリコード・ロックファイル・環境変数定義・`vercel.json` は除外しない。

### 導入する場合の最低条件

**1 つでも欠けるなら入れない。**

1. **ビルド時間が実際にボトルネックになっている**（1 ビルド 10 分超、月間ビルド枠の逼迫）。現状の 1〜2 分は該当しない。
2. 比較基準に **`VERCEL_GIT_PREVIOUS_SHA` を使う**（`HEAD^` を使わない）。
3. **基準が取れない場合は必ずビルドする**（非 0 終了）。
4. **判定ロジックをスクリプトに切り出す**（一行文字列はローカルで実行検証できない）。
5. **本番稼働 SHA の監視を用意する**。`VERCEL_GIT_COMMIT_SHA` をヘルスチェック等で公開し、main 先端との一致を確認できるようにする。**これが無いなら入れない** — 検知経路が存在しないため。

導入後は、**アプリコードを変更した push が `Ignored` になっていないこと**をダッシュボードで確認する。`Ignored` なら判定ロジックのバグなので、除外パスより先に**基準（`VERCEL_GIT_PREVIOUS_SHA` が空でないか）**を疑う。

> **現状**: `front/vercel.json` に `ignoreCommand` は設定していない（過去の撤去以来）。**条件 1 を満たしていないため導入しない。** 再検討する場合のみ [issue #164](https://github.com/kojikawazu/youtube-my-collection/issues/164) で扱う。**`HEAD^` を使う旧方式には戻さない。**

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
- pathspec が **`':(top,...)'` でリポジトリルート基準になっているか**。`-- front/` のような Root Directory 相対の指定は**何にもマッチせず全スキップ**になる（過去の凍結の主因）。
- 除外パスにアプリコード・ロックファイル・`vercel.json`・判定スクリプト自身が含まれていないか。
