import { Layers, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { site } from "@/lib/site";

const highlights = [
  { icon: Zap, text: "Breaking stories the moment they land" },
  { icon: Layers, text: "Full coverage of every event, from every publisher" },
  { icon: Sparkles, text: "A feed that learns from what you read" },
];

/** Sign-in screens: a brand panel beside the form on wide screens. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <div className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_80%,rgb(255_106_26/0.28),transparent_70%),radial-gradient(40%_35%_at_90%_10%,rgb(255_176_46/0.14),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        />
        <Link href="/" aria-label={`${site.name} home`} className="relative w-fit">
          <Logo />
        </Link>
        <div className="relative">
          <p className="kicker text-accent">{site.tagline}</p>
          <p className="mt-4 font-display text-[clamp(44px,4.6vw,64px)] leading-[1.02] font-bold tracking-[-0.04em]">
            The stories that move the world, <span className="text-accent">live.</span>
          </p>
          <ul className="mt-10 space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-foreground/80">
                <span className="flex size-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                  <Icon className="size-[18px]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[13px] text-muted">© 2026 {site.name}</p>
      </div>

      <div className="flex flex-1 flex-col">
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-[380px]">
            <Link href="/" aria-label={`${site.name} home`} className="mb-10 block w-fit lg:hidden">
              <Logo />
            </Link>
            {children}
          </div>
        </main>
        <footer className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-4 text-[12px] text-muted lg:justify-end lg:px-8">
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
        </footer>
      </div>
    </div>
  );
}
