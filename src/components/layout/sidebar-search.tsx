"use client";

import { usePathname } from "next/navigation";
import { SearchBox } from "./search-box";

/** The sidebar search is hidden on pages that already have one, like X. */
export function SidebarSearch() {
  const pathname = usePathname();
  if (pathname === "/explore" || pathname === "/search") return <div className="h-1" />;

  return (
    <div className="sticky top-0 z-10 bg-black pt-1 pb-1">
      <SearchBox />
    </div>
  );
}
