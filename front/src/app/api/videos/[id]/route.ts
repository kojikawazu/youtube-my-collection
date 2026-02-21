import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateVideoInput } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth-server";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
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
  const { id } = await params;
  const video = await prisma.videoEntry.findUnique({
    where: { id },
  });

  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(toVideoItem(video));
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: routeId } = await params;
    const auth = await requireAdmin(request, "api/videos/[id]");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const targetId = routeId ?? body.id;
    if (!targetId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { data, errors } = validateVideoInput(body, { partial: true });
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const hasDataField = <T extends object, K extends keyof T>(target: T, key: K) =>
      Object.prototype.hasOwnProperty.call(target, key);

    const updated = await prisma.videoEntry.update({
      where: { id: targetId },
      data: {
        ...(hasDataField(data, "youtubeUrl") ? { youtubeUrl: data.youtubeUrl } : {}),
        ...(hasDataField(data, "title") ? { title: data.title } : {}),
        ...(hasDataField(data, "thumbnailUrl") ? { thumbnailUrl: data.thumbnailUrl } : {}),
        ...(hasDataField(data, "tags") ? { tags: data.tags } : {}),
        ...(hasDataField(data, "category") ? { category: data.category } : {}),
        ...(hasDataField(data, "goodPoints") ? { goodPoints: data.goodPoints } : {}),
        ...(hasDataField(data, "memo") ? { memo: data.memo } : {}),
        ...(hasDataField(data, "rating") ? { rating: data.rating } : {}),
        ...(hasDataField(data, "publishDate")
          ? { publishDate: data.publishDate ?? null }
          : {}),
      },
    });

    return NextResponse.json(toVideoItem(updated));
  } catch (error) {
    console.error("Update failed", error);
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: routeId } = await params;
    const auth = await requireAdmin(request, "api/videos/[id]");
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const targetId = routeId ?? body.id;
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
