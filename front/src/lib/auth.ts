import { supabase } from "@/lib/supabase/client";

export const signInWithGoogle = async () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectBase = siteUrl && siteUrl.length > 0 ? siteUrl : window.location.origin;
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${redirectBase}/auth/callback`,
    },
  });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};
