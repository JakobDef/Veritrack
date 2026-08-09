"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { BandSwitcher } from "./BandSwitcher";
import { NAV_ITEMS } from "./nav";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { roleColorVar } from "@/lib/roleColors";
import { cn } from "@/lib/cn";

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { member } = useBand();

  return (
    <aside className="border-border bg-surface hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="px-4 py-5">
        <Link href="/dashboard" className="inline-flex">
          <Wordmark />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:text-text hover:bg-surface-2",
              )}
            >
              {active ? (
                <span className="bg-accent absolute top-1/2 -left-3 h-5 w-0.5 -translate-y-1/2 rounded-r-full" />
              ) : null}
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3 p-3">
        <BandSwitcher />
        <div className="border-border flex items-center gap-2 border-t pt-3">
          <Avatar
            name={member?.displayName ?? user?.displayName ?? user?.email}
            src={user?.photoURL}
            color={member ? roleColorVar(member.roleColor) : null}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {member?.displayName ?? user?.displayName ?? "Du"}
            </p>
            {member?.role ? <p className="text-faint truncate text-[11px]">{member.role}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Abmelden"
            title="Abmelden"
            className="text-faint hover:text-danger rounded-sm p-1.5 transition-colors"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
        <ThemeToggle className="self-start" />
      </div>
    </aside>
  );
}
