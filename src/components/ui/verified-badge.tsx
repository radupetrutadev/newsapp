import { cn } from "@/lib/utils";

/**
 * Verification mark: a rounded hexagon with a check. Orange for publishers
 * ("source"), light for people.
 */
export function VerifiedBadge({
  variant = "person",
  className,
}: {
  variant?: "person" | "source";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-label={variant === "source" ? "Verified organization" : "Verified account"}
      role="img"
      className={cn(
        "size-4 shrink-0",
        variant === "source" ? "text-accent" : "text-foreground",
        className,
      )}
    >
      <path
        fill="currentColor"
        d="M8.6 1.3a2.8 2.8 0 0 1 2.8 0l5.2 3a2.8 2.8 0 0 1 1.4 2.4v6a2.8 2.8 0 0 1-1.4 2.4l-5.2 3a2.8 2.8 0 0 1-2.8 0l-5.2-3A2.8 2.8 0 0 1 2 12.7v-6a2.8 2.8 0 0 1 1.4-2.4Z"
      />
      <path
        fill="none"
        className="stroke-background"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6.6 10 2.3 2.3 4.6-4.8"
      />
    </svg>
  );
}
