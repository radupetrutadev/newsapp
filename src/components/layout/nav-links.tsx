"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath, navItems } from "./nav-items";

export function NavLinks({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col items-center gap-0.5 xl:items-stretch">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        const badge = badges[href];
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="group flex py-[3px] outline-none"
          >
            <span className="flex items-center gap-5 rounded-full p-3 transition-colors group-hover:bg-white/10 group-focus-visible:ring-2 group-focus-visible:ring-accent xl:pr-6">
              <span className="relative">
                <Icon
                  className={cn("size-[26px]", active && "fill-foreground/15")}
                  strokeWidth={active ? 2.6 : 1.9}
                />
                {badge ? (
                  <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-black bg-accent px-1 text-[11px] font-bold text-white">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "hidden text-xl xl:inline",
                  active ? "font-bold" : "font-normal text-foreground/95",
                )}
              >
                {label}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
