import { getCategory } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { cn, hashString } from "@/lib/utils";

const noise =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";

/**
 * Generated "mesh gradient" artwork used when an article has no image.
 * The seed varies the composition so every story looks distinct.
 */
export function Cover({
  seed,
  category,
  className,
  iconClassName,
  showIcon = true,
}: {
  seed: string;
  category: CategorySlug;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
}) {
  const meta = getCategory(category);
  const [a, b, base] = meta?.palette ?? ["#1d9bf0", "#7856ff", "#0f172a"];
  const Icon = meta?.icon;
  const h = hashString(seed);
  const p = (shift: number, min: number, span: number) => min + ((h >> shift) % span);

  const background = [
    `radial-gradient(at ${p(0, 5, 40)}% ${p(3, 5, 45)}%, ${a} 0px, transparent 55%)`,
    `radial-gradient(at ${p(6, 55, 40)}% ${p(9, 40, 55)}%, ${b} 0px, transparent 50%)`,
    `radial-gradient(at ${p(12, 20, 60)}% ${p(15, 70, 30)}%, ${a}99 0px, transparent 45%)`,
    `linear-gradient(${p(18, 100, 140)}deg, ${base}, #000)`,
  ].join(", ");

  return (
    <div className={cn("relative isolate overflow-hidden", className)} style={{ background }}>
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{ backgroundImage: noise }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      {showIcon && Icon ? (
        <Icon
          aria-hidden
          strokeWidth={1.1}
          className={cn(
            "absolute -right-[4%] -bottom-[18%] size-[62%] max-h-[90%] text-white/20",
            h % 2 === 0 ? "rotate-[-10deg]" : "rotate-[8deg]",
            iconClassName,
          )}
        />
      ) : null}
    </div>
  );
}
