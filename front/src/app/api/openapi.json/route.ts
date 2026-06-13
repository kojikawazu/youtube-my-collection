import { NextRequest, NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi";
import { requireAdmin } from "@/lib/auth-server";

/**
 * OpenAPI 3.0 ドキュメント（Zod スキーマから生成）を返す。Swagger UI が参照する。
 * API スキーマ本体は機密扱いとし、`ADMIN_EMAIL` allowlist を通った管理者のみ閲覧可能。
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "api/openapi.json");
  if (!auth.ok) return auth.response;

  return NextResponse.json(buildOpenApiDocument());
}
