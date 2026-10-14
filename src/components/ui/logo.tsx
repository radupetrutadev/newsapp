import { cn } from "@/lib/utils";

/** The Pulse mark: a heartbeat line. Inherits color from `currentColor`. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-7", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12.5h4.2l2.6-7 4.6 13 2.8-8.2 1.4 2.2H22" />
    </svg>
  );
}
