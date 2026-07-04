# YouTube My Collection

YouTubeで良かった動画を後から見返せる公開コレクションのフロント実装。

## Rules

明示的な指示がなくても、`.claude/rules/` 内のルールを常に守ってください。

| ファイル | スコープ | 内容 |
|---------|---------|------|
| shortcuts.md | 全体 | 指示ショートカット（PR出して、PR承認しました 等） |
| workflow.md | 全体 | 開発フロー（ブランチ運用・テスト必須） |
| quality-gate.md | 全体 | 品質ゲート（セルフレビュー・設計/実装レビュー） |
| documentation.md | 全体 | ドキュメント更新ルール |
| git.md | 全体 | GitHub Flow・ブランチ命名・push 禁止物 |
| testing.md | 全体 | テスト分類・原則・テストツール（Vitest / Playwright） |
| coding-standards.md | 全体 | コーディング規約（TypeScript strict・pnpm・ESLint/Prettier） |
| error-handling.md | 全体 | エラーハンドリング方針（バリデーション・HTTP ステータス） |
| security.md | 全体 | セキュリティ設計方針（認証・通信・インジェクション対策） |
| jsdoc.md | `front/src/**` | JSDoc/コメント規約（関数に意図コメント・型は再掲しない） |
| frontend.md | `front/src/{components,app,hooks,lib}/**` | Next.js フロント設計・アトミックデザイン・server/client 分離 |
| api.md | `front/src/app/api/**` | Route Handlers 設計・Zod 検証・認可・HTTP ステータス |
| database.md | `front/prisma/**`, `front/src/lib/**` | Prisma 命名規約・マイグレーション・クエリ規約 |
