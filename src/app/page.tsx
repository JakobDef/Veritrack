"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";

/**
 * Entry point. Sends the visitor wherever they actually belong. Kept client-side
 * because auth state lives in the Firebase client SDK, not in a cookie the
 * server could read.
 */
export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { hasNoBand, loading: bandLoading } = useBand();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (bandLoading) return;
    router.replace(hasNoBand ? "/bands" : "/dashboard");
  }, [authLoading, user, bandLoading, hasNoBand, router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <LogoMark className="text-accent size-9 animate-pulse" />
      <span className="sr-only">Veritrack wird geladen</span>
    </main>
  );
}
