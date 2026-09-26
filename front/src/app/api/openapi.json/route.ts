import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi";
import { requireAdmin } from "@/lib/auth-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveClientId } from "@/lib/request";

/**
 * OpenAPI 3.0 ドキュメント（Zod スキーマから生成）を返す。Swagger UI が参照する。
 * API スキーマ本体は機密扱いとし、`ADMIN_EMAIL` allowlist を通った管理者のみ閲覧可能。
 * @param request 認可判定に使うリクエスト（Bearer トークンを参照）
 * @returns OpenAPI ドキュメントの JSON。非管理者は 401/403、レートリミット超過は 429
 */
export async function GET(request: NextRequest) {
  const limit = await enforceRateLimit("openapi", resolveClientId(request));
  if (!limit.ok) return limit.response;

  const auth = await requireAdmin(request, "api/openapi.json");
  if (!auth.ok) return auth.response;

  return NextResponse.json(buildOpenApiDocument());
}
