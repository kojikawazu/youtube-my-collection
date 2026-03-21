import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

type UseAuthOptions = {
  showToast: (message: string) => void;
  onNonAdminRejected: () => void;
};

export function useAuth({ showToast, onNonAdminRejected }: UseAuthOptions) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const rejectRef = useRef(false);
  const showToastRef = useRef(showToast);
  const onNonAdminRejectedRef = useRef(onNonAdminRejected);

  useEffect(() => {
    showToastRef.current = showToast;
    onNonAdminRejectedRef.current = onNonAdminRejected;
  }, [showToast, onNonAdminRejected]);

  const verifyAdminSession = async (token: string) => {
    try {
      const response = await fetch("/api/auth/admin", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { isAdmin?: boolean };
      return Boolean(data.isAdmin);
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  useEffect(() => {
    const rejectNonAdmin = async () => {
      if (rejectRef.current) return;
      rejectRef.current = true;
      try {
        await signOut();
      } catch {
        // Ignore signOut errors (e.g. expired token → 403)
      }
      setAccessToken(null);
      setIsAdmin(false);
      onNonAdminRejectedRef.current();
      showToastRef.current("このアカウントは権限がありません。");
      rejectRef.current = false;
    };

    const clearSession = () => {
      setAccessToken(null);
      setIsAdmin(false);
    };

    const applySession = async (session: Session | null) => {
      if (!session?.access_token) {
        clearSession();
        return;
      }

      const token = session.access_token;
      const isAllowed = await verifyAdminSession(token);
      if (isAllowed) {
        setAccessToken(token);
        setIsAdmin(true);
        return;
      }

      await rejectNonAdmin();
    };

    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        clearSession();
        return;
      }
      await applySession(data.session);
    };
    void initSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          clearSession();
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          void applySession(session);
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = () => {
    signInWithGoogle();
  };

  const logout = async () => {
    try {
      await signOut();
    } catch {
      // signOut failure should not block state cleanup
    }
    setAccessToken(null);
    setIsAdmin(false);
  };

  return { isAdmin, accessToken, login, logout };
}
