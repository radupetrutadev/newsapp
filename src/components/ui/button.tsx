import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-foreground text-black hover:bg-foreground/90",
  accent: "bg-accent text-white hover:bg-accent-hover",
  outline: "border border-[#536471] text-foreground hover:bg-white/10",
  ghost: "text-foreground hover:bg-white/10",
  danger: "border border-[#67070f] text-live hover:bg-live/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-sm",
  md: "h-9 px-4 text-[15px]",
  lg: "h-[52px] px-8 text-[17px]",
};

/** Class names for a pill button, so links can look like buttons too. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
