import { Bell, Bookmark, Compass, Hash, Newspaper, Settings, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** How the top bar shows it: a text link, an icon button, or not at all (it's in the account menu). */
  bar?: "link" | "icon";
  /** Shown in the phone dock. */
  mobile?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Feed", icon: Newspaper, bar: "link", mobile: true },
  { href: "/explore", label: "Explore", icon: Compass, bar: "link", mobile: true },
  { href: "/topics", label: "Topics", icon: Hash, bar: "link" },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark, bar: "link", mobile: true },
  { href: "/notifications", label: "Notifications", icon: Bell, bar: "icon", mobile: true },
  { href: "/profile", label: "Profile", icon: User, mobile: true },
  { href: "/settings", label: "Settings", icon: Settings, bar: "icon" },
];

/** Whether `href` is the current section. Nothing is while the pathname isn't known (null). */
export function isActivePath(pathname: string | null, href: string): boolean {
  if (pathname === null) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Badge text: counts above 99 show as "99+". */
export function badgeLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}
