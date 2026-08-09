"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RunningTimerBar } from "@/components/timer/RunningTimerBar";
import { Wordmark } from "@/components/brand/Logo";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";

/** Routes reachable while the user belongs to no band yet. */
function isBandSetupRoute(pathname: string) {
  return pathname === "/bands" || pathname.startsWith("/bands/");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { hasNoBand, loading: bandLoading } = useBand();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (hasNoBand && !isBandSetupRoute(pathname)) {
      router.replace("/bands");
    }
  }, [authLoading, user, hasNoBand, pathname, router]);

  if (authLoading || !user) return <AppShellSkeleton />;
  if (hasNoBand && !isBandSetupRoute(pathname)) return <AppShellSkeleton />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-bg/85 sticky top-0 z-30 border-b backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5 md:px-6">
            <div className="md:hidden">
              <Wordmark />
            </div>
            <div className="min-w-0 flex-1">
              <RunningTimerBar />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 pt-5 pb-24 md:px-6 md:pb-10">
          {bandLoading && !isBandSetupRoute(pathname) ? <PageSkeleton /> : children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh">
      <div className="border-border bg-surface hidden w-60 shrink-0 flex-col gap-2 border-r p-4 md:flex">
        <Skeleton className="mb-4 h-7 w-32" />
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      <div className="flex-1 p-6">
        <PageSkeleton />
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
