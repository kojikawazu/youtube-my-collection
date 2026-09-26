// 認証・書き込み系エンドポイントのレートリミット。
// 保護対象・制限値・手段を選んだ理由は docs/06-security-specification.md「レートリミット」を正本とする。
//
// Upstash の REST トークンを読むため、Client Component から引き込まれたらビルドを失敗させる。
import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { RATE_LIMIT_MESSAGE } from "@/constants/auth";
import { resolveUpstashConfig } from "@/lib/rate-limit-env";

/**
 * 保護対象ごとの制限値（IP ごと）。値の根拠は docs/06「レートリミット」の「保護対象と制限」。
 *
 * カウンタは対象ごとに分ける。脅威が違うものを同じ枠に入れると、
 * 管理者の通常操作（書き込み）が管理者判定の枠を食う、といった状態になるため。
 */
const LIMITS = {
  /** 管理者判定。ページ表示・ログイン・トークン更新のたびに 1 回呼ばれる */
  "auth-admin": { requests: 20, windowSeconds: 60 },
  /** 動画の作成・更新・削除。`requireAdmin` で保護済みのため副次的で、通常操作を妨げない値にする */
  "videos-write": { requests: 30, windowSeconds: 60 },
  /** OpenAPI ドキュメント。管理者がドキュメント画面を開くときだけ呼ばれる */
  openapi: { requests: 10, windowSeconds: 60 },
} as const;

/** レートリミットの適用単位。エンドポイントの種類ごとにカウンタを分けるためのキー。 */
type RateLimitTarget = keyof typeof LIMITS;

/**
 * レートリミットの判定結果。`requireAdmin`（`lib/auth-server.ts`）・`readJsonBody`（`lib/request.ts`）と
 * 同じ形にそろえ、超過時は呼び出し側でそのまま返せる `response` を持たせる。
 */
type RateLimitResult =
  /** 通してよい */
  | { ok: true }
  /** 上限超過。429 と `Retry-After` を含むレスポンスをそのまま返す */
  | { ok: false; response: NextResponse };

const upstashConfig = resolveUpstashConfig(process.env);

// 対象ごとの Ratelimit インスタンス。モジュールスコープで 1 度だけ生成し、
// リクエストごとに作り直さない（ウォームスタートをまたいで再利用する）。
// 環境変数が未設定なら null になり、レートリミットは無効化して通す（CI / E2E / Preview を壊さないため。
// 本番は next.config.ts のビルド時チェックで未設定を許さない）。
const limiters: Record<RateLimitTarget, Ratelimit> | null = upstashConfig
  ? (() => {
      const redis = new Redis(upstashConfig);
      const entries = Object.entries(LIMITS).map(([target, { requests, windowSeconds }]) => [
        target,
        new Ratelimit({
          redis,
          // 固定ウィンドウは境界をまたいだ瞬間に上限の 2 倍を通せるため、スライディングウィンドウを使う。
          limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
          prefix: `ratelimit:${target}`,
          analytics: false,
        }),
      ]);
      // Object.fromEntries はキーを string に広げるため、LIMITS と同じキー集合であることをここで宣言する。
      return Object.fromEntries(entries) as Record<RateLimitTarget, Ratelimit>;
    })()
  : null;

// 無効化の警告は 1 度だけ出す。リクエストごとに出すとログが埋まり、
// かえって「効いていない」という事実が見えなくなる。
let disabledWarningEmitted = false;

/**
 * レートリミットを判定する。Route Handler の**先頭**（トークン検証より前）で呼ぶ。
 *
 * 環境変数が未設定なら**常に通す**（無効化）。Upstash への問い合わせが失敗した場合も通す —
 * レートリミットの障害で管理者操作そのものを止める方が損害が大きいため、可用性を優先する。
 * 上限超過時の本文は統一エラーレスポンス `{ error }` に揃える。
 * @param target 適用する制限の種類
 * @param clientId 送信元の識別子（`lib/request.ts` の `resolveClientId` で取り出した IP）
 * @returns 通過なら `{ ok: true }`、上限超過なら 429 の `response` を含む結果
 */
export const enforceRateLimit = async (
  target: RateLimitTarget,
  clientId: string,
): Promise<RateLimitResult> => {
  if (!limiters) {
    if (!disabledWarningEmitted) {
      disabledWarningEmitted = true;
      console.warn(
        "[rate-limit] disabled: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN が未設定",
      );
    }
    return { ok: true };
  }

  let reset: number;
  try {
    const result = await limiters[target].limit(clientId);
    if (result.success) return { ok: true };
    reset = result.reset;
  } catch (error) {
    console.error("[rate-limit] check failed", error);
    return { ok: true };
  }

  // `reset` はウィンドウが空くエポックミリ秒。`Retry-After: 0` は「すぐ再試行してよい」を意味し
  // 上限超過の応答と矛盾するため、切り上げたうえで最低 1 秒を保証する。
  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return {
    ok: false,
    response: NextResponse.json(
      { error: RATE_LIMIT_MESSAGE },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    ),
  };
};
