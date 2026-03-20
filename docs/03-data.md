# データ設計

## エンティティ: video_entries

### フィールド
- id: UUID もしくは整数
- youtubeUrl: 文字列(必須)
- title: 文字列(ユーザー入力)
- thumbnailUrl: 文字列(YouTube URLからクライアント側で自動生成)
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
- thumbnailUrl はクライアント側でYouTube URLから自動生成
- title はユーザー入力

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
  - 未分類(フォールバック値、UIセレクタには非表示)
