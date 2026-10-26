import { Bell, Bookmark, Hash, House, Search, Settings, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar as well as the sidebar. */
  mobile?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Feed", icon: House, mobile: true },
  { href: "/explore", label: "Explore", icon: Search, mobile: true },
  { href: "/notifications", label: "Notifications", icon: Bell, mobile: true },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark, mobile: true },
  { href: "/topics", label: "Topics", icon: Hash },
  { href: "/profile", label: "Profile", icon: User, mobile: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Badge text: counts above 99 show as "99+". */
export function badgeLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}
