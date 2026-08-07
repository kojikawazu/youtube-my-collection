/**
 * Markdown の見出しアンカーリンク（`](#anchor)` / `](./file.md#anchor)`）が、
 * リンク先ファイルの見出しから実際に生成されるアンカーと一致するかを検査する。
 *
 * docs.yml の相対リンクチェックは**ファイルの実在しか見ていない**ため、
 * 「ファイルはあるがアンカーが無い」壊れ方（見出しのリネーム・目次の更新漏れ）を検出できない。
 * 本スクリプトがその穴を埋める（issue #137）。
 *
 * アンカー生成規則は自前実装せず `github-slugger` に委ねる。GitHub の規則は
 * 「小文字化・空白をハイフン・記号除去」という単純な説明では再現できず、
 * 例えば `① ログイン開始` → `-ログイン開始`（`①` は除去され先頭がハイフンになる）、
 * `OpenAPI / Swagger UI` → `openapi--swagger-ui`（ハイフン 2 連）のように直感と食い違う。
 * 自前実装は必ずどこかでズレるため、正準実装をそのまま使う。
 *
 * 検出できないもの: 「詳細は jsdoc.md の『必須対象』節に従う」のような**自然言語による参照**。
 * これは機械検出できないためレビューで担保する。
 */
const GithubSlugger = require("github-slugger");
const { readFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

/** base/ は別プロジェクトの参考実装のため対象外（docs.yml の相対リンクチェックと同じ除外）。 */
const files = execFileSync("git", ["ls-files", "*.md"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !f.startsWith("base/"));

/**
 * 1 ファイルの見出しから、GitHub が生成するアンカーの集合を作る。
 * @param file リポジトリルートからの Markdown ファイルパス
 * @returns そのファイル内に存在するアンカー文字列の集合
 */
function anchorsOf(file) {
  const slugger = new GithubSlugger();
  const anchors = new Set();
  let inFence = false;

  for (const line of readFileSync(file, "utf8").split("\n")) {
    // コードフェンス内の `# コメント` は見出しではないので除外する。
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!heading) continue;

    // 見出し内のリンク・強調・インラインコードの記法を落としてからスラグ化する。
    // `_` は落とさない。`redirect_uri_mismatch` のような識別子が見出しに現れるため、
    // 強調記号として一律に除去するとアンカーが壊れる。
    const text = heading[2]
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*`]/g, "");

    // slugger は同名見出しに -1, -2 を振るため、ファイルごとにインスタンスを作る。
    anchors.add(slugger.slug(text));
  }
  return anchors;
}

const cache = new Map();
/**
 * ファイルのアンカー集合をキャッシュ付きで取得する。
 * @param file リポジトリルートからの Markdown ファイルパス
 * @returns アンカー集合。読み取れない場合は null
 */
function anchorsCached(file) {
  if (!cache.has(file)) {
    try {
      cache.set(file, anchorsOf(file));
    } catch {
      // ファイル欠落は docs.yml の相対リンクチェックが検出する担当。ここでは黙って見送る。
      cache.set(file, null);
    }
  }
  return cache.get(file);
}

let checked = 0;
let broken = 0;

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  const dir = path.dirname(file);
  let inFence = false;

  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    for (const match of line.matchAll(/\]\(([^)\s]+)\)/g)) {
      const link = match[1];
      if (/^(https?:|mailto:)/.test(link)) continue;

      const hashAt = link.indexOf("#");
      if (hashAt === -1) continue;

      // 日本語アンカーは URL エンコードされて書かれることがあるため復号して比較する。
      let anchor;
      try {
        anchor = decodeURIComponent(link.slice(hashAt + 1));
      } catch {
        anchor = link.slice(hashAt + 1);
      }
      if (!anchor) continue;

      const targetPath = link.slice(0, hashAt);
      const target =
        targetPath === "" ? file : path.normalize(path.join(dir, targetPath));

      const anchors = anchorsCached(target);
      if (anchors === null) continue;

      checked++;
      if (!anchors.has(anchor)) {
        broken++;
        console.log(
          `::error file=${file},line=${index + 1}::アンカーが存在しません: #${anchor} -> ${target}`,
        );
      }
    }
  });
}

if (broken > 0) {
  console.log(
    `\n見出しアンカーの不一致が ${broken} 件見つかりました（検査 ${checked} 件）。`,
  );
  console.log(
    "リンク先ファイルの見出しを確認してください。GitHub のアンカーは見出しから自動生成されるため、見出しをリネームするとリンクが静かに壊れます。",
  );
  process.exit(1);
}

console.log(`見出しアンカー ${checked} 件はすべて解決しました。`);
