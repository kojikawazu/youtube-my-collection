import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateVideoInput } from "@/lib/validation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-server";

const toVideoItem = (video: {
  id: string;
  youtubeUrl: string;
  title: string;
  thumbnailUrl: string;
  tags: string[];
  category: string;
  goodPoints: string;
  memo: string;
  rating: number;
  publishDate: Date | null;
  createdAt: Date;
}) => ({
  id: video.id,
  youtubeUrl: video.youtubeUrl,
  title: video.title,
  thumbnailUrl: video.thumbnailUrl,
  tags: video.tags,
  category: video.category,
  goodPoints: video.goodPoints,
  memo: video.memo,
  rating: video.rating,
  publishDate: video.publishDate ? video.publishDate.toISOString() : null,
  addedDate: video.createdAt.toISOString(),
});

const parseNumber = (
  value: string | null,
  fallback: number,
  range: { min?: number; max?: number } = {}
) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  const integer = Math.trunc(parsed);
  if (typeof range.min === "number" && integer < range.min) return range.min;
  if (typeof range.max === "number" && integer > range.max) return range.max;
  return integer;
};

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
  const orderBy =
    sort === "rating"
      ? { rating: sortOrder }
      : sort === "published"
      ? { publishDate: sortOrder }
      : { createdAt: sortOrder };

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
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "api/videos");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { data, errors } = validateVideoInput(body);

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
      rating: data.rating ?? 3,
      publishDate: data.publishDate ?? null,
    },
  });

  return NextResponse.json(toVideoItem(created), { status: 201 });
}
