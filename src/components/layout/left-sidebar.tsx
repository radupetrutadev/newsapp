import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { getViewer } from "@/lib/data/viewer";
import { site } from "@/lib/site";
import { AccountMenu } from "./account-menu";
import { NavLinks } from "./nav-links";

export function LeftSidebar({ badges }: { badges: Record<string, number> }) {
  return (
    <div className="sticky top-0 flex h-dvh flex-col justify-between px-2 pb-3 xl:w-[275px] xl:pr-6">
      <div className="flex flex-col items-center xl:items-stretch">
        <Link
          href="/"
          aria-label={`${site.name} home`}
          className="my-1 flex size-[52px] items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          <LogoMark className="size-8" />
        </Link>

        <NavLinks badges={badges} />

        <Link
          href="/topics"
          className={buttonClasses({
            variant: "primary",
            size: "lg",
            className: "mt-4 hidden w-[90%] xl:flex",
          })}
        >
          Customize feed
        </Link>
        <Link
          href="/topics"
          aria-label="Customize feed"
          className="mt-4 flex size-[52px] items-center justify-center rounded-full bg-foreground text-black transition-colors hover:bg-foreground/90 xl:hidden"
        >
          <SlidersHorizontal className="size-6" />
        </Link>
      </div>

      <Suspense fallback={<div className="h-16" />}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const viewer = await getViewer();
  if (viewer) return <AccountMenu viewer={viewer} />;

  return (
    <Link href="/login" className={buttonClasses({ variant: "outline", className: "w-full" })}>
      Sign in
    </Link>
  );
}
