# YouTube サムネイル取得の仕組み

## 結論: YouTube API は使っていない

本プロジェクトでは YouTube Data API を一切使用していない。
サムネイル画像は YouTube が公開している静的画像エンドポイントから、API キーなしで取得している。

## 実装（`front/src/lib/youtube.ts`）

### `getYoutubeId` — URL から動画 ID を抽出

```tsx
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/;

export const getYoutubeId = (url: string): string | null => {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
};
```

対応する URL 形式:

| 形式 | 例 |
|------|----|
| 通常 | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| 埋め込み | `https://www.youtube.com/embed/dQw4w9WgXcQ` |
| 短縮 | `https://youtu.be/dQw4w9WgXcQ` |

正規表現のキャプチャグループ `([a-zA-Z0-9_-]{6,})` で動画 ID 部分（英数字・ハイフン・アンダースコア、6文字以上）を取り出す。

### `getYoutubeThumbnail` — 動画 ID からサムネイル URL を生成

```tsx
export const getYoutubeThumbnail = (url: string): string => {
  const id = getYoutubeId(url);
  if (!id) {
    // ID が取れない場合はフォールバック画像（Unsplash のプログラミング画像）
    return "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop";
  }
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
};
```

## YouTube サムネイル画像エンドポイント

YouTube は動画ごとにサムネイル画像を以下の URL で公開している。API キーは不要。

```
https://img.youtube.com/vi/{動画ID}/{品質}.jpg
```

### 利用可能な品質一覧

| ファイル名 | 解像度 | 備考 |
|------------|--------|------|
| `default.jpg` | 120 x 90 | 最小サイズ |
| `mqdefault.jpg` | 320 x 180 | 中品質 |
| `hqdefault.jpg` | 480 x 360 | **本プロジェクトで使用** |
| `sddefault.jpg` | 640 x 480 | 標準画質 |
| `maxresdefault.jpg` | 1280 x 720 | 最高画質（動画によっては存在しない） |

本プロジェクトでは `hqdefault.jpg`（480x360）を採用。カードのサムネイル表示に十分な解像度で、ほぼすべての動画で確実に存在する。

## 使用箇所

`getYoutubeThumbnail` はフォーム送信時に呼ばれ、サーバーに送る `thumbnailUrl` を生成する。

```tsx
// page.tsx:326（新規追加時）
thumbnailUrl: getYoutubeThumbnail(formData.youtubeUrl ?? ""),

// page.tsx:366（編集時）
thumbnailUrl: getYoutubeThumbnail(formData.youtubeUrl ?? ""),
```

仕様書（`01-requirements.md`）で「サムネURLはYouTube URLからクライアント側で自動生成」と定められているため、ユーザーがサムネ URL を手入力する必要はない。

## なぜ YouTube Data API を使わないのか

| 観点 | API なし（現在の方式） | YouTube Data API |
|------|------------------------|------------------|
| API キー | 不要 | 必要（Google Cloud Console で取得） |
| レート制限 | なし | 日次クォータあり（デフォルト 10,000 単位/日） |
| コスト | 無料 | 無料枠あり、超過時は課金 |
| 取得できる情報 | サムネイル URL のみ | タイトル・説明・再生数・チャンネル情報など多数 |
| 実装の複雑さ | 正規表現のみ | HTTP リクエスト + レスポンス解析 + エラーハンドリング |

本プロジェクトではサムネイル画像だけが必要なので、API を使う必要がない。
タイトルはユーザーが手入力する仕様（`01-requirements.md`）であり、API から自動取得する設計ではない。
