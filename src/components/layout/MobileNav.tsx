"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, MoreHorizontal } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { isActivePath } from "./Sidebar";
import { Dialog } from "@/components/ui/Dialog";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BandSwitcher } from "./BandSwitcher";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { cn } from "@/lib/cn";

/**
 * Under `md` the sidebar becomes a fixed bottom bar with the four primary
 * destinations plus a sheet holding the rest. Bottom rather than top so it stays
 * in thumb reach, which matters because the running timer lives up top.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { signOut } = useAuth();
  const { can } = useBand();

  const visible = NAV_ITEMS.filter((item) => !item.adminOnly || can.isAdmin);
  const primary = visible.filter((item) => item.primary);
  const rest = visible.filter((item) => !item.primary);

  return (
    <>
      <nav className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? "text-accent" : "text-faint",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="text-faint flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium"
        >
          <MoreHorizontal className="size-5" aria-hidden />
          Mehr
        </button>
      </nav>

      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Mehr"
        size="sm"
        overflow="visible"
      >
        <div className="flex flex-col gap-4">
          <BandSwitcher menuPlacement="down" />
          <div className="flex flex-col gap-0.5">
            {rest.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setSheetOpen(false)}
                className="text-text hover:bg-surface-2 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
          <div className="border-border flex items-center justify-between border-t pt-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden />
              Abmelden
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
