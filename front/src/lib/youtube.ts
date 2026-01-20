const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/;

export const getYoutubeId = (url: string): string | null => {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
};

export const getYoutubeThumbnail = (url: string): string => {
  const id = getYoutubeId(url);
  if (!id) {
    return "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop";
  }
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
};
