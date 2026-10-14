import { cn } from "@/lib/utils";

/**
 * X-style verification badge: gold for organizations (publishers),
 * blue for people.
 */
export function VerifiedBadge({
  variant = "blue",
  className,
}: {
  variant?: "blue" | "gold";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 22 22"
      aria-label={variant === "gold" ? "Verified organization" : "Verified account"}
      role="img"
      className={cn(
        "size-[18px] shrink-0",
        variant === "gold" ? "text-gold" : "text-accent",
        className,
      )}
    >
      <path
        fill="currentColor"
        d="M20.4 11c0-1.4-.8-2.6-2-3.2.4-1.3.1-2.8-.9-3.8s-2.4-1.3-3.8-.9C13.1 1.9 12 1.1 10.6 1.1S8.1 1.9 7.4 3.1c-1.3-.4-2.8-.1-3.8.9s-1.3 2.5-.9 3.8C1.6 8.4.8 9.6.8 11s.8 2.6 1.9 3.2c-.4 1.3-.1 2.8.9 3.8s2.5 1.3 3.8.9c.7 1.2 1.8 2 3.2 2s2.6-.8 3.2-2c1.4.4 2.9.1 3.8-.9 1-1 1.3-2.5.9-3.8 1.2-.6 2-1.8 2-3.2Z"
      />
      <path
        fill="none"
        stroke={variant === "gold" ? "#000" : "#fff"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6.9 11.2 2.7 2.7 5.6-6"
      />
    </svg>
  );
}
