import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VideoItem, SortOption } from "@/lib/types";

const PAGE_SIZE = 10;
const MAX_VISIBLE_PAGE_BUTTONS = 5;

/**
 * 一覧画面の状態機械。動画リストの取得・ページング・検索（300ms デバウンス）・並び替えを束ねる。
 * 検索/並び替えが変わると 1 ページ目へリセットし、CRUD 後はキャッシュを無効化して再取得する。
 * @returns リスト表示に必要な state・操作関数・派生値（`totalPages` / `visiblePageNumbers` 等）
 */
export function useVideos() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastAppliedFiltersRef = useRef({ sortOption, debouncedSearchQuery });
  const bustCacheNextRef = useRef(false);

  /**
   * 指定ページの動画を取得して state に反映する。
   * 並び替え・検索クエリを API パラメータに変換し、`x-total-count` ヘッダから総件数を取得する。
   * `bustCache` 指定時は `_t` を付与して CDN キャッシュを回避。失敗時は `loadError` を立てる。
   */
  const loadVideos = useCallback(
    async (page: number, bustCache = false) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String((page - 1) * PAGE_SIZE),
          order: "desc",
          sort:
            sortOption === "future" ? "published" : sortOption === "rating" ? "rating" : "added",
        });
        if (debouncedSearchQuery) {
          params.set("q", debouncedSearchQuery);
        }
        if (bustCache) {
          params.set("_t", String(Date.now()));
        }

        const response = await fetch(`/api/videos?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load videos");
        }

        const data = (await response.json()) as VideoItem[];
        const totalCountHeader = response.headers.get("x-total-count");
        const parsedTotalCount = totalCountHeader ? Number(totalCountHeader) : NaN;
        setVideos(data);
        setTotalCount(
          Number.isFinite(parsedTotalCount) && parsedTotalCount >= 0
            ? parsedTotalCount
            : data.length,
        );
      } catch (error) {
        console.error(error);
        setLoadError("データの取得に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    },
    [sortOption, debouncedSearchQuery],
  );

  /**
   * 指定ページへ移動しつつキャッシュを無効化して再取得する（CRUD 後の一覧更新用）。
   * 同一ページなら即再取得、別ページなら次回ロード時にキャッシュ回避するようフラグを立てて遷移する。
   */
  const refreshListPage = useCallback(
    async (page: number) => {
      if (page === currentPage) {
        await loadVideos(page, true);
        return;
      }
      bustCacheNextRef.current = true;
      setCurrentPage(page);
    },
    [currentPage, loadVideos],
  );

  /** 現在ページをキャッシュ無効化して再取得する（編集後の反映用）。 */
  const refreshCurrentPage = useCallback(async () => {
    await loadVideos(currentPage, true);
  }, [currentPage, loadVideos]);

  /**
   * 動画を削除し、削除後の件数に合わせたページへ移動して一覧を更新する。
   * 最終ページの最後の 1 件を消した場合に空ページに残らないよう、遷移先ページを補正する。
   */
  const deleteVideo = useCallback(
    async (id: string, accessToken: string | null) => {
      const response = await fetch(`/api/videos/${id}`, {
        method: "DELETE",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      const nextTotalCount = Math.max(totalCount - 1, 0);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / PAGE_SIZE));
      const nextPage = Math.min(currentPage, nextTotalPages);
      await refreshListPage(nextPage);
    },
    [totalCount, currentPage, refreshListPage],
  );

  // 検索入力を 300ms デバウンスして API 呼び出し回数を抑える。
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ページ/検索/並び替えの変化に反応してロードする。
  // フィルタが変わったら 1 ページ目へ戻し（そのブランチでは再取得せず currentPage 変化で再実行）、
  // それ以外は現在ページを取得する。CRUD 由来のフラグが立っていればキャッシュを無効化する。
  useEffect(() => {
    const prev = lastAppliedFiltersRef.current;
    const filtersChanged =
      prev.sortOption !== sortOption || prev.debouncedSearchQuery !== debouncedSearchQuery;

    lastAppliedFiltersRef.current = { sortOption, debouncedSearchQuery };

    if (filtersChanged && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    const shouldBustCache = bustCacheNextRef.current;
    bustCacheNextRef.current = false;
    void loadVideos(currentPage, shouldBustCache);
  }, [currentPage, sortOption, debouncedSearchQuery, loadVideos]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  /** 現在ページを中央に寄せた最大 5 個のページ番号配列を算出する（端では範囲内に収める）。 */
  const visiblePageNumbers = useMemo(() => {
    const startCentered = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGE_BUTTONS / 2));
    let end = startCentered + MAX_VISIBLE_PAGE_BUTTONS - 1;
    if (end > totalPages) {
      end = totalPages;
    }
    const start = Math.max(1, end - MAX_VISIBLE_PAGE_BUTTONS + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  return {
    videos,
    totalCount,
    currentPage,
    setCurrentPage,
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    isLoading,
    loadError,
    totalPages,
    visiblePageNumbers,
    refreshListPage,
    refreshCurrentPage,
    deleteVideo,
    pageSize: PAGE_SIZE,
  };
}
