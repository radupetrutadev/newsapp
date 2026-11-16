import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getViewer } from "@/lib/data/viewer";
import { site } from "@/lib/site";
import { AccountMenu } from "./account-menu";
import { NavIconLinks, NavLinks } from "./nav-links";
import { TopBarSearch } from "./top-bar-search";

/** The sticky bar across the top on tablets and up: logo, sections, search and account. */
export function TopBar() {
  return (
    <header className="glass sticky top-0 z-40 hidden border-b border-border md:block">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-3 px-6">
        <Link href="/" aria-label={`${site.name} home`} className="mr-3 shrink-0 rounded-lg">
          <Logo />
        </Link>

        <NavLinks />

        <div className="ml-auto flex items-center gap-1.5">
          <TopBarSearch />
          <NavIconLinks />
          <Suspense fallback={<span className="ml-1 block size-10 rounded-full bg-elevated" />}>
            <Account />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function Account() {
  const viewer = await getViewer();
  if (viewer) return <AccountMenu viewer={viewer} />;

  return (
    <Link href="/login" className={buttonClasses({ size: "sm", className: "ml-1.5" })}>
      Sign in
    </Link>
  );
}
