import { describe, it, expect } from "vitest";
import { buildOpenApiDocument } from "@/lib/openapi";
import {
  CATEGORY_VALUES,
  videoInputSchema,
  videoItemSchema,
} from "@/lib/schemas/video";

// 生成は決定的なので 1 回だけ実行して使い回す。
const doc = buildOpenApiDocument();
// 生成された OpenAPI JSON（深くネストした SchemaObject）をテストから緩く辿るための型。
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const schemas = (doc.components?.schemas ?? {}) as Record<string, any>;
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const paths = doc.paths as Record<string, any>;

describe("buildOpenApiDocument", () => {
  // --- 正常系 ---

  it("公開・管理・認証の全エンドポイントを OpenAPI 3.0 として生成する", () => {
    expect(doc.openapi).toBe("3.0.0");
    expect(Object.keys(paths).sort()).toEqual(
      ["/api/auth/admin", "/api/videos", "/api/videos/{id}"].sort()
    );
    expect(paths["/api/videos"].get).toBeDefined();
    expect(paths["/api/videos"].post).toBeDefined();
    expect(paths["/api/videos/{id}"].get).toBeDefined();
    expect(paths["/api/videos/{id}"].patch).toBeDefined();
    expect(paths["/api/videos/{id}"].delete).toBeDefined();
    expect(paths["/api/auth/admin"].get).toBeDefined();
  });

  it("VideoItem の category enum は CATEGORY_VALUES と一致する", () => {
    expect(schemas.VideoItem.properties.category.enum).toEqual([...CATEGORY_VALUES]);
  });

  it("OpenAPI スキーマのプロパティが検証スキーマ（単一ソース）と乖離しない", () => {
    // ドキュメントは openapi.ts で再ラップして生成するため、検証スキーマの
    // shape とプロパティ集合が一致することを保証してドリフトを防ぐ。
    expect(Object.keys(schemas.VideoItem.properties).sort()).toEqual(
      Object.keys(videoItemSchema.shape).sort()
    );
    expect(Object.keys(schemas.VideoInput.properties).sort()).toEqual(
      Object.keys(videoInputSchema.shape).sort()
    );
  });

  it("VideoInput の必須は youtubeUrl/title/rating、rating は 1-5 の integer", () => {
    expect(schemas.VideoInput.required.sort()).toEqual(
      ["rating", "title", "youtubeUrl"].sort()
    );
    expect(schemas.VideoInput.properties.rating).toMatchObject({
      type: "integer",
      minimum: 1,
      maximum: 5,
    });
  });

  // --- 準正常系（契約として明示すべきエラー応答） ---

  it("POST /api/videos は 400/401/403 のエラー応答を定義する", () => {
    const responses = paths["/api/videos"].post.responses;
    expect(responses["201"]).toBeDefined();
    expect(responses["400"]).toBeDefined();
    expect(responses["401"]).toBeDefined();
    expect(responses["403"]).toBeDefined();
  });

  it("PATCH /api/videos/{id} は 400/401/403/404 を定義する", () => {
    const responses = paths["/api/videos/{id}"].patch.responses;
    expect(responses["400"]).toBeDefined();
    expect(responses["401"]).toBeDefined();
    expect(responses["403"]).toBeDefined();
    expect(responses["404"]).toBeDefined();
  });

  it("管理操作は bearerAuth セキュリティを要求する", () => {
    expect(doc.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(paths["/api/videos"].post.security).toEqual([{ bearerAuth: [] }]);
    expect(paths["/api/videos/{id}"].delete.security).toEqual([{ bearerAuth: [] }]);
    // 公開 GET にはセキュリティを課さない
    expect(paths["/api/videos"].get.security).toBeUndefined();
  });

  // --- 異常系（壊れた入力に対する生成器の堅牢性） ---

  it("一覧の x-total-count ヘッダーを 200 応答に含む", () => {
    const headers = paths["/api/videos"].get.responses["200"].headers;
    expect(headers?.["x-total-count"]).toBeDefined();
  });
});
