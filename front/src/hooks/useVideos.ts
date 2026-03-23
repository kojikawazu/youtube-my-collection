import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VideoItem, SortOption } from "@/lib/types";

const PAGE_SIZE = 10;
const MAX_VISIBLE_PAGE_BUTTONS = 5;

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
            sortOption === "future"
              ? "published"
              : sortOption === "rating"
                ? "rating"
                : "added",
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
            : data.length
        );
      } catch (error) {
        console.error(error);
        setLoadError("データの取得に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    },
    [sortOption, debouncedSearchQuery]
  );

  const refreshListPage = useCallback(
    async (page: number) => {
      if (page === currentPage) {
        await loadVideos(page, true);
        return;
      }
      bustCacheNextRef.current = true;
      setCurrentPage(page);
    },
    [currentPage, loadVideos]
  );

  const refreshCurrentPage = useCallback(async () => {
    await loadVideos(currentPage, true);
  }, [currentPage, loadVideos]);

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
    [totalCount, currentPage, refreshListPage]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const prev = lastAppliedFiltersRef.current;
    const filtersChanged =
      prev.sortOption !== sortOption ||
      prev.debouncedSearchQuery !== debouncedSearchQuery;

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
  const visiblePageNumbers = useMemo(() => {
    const startCentered = Math.max(
      1,
      currentPage - Math.floor(MAX_VISIBLE_PAGE_BUTTONS / 2)
    );
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
