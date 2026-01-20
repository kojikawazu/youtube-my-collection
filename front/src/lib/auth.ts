import { supabase } from "@/lib/supabase/client";

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

export const signInWithGoogle = async () => {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
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
