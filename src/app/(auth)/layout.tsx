import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { site } from "@/lib/site";

/** Full-screen auth layout modelled on X's logged-out landing page. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="relative flex items-center px-8 pt-10 lg:flex-1 lg:justify-center lg:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_50%_50%,rgba(29,155,240,0.16),transparent_55%)] lg:block"
          />
          <Link href="/" aria-label={`${site.name} home`} className="relative">
            <LogoMark className="size-12 lg:size-[min(380px,32vw)] lg:[stroke-width:1.6]" />
          </Link>
        </div>
        <main className="flex flex-1 flex-col justify-center px-8 py-10 lg:max-w-[760px]">
          {children}
        </main>
      </div>
      <footer className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-3 text-[13px] text-muted">
        <Link href="/about" className="hover:underline">
          About
        </Link>
        <Link href="/terms" className="hover:underline">
          Terms of Service
        </Link>
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <span>© 2026 {site.name}</span>
      </footer>
    </div>
  );
}
