import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateVideoInput } from "@/lib/validation";
import { createClient } from "@supabase/supabase-js";

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
    const targetId = params.id ?? body.id;
    if (!targetId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { data, errors } = validateVideoInput(body, { partial: true });
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const updated = await prisma.videoEntry.update({
      where: { id: targetId },
      data: {
        ...(data.youtubeUrl ? { youtubeUrl: data.youtubeUrl } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.thumbnailUrl ? { thumbnailUrl: data.thumbnailUrl } : {}),
        ...(data.tags ? { tags: data.tags } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(typeof data.goodPoints === "string" ? { goodPoints: data.goodPoints } : {}),
        ...(typeof data.memo === "string" ? { memo: data.memo } : {}),
        ...(typeof data.rating === "number" ? { rating: data.rating } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, "publishDate")
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
