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

## ビルドスキップ（`ignoreCommand`）は採用しない

**本プロジェクトでは `ignoreCommand` を使わない。** 過去に本番デプロイの誤スキップを起こして撤去した経緯があるため（[`docs/09-architecture-specification.md`](../../docs/09-architecture-specification.md) の「デプロイ（Vercel）と Ignored Build Step」）。

- `git diff HEAD^ HEAD` 方式は、Vercel が**マージコミットの `HEAD^` を第 2 親（feature 側）に解決する**ことがあり、差分が空と判定されてスキップされる。`VERCEL_GIT_PREVIOUS_SHA` も直近ビルド成功したプレビューに解決され得る。
- 実際に **2026-04 以降 `main` マージが連続スキップされ、本番が凍結**した。
- 除外リスト方式（`':(top,exclude)docs'` 等）に書き換えても、**親の解決がずれれば同じ失敗モード**になる。除外の書き方の問題ではない。
- 誤スキップは**本番と最新コードの乖離**として現れ、CI が全て緑のまま気づけない。**ビルド時間の節約より、デプロイ漏れを起こさないことを優先する**。
- docs のみの変更でもビルドが走るが、アプリが小規模なため許容する。

> **`/rules-update` のテンプレートは `ignoreCommand` を基本形に含めている。** テンプレートは終了コードの規約（`0` でスキップ / 非 0 で実行）や除外パスの書き方を説明するが、**マージコミットで `HEAD^` の解決がずれる問題には触れていない**。本プロジェクトはその問題で実害を受けているため、**テンプレート更新のたびに再導入しない**こと。
>
> 再検討する場合は、マージ親や前回 SHA に依存しない判定方式（例: デプロイ対象パスの変更を GitHub Actions 側で判定し、Vercel CLI から明示的にデプロイする）を設計してから行う。

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
- `ignoreCommand` が復活していないか。
