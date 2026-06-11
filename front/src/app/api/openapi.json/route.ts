import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi";

/** OpenAPI 3.0 ドキュメント（Zod スキーマから生成）を返す。Swagger UI が参照する。 */
export function GET() {
  return NextResponse.json(buildOpenApiDocument());
}
