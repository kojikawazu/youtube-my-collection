# YouTube My Collection — 開発コマンドのショートカット。
# 実体は front/ 配下の pnpm スクリプトとテスト DB (docker compose)。
# ルートから `make <target>` で叩ける。一覧は `make help`。

# アプリ実装は front/ に集約されているため、各ターゲットはここへ降りて実行する。
FRONT := front
# IT / E2E が使うテスト用 PostgreSQL の compose ファイル（ルートからは front/ 経由で参照）。
TEST_COMPOSE := $(FRONT)/docker-compose.test.yml

.DEFAULT_GOAL := help

# ------------------------------------------------------------
# ヘルプ
# ------------------------------------------------------------

.PHONY: help
help: ## このヘルプを表示する
	@echo "YouTube My Collection - make targets"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ------------------------------------------------------------
# セットアップ
# ------------------------------------------------------------

.PHONY: setup
setup: install prisma-generate ## 依存インストール + Prisma Client 生成（初回セットアップ）

.PHONY: install
install: ## 依存をインストール（frozen lockfile なし・ローカル用）
	cd $(FRONT) && pnpm install

.PHONY: prisma-generate
prisma-generate: ## Prisma Client を生成
	cd $(FRONT) && pnpm exec prisma generate

.PHONY: prisma-pull
prisma-pull: ## 既存 DB スキーマを取り込む（schema.prisma は手書きしない方針）
	cd $(FRONT) && pnpm exec prisma db pull

.PHONY: e2e-install
e2e-install: ## Playwright のブラウザをインストール（E2E 初回のみ）
	cd $(FRONT) && pnpm exec playwright install

# ------------------------------------------------------------
# 開発 / ビルド
# ------------------------------------------------------------

.PHONY: dev
dev: ## 開発サーバーを起動（http://localhost:3000）
	cd $(FRONT) && pnpm dev

.PHONY: build
build: ## 本番ビルド
	cd $(FRONT) && pnpm build

.PHONY: start
start: ## ビルド済みアプリを起動
	cd $(FRONT) && pnpm start

# ------------------------------------------------------------
# 品質チェック
# ------------------------------------------------------------

.PHONY: lint
lint: ## ESLint
	cd $(FRONT) && pnpm lint

.PHONY: typecheck
typecheck: ## 型チェック（tsc --noEmit）
	cd $(FRONT) && pnpm typecheck

.PHONY: format
format: ## Prettier で整形
	cd $(FRONT) && pnpm format

.PHONY: format-check
format-check: ## Prettier の整形チェック（変更しない）
	cd $(FRONT) && pnpm format:check

.PHONY: check
check: format-check lint typecheck test ## CI 相当のローカルゲート（format-check + lint + typecheck + unit）

# ------------------------------------------------------------
# テスト
# ------------------------------------------------------------

.PHONY: test
test: ## ユニットテスト（Vitest・DB 非依存）
	cd $(FRONT) && pnpm test

.PHONY: test-it
test-it: db-up ## 結合テスト（Vitest node + 実 Prisma + PostgreSQL）※テスト DB を自動起動
	cd $(FRONT) && pnpm test:it

.PHONY: test-e2e
test-e2e: db-up ## E2E テスト（Playwright）※テスト DB を自動起動
	cd $(FRONT) && pnpm test:e2e

.PHONY: test-all
test-all: test test-it test-e2e ## 全テスト（ユニット + 結合 + E2E）

# ------------------------------------------------------------
# テスト DB（docker compose）
# ------------------------------------------------------------

.PHONY: db-up
db-up: ## テスト用 PostgreSQL を起動（IT / E2E 用・冪等）
	docker compose -f $(TEST_COMPOSE) up -d --wait

.PHONY: db-down
db-down: ## テスト用 PostgreSQL を破棄（ボリューム含む）
	docker compose -f $(TEST_COMPOSE) down -v
