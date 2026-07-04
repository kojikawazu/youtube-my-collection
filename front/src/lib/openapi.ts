import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { videoInputSchema, videoItemSchema, MIN_RATING, MAX_RATING } from "@/lib/schemas/video";

// OpenAPI 用メタデータ（.openapi()）はこのサーバー専用モジュールでのみ付与し、
// クライアントバンドルに zod-to-openapi を持ち込まない。
extendZodWithOpenApi(z);

// 検証スキーマの shape をそのまま再ラップして登録する（検証ロジックは単一ソースのまま）。
// 登録時に呼ばれる .openapi() はサーバー側で生成した object インスタンスにのみ必要で、
// 内部フィールドは構造的に解釈される。rating だけは integer/範囲を明示したいので上書きする。
const videoInputDoc = z
  .object({
    ...videoInputSchema.shape,
    rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
  })
  .openapi("VideoInput");

const videoUpdateDoc = videoInputDoc.partial().openapi("VideoUpdate");

const videoItemDoc = z.object(videoItemSchema.shape).openapi("VideoItem");

// 共通レスポンススキーマ
const errorSchema = z.object({ error: z.string() }).openapi("Error");
const validationErrorSchema = z
  .object({ errors: z.record(z.string(), z.string()) })
  .openapi("ValidationError");
const okSchema = z.object({ ok: z.boolean() }).openapi("Ok");
const adminSchema = z.object({ isAdmin: z.boolean() }).openapi("AdminCheck");

const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" }, example: "uuid" }),
});

const listQuery = z.object({
  sort: z.enum(["added", "published", "rating"]).optional(),
  order: z.enum(["desc", "asc"]).optional(),
  q: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/**
 * OpenAPI レスポンスの `application/json` コンテンツ定義を組み立てる小ヘルパー。
 * @param schema レスポンスボディを表す Zod スキーマ
 * @returns `content["application/json"].schema` 形のコンテンツ定義
 */
const json = <T extends z.ZodTypeAny>(schema: T) => ({
  content: { "application/json": { schema } },
});

/**
 * Zod スキーマ（`schemas/video.ts`）から OpenAPI 3.0 ドキュメントを生成する。
 * 仕様の正準は `docs/07-api-specification.md`。本生成物はその「動く版」。
 * @returns 生成した OpenAPI 3.0 ドキュメントオブジェクト
 */
export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    description: "管理操作は Supabase Auth の Bearer トークンが必須",
  });
  const security = [{ [bearerAuth.name]: [] }];

  registry.register("VideoInput", videoInputDoc);
  registry.register("VideoUpdate", videoUpdateDoc);
  registry.register("VideoItem", videoItemDoc);

  // --- 公開 ---
  registry.registerPath({
    method: "get",
    path: "/api/videos",
    summary: "動画一覧取得（公開）",
    tags: ["videos"],
    request: { query: listQuery },
    responses: {
      200: {
        description: "一覧。総件数等はレスポンスヘッダーで返す",
        headers: z.object({
          "x-total-count": z.string().openapi({ description: "一致した総件数" }),
          "x-limit": z.string().openapi({ description: "適用した limit" }),
          "x-offset": z.string().openapi({ description: "適用した offset" }),
        }),
        ...json(z.array(videoItemDoc)),
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/videos/{id}",
    summary: "動画詳細取得（公開）",
    tags: ["videos"],
    request: { params: idParam },
    responses: {
      200: { description: "動画", ...json(videoItemDoc) },
      404: { description: "未検出", ...json(errorSchema) },
    },
  });

  // --- 管理者のみ ---
  registry.registerPath({
    method: "post",
    path: "/api/videos",
    summary: "動画作成（管理者）",
    tags: ["videos"],
    security,
    request: { body: { content: { "application/json": { schema: videoInputDoc } } } },
    responses: {
      201: { description: "作成成功", ...json(videoItemDoc) },
      400: { description: "バリデーションエラー", ...json(validationErrorSchema) },
      401: { description: "未認証", ...json(errorSchema) },
      403: { description: "権限なし", ...json(errorSchema) },
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/videos/{id}",
    summary: "動画更新（管理者）",
    tags: ["videos"],
    security,
    request: {
      params: idParam,
      body: { content: { "application/json": { schema: videoUpdateDoc } } },
    },
    responses: {
      200: { description: "更新成功", ...json(videoItemDoc) },
      400: { description: "バリデーションエラー", ...json(validationErrorSchema) },
      401: { description: "未認証", ...json(errorSchema) },
      403: { description: "権限なし", ...json(errorSchema) },
      404: { description: "未検出", ...json(errorSchema) },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/videos/{id}",
    summary: "動画削除（管理者）",
    tags: ["videos"],
    security,
    request: { params: idParam },
    responses: {
      200: { description: "削除成功", ...json(okSchema) },
      401: { description: "未認証", ...json(errorSchema) },
      403: { description: "権限なし", ...json(errorSchema) },
      500: { description: "削除失敗", ...json(errorSchema) },
    },
  });

  // --- 認証 ---
  registry.registerPath({
    method: "get",
    path: "/api/auth/admin",
    summary: "管理者判定",
    tags: ["auth"],
    security,
    responses: {
      200: { description: "判定結果", ...json(adminSchema) },
      401: { description: "トークン欠如・無効", ...json(adminSchema) },
    },
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "YouTube My Collection API",
      version: "1.0.0",
      description:
        "良かった YouTube 動画の公開コレクション API。仕様の正準は docs/07-api-specification.md。",
    },
    servers: [{ url: "/" }],
  });
}
