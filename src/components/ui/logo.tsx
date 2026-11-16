import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** The Pulse mark: a heartbeat line on an orange tile. Matches src/app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <path
        d="M5 16.5h4.8l3.3-8.6 5.8 16.2 3.5-10.1 1.8 2.5H27"
        fill="none"
        className="stroke-on-accent"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "pulse." in the display face, the dot in orange. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[22px] leading-none font-bold tracking-[-0.03em]", className)}>
      {site.name.toLowerCase()}
      <span className="text-accent">.</span>
    </span>
  );
}

/** Mark and wordmark together, as in the top bar. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className="size-8" />
      <Wordmark />
    </span>
  );
}
