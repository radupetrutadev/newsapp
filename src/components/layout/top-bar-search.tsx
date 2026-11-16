"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { WithPathname } from "./current-path";
import { SearchBox } from "./search-box";

/**
 * Search in the top bar: a box on wide screens, a button to the search page
 * on narrower ones. The search page has its own box, so it's left out there.
 */
export function TopBarSearch() {
  return <WithPathname component={TopBarSearchForPage} />;
}

function TopBarSearchForPage({ pathname }: { pathname: string | null }) {
  if (pathname === "/search") return null;
  return (
    <>
      <SearchBox className="hidden w-[240px] lg:block xl:w-[300px]" size="sm" />
      <Link
        href="/search"
        aria-label="Search"
        title="Search"
        className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground lg:hidden"
      >
        <Search className="size-5" />
      </Link>
    </>
  );
}
