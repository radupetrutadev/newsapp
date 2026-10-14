import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <LogoMark className="size-12" />
      <div>
        <p className="text-[64px] leading-none font-extrabold tracking-tight">404</p>
        <h1 className="mt-3 text-xl font-bold">Hmm… this page doesn&apos;t exist.</h1>
        <p className="mt-1 text-[15px] text-muted">Try searching for something else.</p>
      </div>
      <Link href="/" className={buttonClasses({ variant: "accent", size: "lg" })}>
        Back to your feed
      </Link>
    </main>
  );
}
