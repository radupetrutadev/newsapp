"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { SearchBox } from "./search-box";

/**
 * The sidebar search is hidden on pages that already have one, like X. Pages
 * whose address is only known at request time (a story published after the
 * build, say) aren't those, so they're prerendered with it.
 */
export function SidebarSearch() {
  return (
    <Suspense fallback={<SidebarSearchBox />}>
      <SidebarSearchForPage />
    </Suspense>
  );
}

function SidebarSearchForPage() {
  const pathname = usePathname();
  if (pathname === "/explore" || pathname === "/search") return <div className="h-1" />;
  return <SidebarSearchBox />;
}

function SidebarSearchBox() {
  return (
    <div className="sticky top-0 z-10 bg-black pt-1 pb-1">
      <SearchBox />
    </div>
  );
}
