#!/usr/bin/env bash
# check-secret-files.sh の分類（検出する / 素通りする）を代表パスで固定するテスト。
# 正規表現はワークフローの YAML に埋めると手元で試せず、壊れても気づけないため、ここで検証する。
#
# 使い方: bash scripts/check-secret-files.test.sh
set -euo pipefail

SCRIPT="$(dirname "$0")/check-secret-files.sh"
failures=0

# 1 パスを流し、期待どおりの終了コードになるかを確かめる。
# $1: 検査するパス / $2: 期待（detect = 検出して失敗 / pass = 素通り）
assert_case() {
  local path="$1" expected="$2" actual
  if printf '%s\n' "$path" | bash "$SCRIPT" >/dev/null 2>&1; then
    actual="pass"
  else
    actual="detect"
  fi
  if [ "$actual" = "$expected" ]; then
    echo "ok   ${expected}: ${path}"
  else
    echo "FAIL ${path}: expected ${expected}, got ${actual}"
    failures=$((failures + 1))
  fi
}

# --- 検出する（秘匿ファイル） ---
assert_case "config/master.key" detect
assert_case "front/.env" detect
assert_case "front/.env.local" detect
assert_case "base/.env.production" detect
assert_case "certs/server.pem" detect
assert_case "certs/client.p12" detect
assert_case "android/release.jks" detect
assert_case "secrets/id_rsa" detect
assert_case "id_ed25519" detect
assert_case "gcp/serviceAccountKey.json" detect
assert_case "aws/credentials.json" detect

# --- 素通りする（テンプレート・型定義・名前が似ているだけのファイル） ---
assert_case "front/.env.example" pass
assert_case "front/.env.local.example" pass
assert_case "config/.env.template" pass
assert_case "src/env.d.ts" pass
assert_case "front/.env.d.ts" pass
assert_case "docs/keyboard.md" pass
assert_case "src/apiKey.ts" pass
assert_case "id_rsa.pub" pass
assert_case "README.md" pass

# --- 空入力（追跡ファイルなし）は素通り ---
if printf '' | bash "$SCRIPT" >/dev/null 2>&1; then
  echo "ok   pass: (空入力)"
else
  echo "FAIL (空入力): expected pass, got detect"
  failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
  echo "${failures} 件失敗"
  exit 1
fi
echo "すべて成功"
