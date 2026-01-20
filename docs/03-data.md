# データ設計

## エンティティ: video_entries

### フィールド
- id: UUID もしくは整数
- youtube_url: 文字列(必須)
- title: 文字列(保存時に自動取得)
- thumbnail_url: 文字列(保存時に自動取得)
- tags: 文字列配列 もしくは カンマ区切り文字列
  - 各タグ: 10文字以内
- category: 文字列(10文字以内)
- good_points: テキスト(2000文字以内, markdown)
- memo: テキスト(2000文字以内, markdown)
- rating: 整数(1-5)
- publish_date: 日付/日時(将来拡張, nullable)
- created_at: 日時
- updated_at: 日時

### インデックス
- created_at(追加日順)
- rating(良かった順)
- publish_date(将来拡張)

### 派生データ
- title/thumbnail_url は保存時にYouTube URLから取得
