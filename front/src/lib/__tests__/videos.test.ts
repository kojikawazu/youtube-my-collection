import { describe, it, expect } from "vitest";
import { buildVideoOrderBy } from "../videos";

describe("buildVideoOrderBy", () => {
  // --- 正常系 ---

  it("sort=rating では rating → createdAt → id の順に並べる", () => {
    expect(buildVideoOrderBy("rating", "desc")).toEqual([
      { rating: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ]);
  });

  it("sort=published では publishDate（null は末尾）→ createdAt → id の順に並べる", () => {
    expect(buildVideoOrderBy("published", "desc")).toEqual([
      { publishDate: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "desc" },
    ]);
  });

  it("sort=added では createdAt → id の順に並べる", () => {
    expect(buildVideoOrderBy("added", "desc")).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it("order=asc はタイブレーカーにも伝播する（反転で完全な逆順になる）", () => {
    expect(buildVideoOrderBy("rating", "asc")).toEqual([
      { rating: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ]);
  });

  it("publishDate の null 位置は order に関わらず末尾で固定される", () => {
    expect(buildVideoOrderBy("published", "asc")[0]).toEqual({
      publishDate: { sort: "asc", nulls: "last" },
    });
  });

  // --- 準正常系 ---

  it("未知の sort は追加日順にフォールバックする", () => {
    expect(buildVideoOrderBy("unknown", "desc")).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it("空文字の sort も追加日順にフォールバックする", () => {
    expect(buildVideoOrderBy("", "desc")).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  // --- 異常系（一意性の保証） ---

  it("どの sort でも末尾は主キー id になる（順序が一意に確定する）", () => {
    for (const sort of ["rating", "published", "added", "unknown"]) {
      const orderBy = buildVideoOrderBy(sort, "desc");
      expect(orderBy[orderBy.length - 1]).toEqual({ id: "desc" });
    }
  });
});
