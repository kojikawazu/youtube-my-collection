# データ設計

## エンティティ: video_entries

### フィールド
- id: UUID もしくは整数
- youtubeUrl: 文字列(必須)
- title: 文字列(保存時に自動取得)
- thumbnailUrl: 文字列(保存時に自動取得)
- tags: 文字列配列
  - 各タグ: 10文字以内
- category: 文字列(10文字以内, UIは単一プリセット選択)
- goodPoints: テキスト(2000文字以内, markdown)
- memo: テキスト(2000文字以内, markdown)
- rating: 整数(1-5)
- publishDate: 日付/日時(将来拡張, nullable)
- createdAt: 日時
- updatedAt: 日時

### インデックス
- createdAt(追加日順)
- rating(良かった順)
- publishDate(将来拡張)

### 派生データ
- title/thumbnailUrl は保存時にYouTube URLから取得

### 補足
- UIはカテゴリのプリセットを提供するが、APIは文字列として扱う
  - AI
  - クラウド
  - バックエンド
  - フロントエンド
  - CI/CD
  - Linux
  - テック企業
  - プログラミング
