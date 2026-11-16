import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "destructive";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover shadow-[0_6px_24px_-8px_rgb(255_106_26/0.6)]",
  secondary: "bg-foreground text-background hover:bg-foreground/90",
  outline: "border border-border-strong bg-surface text-foreground hover:border-muted/60 hover:bg-surface-hover",
  ghost: "text-foreground hover:bg-white/[0.06]",
  danger: "border border-live/40 text-danger hover:bg-live/10",
  destructive: "bg-live text-white hover:bg-live/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[14px]",
  md: "h-10 px-5 text-[15px]",
  lg: "h-12 px-7 text-[16px]",
};

/** Class names for a button, so links can look like buttons too. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
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
