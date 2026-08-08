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
| github-issue.md | 全体 | GitHub issue 運用（ブランチと対で issue 起票・open/close で進捗管理） |
| pr-description.md | 全体 | PR 初回コメントの必須セクション（変更種別ごとに書くべき項目を固定） |
| testing.md | 全体 | テスト分類・原則・テストツール（Vitest / Playwright） |
| coding-standards.md | 全体 | コーディング規約（TypeScript strict・pnpm・ESLint/Prettier） |
| error-handling.md | 全体 | エラーハンドリング方針（バリデーション・HTTP ステータス） |
| security.md | 全体 | セキュリティ設計方針（認証・通信・インジェクション対策） |
| duplication.md | 全体 | 重複と共通化の判断基準（同じ知識のみ共通化・3 回目で共通化） |
| static-analysis.md | 全体 | 静的解析の運用（役割分担・CI 必須・警告ゼロ・抑制コメント） |
| dead-code.md | 全体 | デッドコード禁止（未使用コード・コメントアウト・旧実装を残さない） |
| lessons-learned.md | 全体 | 教訓の記録（誤り・失敗・ハマりを `docs/lessons-learned.md` に追記して蓄積） |
| github-actions.md | `.github/workflows/**` | CI 発火ルール（関係あるジョブだけ動かす・必須チェックと paths の併用禁止） |
| vercel.md | `front/vercel.json` | Vercel デプロイ制御（deploymentEnabled は拒否リスト・ignoreCommand 不採用） |
| typescript.md | `front/src/**` | TypeScript 固有規約（type/interface・型/定数の配置・Zod 統一・any 禁止） |
| jsdoc.md | `front/src/**` | JSDoc/コメント規約（関数に意図コメント・型は再掲しない） |
| frontend.md | `front/src/{components,app,hooks,repositories,lib,schemas,types,constants}/**` | Next.js フロント設計・アトミックデザイン・server/client 分離・レイヤ一方向依存 |
| api.md | `front/src/app/api/**` | Route Handlers 設計・Zod 検証・認可・HTTP ステータス |
| database.md | `front/prisma/**`, `front/src/lib/**` | Prisma 命名規約・マイグレーション・クエリ規約 |
