import Image from "next/image";
import type { Source, UserProfile } from "@/lib/types";
import { cn, hashString, initials } from "@/lib/utils";

const userPalettes = [
  ["#ff6a1a", "#9a2c00"],
  ["#ffb02e", "#c2410c"],
  ["#ff4d2e", "#7a1406"],
  ["#f4a261", "#6b2d0b"],
  ["#ffd27a", "#d9480f"],
  ["#c9b8a6", "#4a3f37"],
  ["#ff8a5c", "#5c1a0a"],
] as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  /** Organizations get rounded squares, people get circles. */
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
