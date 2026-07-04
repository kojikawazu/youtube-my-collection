/** `watch?v=` / `embed/` / `youtu.be/` の 3 形式に対応。動画 ID をキャプチャする。 */
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/;

/**
 * YouTube URL から動画 ID を抽出する。対応形式外なら `null`。
 * @param url 動画 ID を含み得る YouTube の URL
 * @returns 抽出した動画 ID。対応形式でなければ null
 */
export const getYoutubeId = (url: string): string | null => {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
};

/**
 * YouTube URL からサムネイル URL（`hqdefault.jpg`）を生成する。
 * ID を抽出できない URL では、カード崩れを防ぐため Unsplash のプレースホルダ画像を返す。
 * @param url サムネイル生成元の YouTube URL
 * @returns サムネイル画像 URL。ID 抽出不可時は Unsplash のプレースホルダ URL
 */
export const getYoutubeThumbnail = (url: string): string => {
  const id = getYoutubeId(url);
  if (!id) {
    return "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop";
  }
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
};
