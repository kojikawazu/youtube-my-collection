import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import type { VideoItem } from "@/lib/types";

// framer-motion / next/image は外部 I/O 相当。motion 固有 props と最適化を剥がし DOM 検証に集中する。
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

import { VideoCard } from "../VideoCard";

const video: VideoItem = {
  id: "v1",
  youtubeUrl: "https://youtu.be/abc",
  title: "テスト動画",
  thumbnailUrl: "https://img/t.jpg",
  tags: ["react"],
  category: "プログラミング",
  rating: 4,
  addedDate: "2026-01-01T00:00:00Z",
  publishDate: null,
  goodPoints: "",
  memo: "",
};

describe("VideoCard", () => {
  // --- 正常系 ---

  it("タイトル・カテゴリ・評価を表示する", () => {
    render(<VideoCard video={video} isAdmin={false} onClick={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("テスト動画")).toBeInTheDocument();
    expect(screen.getByText("プログラミング")).toBeInTheDocument();
    expect(screen.getByLabelText("評価 4 / 5")).toBeInTheDocument();
  });

  it("カードクリックで onClick に video を渡す", () => {
    const onClick = vi.fn();
    render(<VideoCard video={video} isAdmin={false} onClick={onClick} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText("テスト動画"));
    expect(onClick).toHaveBeenCalledWith(video);
  });

  it("管理者は削除ボタンを表示し、クリックで onDelete に id と title を渡す", () => {
    const onDelete = vi.fn();
    render(<VideoCard video={video} isAdmin={true} onClick={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(onDelete).toHaveBeenCalledWith("v1", "テスト動画", expect.anything());
  });

  // --- 準正常系 ---

  it("非管理者では削除ボタンを表示しない", () => {
    render(<VideoCard video={video} isAdmin={false} onClick={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "削除" })).not.toBeInTheDocument();
  });
});
