import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

const parseNumber = (value: string | null, fallback: number) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") ?? "added";
  const order = searchParams.get("order") ?? "desc";
  const tag = searchParams.get("tag");
  const category = searchParams.get("category");
  const limit = parseNumber(searchParams.get("limit"), 50);
  const offset = parseNumber(searchParams.get("offset"), 0);

  const orderBy =
    sort === "rating"
      ? { rating: order }
      : sort === "published"
      ? { publishDate: order }
      : { createdAt: order };

  const videos = await prisma.videoEntry.findMany({
    where: {
      ...(tag ? { tags: { has: tag } } : {}),
      ...(category ? { category } : {}),
    },
    orderBy,
    take: limit,
    skip: offset,
  });

  return NextResponse.json(videos.map(toVideoItem));
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.youtubeUrl) {
    return NextResponse.json({ error: "youtubeUrl is required" }, { status: 400 });
  }

  const created = await prisma.videoEntry.create({
    data: {
      youtubeUrl: body.youtubeUrl,
      title: body.title ?? "無題の動画",
      thumbnailUrl: body.thumbnailUrl ?? "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      category: body.category ?? "未分類",
      goodPoints: body.goodPoints ?? "",
      memo: body.memo ?? "",
      rating: body.rating ?? 3,
      publishDate: body.publishDate ? new Date(body.publishDate) : null,
    },
  });

  return NextResponse.json(toVideoItem(created), { status: 201 });
}
