import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyYouTubeHub",
  description: "お気に入りのYouTube動画を整理する公開コレクション。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
