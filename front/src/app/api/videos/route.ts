import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateVideoInput } from "@/schemas/video";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-server";
import { readJsonBody } from "@/lib/request";
import { DEFAULT_RATING } from "@/schemas/video";
import { buildVideoOrderBy, toVideoItem } from "@/lib/videos";

/**
 * クエリ文字列を整数へ変換する。未指定/不正値は `fallback`、範囲外は min/max にクランプする。
 * @param value 変換元のクエリ文字列（未指定は null）
 * @param fallback 未指定/不正値のときに使う既定値
 * @returns 変換・クランプ後の整数
 */
const parseNumber = (
  value: string | null,
  fallback: number,
  range: { min?: number; max?: number } = {},
) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  const integer = Math.trunc(parsed);
  if (typeof range.min === "number" && integer < range.min) return range.min;
  if (typeof range.max === "number" && integer > range.max) return range.max;
  return integer;
};

/**
 * 動画一覧を返す（公開・認証不要）。
 * 並び替え（追加日/評価/公開日）・キーワード（タイトル部分一致 + タグ一致）・タグ/カテゴリ絞り込み・
 * ページング（limit/offset）に対応。総件数は `x-total-count` ヘッダで返し、CDN キャッシュを付与する。
 * @param request 一覧取得のリクエスト（クエリで並び替え・検索・ページングを指定）
 * @returns 動画一覧の JSON（`x-total-count` 等のヘッダ付き）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") ?? "added";
  const order = searchParams.get("order") ?? "desc";
  const q = searchParams.get("q")?.trim() ?? "";
  const tag = searchParams.get("tag");
  const category = searchParams.get("category");
  const limit = parseNumber(searchParams.get("limit"), 10, { min: 1, max: 100 });
  const offset = parseNumber(searchParams.get("offset"), 0, { min: 0 });

  const sortOrder: Prisma.SortOrder = order === "asc" ? "asc" : "desc";
  const orderBy = buildVideoOrderBy(sort, sortOrder);

  const where: Prisma.VideoEntryWhereInput = {
    ...(tag ? { tags: { has: tag } } : {}),
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [{ title: { contains: q, mode: "insensitive" } }, { tags: { has: q } }],
        }
      : {}),
  };

  const [totalCount, videos] = await prisma.$transaction([
    prisma.videoEntry.count({ where }),
    prisma.videoEntry.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    }),
  ]);

  return NextResponse.json(videos.map(toVideoItem), {
    headers: {
      "x-total-count": String(totalCount),
      "x-limit": String(limit),
      "x-offset": String(offset),
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=59",
    },
  });
}

/**
 * 動画を新規作成する（管理者限定）。
 * 認可 → JSON 解析（失敗は 400）→ バリデーション（失敗は 400）→ 作成し、201 で作成済みの動画を返す。
 * @param request 作成リクエスト（Bearer 認可と JSON ボディを含む）
 * @returns 作成した動画の JSON（201）。JSON 解析・検証失敗は 400、認可失敗は 401/403
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "api/videos");
  if (!auth.ok) return auth.response;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const { data, errors } = validateVideoInput(parsed.body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const created = await prisma.videoEntry.create({
    data: {
      youtubeUrl: data.youtubeUrl ?? "",
      title: data.title ?? "無題の動画",
      thumbnailUrl: data.thumbnailUrl ?? "",
      tags: data.tags ?? [],
      category: data.category ?? "未分類",
      goodPoints: data.goodPoints ?? "",
      memo: data.memo ?? "",
      // 既定値の適用は Zod スキーマ側（rating の .default）が正。ここは
      // NormalizedVideo が Partial であることに対する型上のフォールバック。
      rating: data.rating ?? DEFAULT_RATING,
      publishDate: data.publishDate ?? null,
    },
  });

  return NextResponse.json(toVideoItem(created), { status: 201 });
}
