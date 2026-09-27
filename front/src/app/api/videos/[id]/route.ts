import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateVideoInput } from "@/schemas/video";
import { requireAdmin } from "@/lib/auth-server";
import { readJsonBody } from "@/lib/request";
import { toVideoItem } from "@/lib/videos";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * 動画 1 件を ID で返す（公開・認証不要）。存在しなければ 404。
 * @param _request 未使用のリクエスト（Route Handler の署名合わせ）
 * @returns 動画 1 件の JSON。未検出は 404
 */
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

/**
 * 動画を部分更新する（管理者限定）。
 * 認可 → JSON 解析 → partial バリデーション → 送信されたフィールドのみ更新する。
 * 対象が存在しない場合（Prisma P2025）は 404、その他の失敗は 500。
 * @param request 更新リクエスト（Bearer 認可と部分更新の JSON ボディ）
 * @returns 更新後の動画 JSON。未検出 404 / JSON 解析・検証失敗 400 / その他 500
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: routeId } = await params;
    const auth = await requireAdmin(request, "api/videos/[id]");
    if (!auth.ok) return auth.response;

    // JSON 解析の失敗だけを先に切り分ける。この try/catch の中で直接 json() を呼ぶと、
    // 壊れた JSON が DB 例外と同じ経路に入り 500 に丸まってしまう。
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;

    // ボディは未検証の unknown。`null` や配列・スカラーでも落ちないよう、
    // オブジェクトのときだけ id の fallback として参照する（形の検証は下の Zod が担う）。
    const body =
      typeof parsed.body === "object" && parsed.body !== null
        ? (parsed.body as { id?: string })
        : {};
    const targetId = routeId ?? body.id;
    if (!targetId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { data, errors } = validateVideoInput(parsed.body, { partial: true });
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // 未送信フィールドを既定値で上書きしないよう、キーの有無で更新対象を判定する。
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
        // publishDate は「明示的な null（未設定にする）」と「undefined（未送信・無効値）」を
        // 区別する（schemas/video.ts の parsePublishDate 参照）。
        // undefined を null に丸めると、不正な日付を送っただけで既存の公開日が消えてしまう。
        ...(hasDataField(data, "publishDate") && data.publishDate !== undefined
          ? { publishDate: data.publishDate }
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

/**
 * 動画を削除する（管理者限定）。認可 → ID 解決 → 削除。失敗時は 500。
 * @param request 削除リクエスト（Bearer 認可、ID はパス優先でボディを fallback）
 * @returns 削除成功 `{ ok: true }` の JSON。失敗時は 500
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: routeId } = await params;
    const auth = await requireAdmin(request, "api/videos/[id]");
    if (!auth.ok) return auth.response;

    // DELETE のボディは任意（ID はパスから解決できる）。POST/PATCH と違い、
    // 解析できないボディは 400 にせず「ボディ無し」として扱う。
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
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
    // 対象が存在しない場合は PATCH と同様に 404 を返す（サーバー側の異常ではないため 500 にしない）。
    if (code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // 内部メッセージをそのまま返さない（error-handling.md: センシティブ情報を漏らさない）。
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
