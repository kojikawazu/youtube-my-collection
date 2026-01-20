import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = {
  params: {
    id: string;
  };
};

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

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const video = await prisma.videoEntry.findUnique({
    where: { id: params.id },
  });

  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(toVideoItem(video));
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const targetId = params.id ?? body.id;
    if (!targetId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const updated = await prisma.videoEntry.update({
      where: { id: targetId },
      data: {
        ...(body.youtubeUrl ? { youtubeUrl: body.youtubeUrl } : {}),
        ...(body.title ? { title: body.title } : {}),
        ...(body.thumbnailUrl ? { thumbnailUrl: body.thumbnailUrl } : {}),
        ...(Array.isArray(body.tags) ? { tags: body.tags } : {}),
        ...(body.category ? { category: body.category } : {}),
        ...(typeof body.goodPoints === "string" ? { goodPoints: body.goodPoints } : {}),
        ...(typeof body.memo === "string" ? { memo: body.memo } : {}),
        ...(typeof body.rating === "number" ? { rating: body.rating } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "publishDate")
          ? { publishDate: body.publishDate ? new Date(body.publishDate) : null }
          : {}),
      },
    });

    return NextResponse.json(toVideoItem(updated));
  } catch (error) {
    console.error("Update failed", error);
    const message = error instanceof Error ? error.message : "Update failed";
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetId = params.id ?? body.id;
    if (!targetId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.videoEntry.delete({
      where: { id: targetId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete failed", error);
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
