import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateVideoInput } from "@/lib/validation";
import { createClient } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";

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

  const sortOrder: Prisma.SortOrder = order === "asc" ? "asc" : "desc";
  const orderBy =
    sort === "rating"
      ? { rating: sortOrder }
      : sort === "published"
      ? { publishDate: sortOrder }
      : { createdAt: sortOrder };

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
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        authorization: authHeader,
      },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const email = authData?.user?.email ?? "";
  if (authError || !adminEmail || email.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
