import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import type { VideoItem } from "@/lib/types";

// FE 統合テスト（IT）: page.tsx の画面遷移とフック→コンポーネントの配線を、
// I/O（fetch / Supabase SDK / 認証ラッパ / アニメ / 画像最適化）だけモックして検証する。
// フック（useVideos/useAuth/useVideoForm/useConfirmModal/useToast）と子コンポーネントは実物。

vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() } },
}));
vi.mock("@/lib/auth", () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("framer-motion", () => {
  const strip = (props: Record<string, unknown>) => {
    const { children, ...rest } = props;
    for (const k of [
      "layout",
      "initial",
      "animate",
      "exit",
      "transition",
      "whileHover",
      "whileTap",
    ]) {
      delete rest[k];
    }
    return { rest, children: children as React.ReactNode };
  };
  return {
    motion: {
      div: (p: Record<string, unknown>) => {
        const { rest, children } = strip(p);
        return React.createElement("div", rest, children);
      },
      button: (p: Record<string, unknown>) => {
        const { rest, children } = strip(p);
        return React.createElement("button", rest, children);
      },
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }),
}));

import Page from "../page";
import { supabase } from "@/lib/supabase/client";

const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);

const makeVideo = (id: string, title: string, rating = 3): VideoItem => ({
  id,
  youtubeUrl: `https://youtube.com/watch?v=${id}`,
  title,
  thumbnailUrl: "https://img/t.jpg",
  tags: ["react"],
  category: "プログラミング",
  rating,
  addedDate: "2026-01-01T00:00:00Z",
  publishDate: "2026-02-01T00:00:00Z",
  goodPoints: "",
  memo: "",
});

const makeResponse = (body: unknown, total?: number) => ({
  ok: true,
  status: 200,
  headers: {
    get: (h: string) => (h === "x-total-count" && total !== undefined ? String(total) : null),
  },
  json: async () => body,
});

// URL でルーティングする fetch モック。/api/videos は一覧、/api/auth/admin は判定を返す。
const stubFetch = (videos: VideoItem[], isAdmin: boolean) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes("/api/auth/admin")) return makeResponse({ isAdmin });
      if (url.includes("/api/videos")) return makeResponse(videos, videos.length);
      return makeResponse({});
    }),
  );
};

// 管理者セッションを仕込む（getSession + /api/auth/admin=true）。
const asAdmin = (videos: VideoItem[]) => {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "admin-token" } },
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  stubFetch(videos, true);
};

// 未ログイン（セッション無し）。
const asGuest = (videos: VideoItem[]) => {
  mockGetSession.mockResolvedValue({ data: { session: null } } as unknown as Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >);
  stubFetch(videos, false);
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.stubGlobal("scrollTo", vi.fn());
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Page（FE 統合）", () => {
  // --- 正常系（配線・遷移） ---

  it("fetch した一覧を描画し、カードクリックで詳細へ遷移する", async () => {
    asGuest([makeVideo("1", "React入門"), makeVideo("2", "Vue入門")]);
    render(<Page />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "React入門" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("heading", { name: "React入門" }));

    // VideoDetail へ遷移（level 1 見出し + YouTube リンク）
    expect(screen.getByRole("heading", { name: "React入門", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "YouTube を開く" })).toHaveAttribute(
      "href",
      "https://youtube.com/watch?v=1",
    );
  });

  it("ログインボタンでログイン画面へ遷移する", async () => {
    asGuest([makeVideo("1", "React入門")]);
    render(<Page />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "コレクション" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByRole("heading", { name: "管理者ログイン" })).toBeInTheDocument();
  });

  it("管理者判定が Header バッジ・カード削除ボタンへ配線される", async () => {
    asAdmin([makeVideo("1", "React入門"), makeVideo("2", "Vue入門")]);
    const { container } = render(<Page />);

    // useAuth（getSession → /api/auth/admin）が解決すると管理者 UI が現れる
    await waitFor(() => expect(screen.getByText("管理者")).toBeInTheDocument());
    // isAdmin が VideoList へ伝わり、各カードに削除ボタンが出る
    expect(screen.getAllByRole("button", { name: "削除" })).toHaveLength(2);
    // 追加 FAB（固定ボタン）が出る
    expect(container.querySelector("button.fixed")).not.toBeNull();
  });

  it("管理者は FAB から追加フォームを開ける", async () => {
    asAdmin([makeVideo("1", "React入門")]);
    const { container } = render(<Page />);
    await waitFor(() => expect(screen.getByText("管理者")).toBeInTheDocument());

    fireEvent.click(container.querySelector("button.fixed") as HTMLElement);

    expect(screen.getByRole("heading", { name: "動画を追加" })).toBeInTheDocument();
  });

  // --- 準正常系 ---

  it("未ログインでは管理者バッジも FAB も出ない", async () => {
    asGuest([makeVideo("1", "React入門")]);
    const { container } = render(<Page />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "コレクション" })).toBeInTheDocument(),
    );

    expect(screen.queryByText("管理者")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: "削除" })).toHaveLength(0);
    expect(container.querySelector("button.fixed")).toBeNull();
  });
});
