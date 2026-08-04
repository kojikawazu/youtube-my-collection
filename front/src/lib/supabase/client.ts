import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * ブラウザ用の Supabase クライアント（anon key）。認証（OAuth・セッション購読）に使う。
 *
 * - `flowType: "pkce"`: 認可コード + code verifier のフローを使う。verifier はこの
 *   クライアントの storage に置かれるため、**交換も同じクライアントで行う必要がある**
 *   （`app/auth/callback` をブラウザ側で処理している理由）。
 * - `detectSessionInUrl: false`: URL からのセッション自動取り込みを止める。既定の true だと
 *   callback ページを開いた時点でクライアントが勝手に交換を始め、明示的な
 *   `exchangeCodeForSession` と競合する（認可コードは 1 回しか使えず、後発が必ず失敗する）。
 *   同時に `#access_token` フラグメント（implicit flow）の取り込みも止まるため、
 *   PKCE 以外の経路でセッションが確立されないことが保証される。
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
  },
});
