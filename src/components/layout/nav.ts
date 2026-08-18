import { BarChart3, CalendarRange, Clock, FolderKanban, LayoutDashboard, Settings, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the compact mobile bar. The rest stay in the "more" sheet. */
  primary?: boolean;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { href: "/projects", label: "Projekte", icon: FolderKanban, primary: true },
  { href: "/time", label: "Zeiten", icon: Clock, primary: true },
  { href: "/timetable", label: "Timetable", icon: CalendarRange, primary: true },
  { href: "/stats", label: "Statistik", icon: BarChart3 },
  { href: "/payout", label: "Abrechnung", icon: Wallet, adminOnly: true },
  { href: "/members", label: "Mitglieder", icon: Users },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];
