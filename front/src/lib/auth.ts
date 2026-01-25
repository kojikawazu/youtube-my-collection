import { supabase } from "@/lib/supabase/client";

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

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

export const isAdminEmail = (email?: string | null) => {
  if (!email || !adminEmail) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
};
