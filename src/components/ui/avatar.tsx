import Image from "next/image";
import type { Source, UserProfile } from "@/lib/types";
import { cn, hashString, initials } from "@/lib/utils";

const userPalettes = [
  ["#1d9bf0", "#7856ff"],
  ["#f91880", "#ff7a00"],
  ["#00ba7c", "#1d9bf0"],
  ["#7856ff", "#f91880"],
  ["#ffad1f", "#f4212e"],
  ["#06b6d4", "#22c55e"],
  ["#a855f7", "#ec4899"],
] as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  /** Organizations get rounded squares, people get circles (like X). */
  shape?: "circle" | "square";
  colors: readonly [string, string];
  className?: string;
}

export function Avatar({ name, src, size = 40, shape = "circle", colors, className }: AvatarProps) {
  const radius = shape === "circle" ? "9999px" : `${Math.round(size * 0.22)}px`;

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("shrink-0 object-cover", className)}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden font-bold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.round(size * 0.38),
        backgroundImage: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      }}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
      <span className="relative tracking-tight">{initials(name)}</span>
    </span>
  );
}

export function SourceAvatar({
  source,
  size = 40,
  className,
}: {
  source: Pick<Source, "name" | "color" | "logoUrl">;
  size?: number;
  className?: string;
}) {
  return (
    <Avatar
      name={source.name}
      src={source.logoUrl}
      size={size}
      shape="square"
      colors={[source.color, shade(source.color)]}
      className={className}
    />
  );
}

export function UserAvatar({
  user,
  size = 40,
  className,
}: {
  user: Pick<UserProfile, "name" | "handle" | "avatarUrl">;
  size?: number;
  className?: string;
}) {
  const palette = userPalettes[hashString(user.handle) % userPalettes.length];
  return (
    <Avatar
      name={user.name}
      src={user.avatarUrl}
      size={size}
      colors={palette}
      className={className}
    />
  );
}

/** Darken a #rrggbb color for the second gradient stop. */
function shade(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  if (Number.isNaN(value)) return hex;
  const channel = (shift: number) => Math.round(((value >> shift) & 0xff) * 0.45);
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}
