import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <LogoMark className="size-12" />
      <div>
        <p className="font-display text-[96px] leading-none font-bold tracking-[-0.05em] text-accent">404</p>
        <h1 className="mt-4 font-display text-[24px] font-semibold tracking-tight">This page doesn&apos;t exist.</h1>
        <p className="mt-1 text-[15px] text-muted">Try searching for something else.</p>
      </div>
      <Link href="/" className={buttonClasses({ variant: "primary", size: "lg" })}>
        Back to your feed
      </Link>
    </main>
  );
}
