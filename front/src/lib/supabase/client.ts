import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** ブラウザ用の Supabase クライアント（anon key）。認証（OAuth・セッション購読）に使う。 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
