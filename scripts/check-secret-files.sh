#!/usr/bin/env bash
# Git の追跡対象に秘匿ファイル（鍵・証明書・.env 系）が含まれていないかを検査する（issue #190）。
#
# 使い方: git ls-files | bash scripts/check-secret-files.sh
#   標準入力でパス一覧を受け取る。検査対象を呼び出し側が決められるようにし、
#   テスト（check-secret-files.test.sh）から任意のパスを流し込めるようにするため。
#
# .gitignore は「未追跡のファイル」にしか効かず、`git add -f` や書き漏れは止められない。
# また一度 push した秘匿ファイルは追跡を外しても履歴に残るため、対処は鍵のローテーションしかない。
# そこで「追跡された時点で CI を落とす」検出側をここで担う。
set -euo pipefail

# 検出対象: .env 系 / 鍵・証明書・キーストア / SSH 秘密鍵 / クラウドの認証情報ファイル。
SECRET_PATTERN='(^|/)(\.env(\..+)?|[^/]+\.(key|pem|p12|pfx|jks|keystore)|id_rsa|id_ed25519|id_dsa|credentials\.json|serviceAccountKey\.json)$'
# 除外: テンプレート（値を持たない雛形）と TypeScript の型定義（.env.d.ts）。誤検知になるため。
ALLOW_PATTERN='\.(example|sample|template|dist)$|\.env\.d\.ts$'

# grep は一致なしで終了コード 1 を返すため、`|| true` で「検出なし」を正常扱いにする。
tracked=$(grep -E "$SECRET_PATTERN" | grep -vE "$ALLOW_PATTERN" || true)

if [ -n "$tracked" ]; then
  echo "::error::秘匿ファイルが Git 管理下にあります。.gitignore への追加や追跡解除では履歴から消えないため、鍵・トークンのローテーションが必要です。"
  echo "$tracked"
  exit 1
fi
echo "OK: 追跡対象に秘匿ファイルはありません"
