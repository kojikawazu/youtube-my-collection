import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { VideoItem } from "@/types";

// 子の VideoCard が使う framer-motion / next/image を DOM に落とす。
vi.mock("framer-motion", () => ({
  motion: {
    div: (props: Record<string, unknown>) => {
      const { children, ...rest } = props;
      // framer-motion 固有 props は DOM 要素に渡さない。
      for (const k of [
        "layout",
        "animate",
        "initial",
        "exit",
        "transition",
        "whileHover",
        "whileTap",
      ]) {
        delete rest[k];
      }
      return React.createElement("div", rest, children as React.ReactNode);
    },
  },
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }),
}));

import { VideoList } from "../VideoList";

const makeVideo = (id: string, title: string): VideoItem => ({
  id,
  youtubeUrl: "",
  title,
  thumbnailUrl: "https://img/t.jpg",
  tags: [],
  category: "プログラミング",
  rating: 3,
  addedDate: "2026-01-01T00:00:00Z",
  publishDate: null,
  goodPoints: "",
  memo: "",
});

const baseProps = {
  videos: [] as VideoItem[],
  isAdmin: false,
  searchQuery: "",
  onSearchChange: vi.fn(),
  sortOption: "newest" as const,
  onSortChange: vi.fn(),
  isLoading: false,
  loadError: null as string | null,
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  visiblePageNumbers: [1],
  onPageChange: vi.fn(),
  onVideoClick: vi.fn(),
  onVideoDelete: vi.fn(),
};

describe("VideoList", () => {
  // --- 正常系 ---

  it("動画があればカードとページャを表示する", () => {
    render(
      <VideoList
        {...baseProps}
        videos={[makeVideo("1", "動画A"), makeVideo("2", "動画B")]}
        totalCount={2}
      />,
    );
    expect(screen.getByText("動画A")).toBeInTheDocument();
    expect(screen.getByText("動画B")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  // --- 準正常系（状態の切り替え） ---

  it("エラー時に loadError を表示する", () => {
    render(<VideoList {...baseProps} loadError="データの取得に失敗しました。" />);
    expect(screen.getByText("データの取得に失敗しました。")).toBeInTheDocument();
  });

  it("空（totalCount=0）ではページャを表示しない", () => {
    render(<VideoList {...baseProps} videos={[]} totalCount={0} />);
    expect(screen.getByRole("heading", { name: "コレクション" })).toBeInTheDocument();
    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });

  it("初回ロード中（videos 空）はカードを描画しない", () => {
    render(<VideoList {...baseProps} isLoading={true} videos={[]} />);
    expect(screen.queryByText("動画A")).not.toBeInTheDocument();
  });
});
