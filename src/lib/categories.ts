import {
  Briefcase,
  Clapperboard,
  Cpu,
  Earth,
  FlaskConical,
  HeartPulse,
  Landmark,
  Leaf,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { CategorySlug } from "@/lib/types";

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Gradient stops used by generated covers and topic tiles. */
  palette: [string, string, string];
}

export const categories: Category[] = [
  {
    slug: "world",
    name: "World",
    description: "Global affairs, diplomacy and stories from every continent.",
    icon: Earth,
    palette: ["#ff8a3d", "#ff3b30", "#1f0d05"],
  },
  {
    slug: "politics",
    name: "Politics",
    description: "Policy, elections and the people shaping public life.",
    icon: Landmark,
    palette: ["#ff5b2e", "#b4231a", "#1c0806"],
  },
  {
    slug: "business",
    name: "Business",
    description: "Markets, companies, startups and the economy.",
    icon: Briefcase,
    palette: ["#ffb02e", "#ff6a1a", "#1f1305"],
  },
  {
    slug: "tech",
    name: "Technology",
    description: "AI, gadgets, software and the future of the internet.",
    icon: Cpu,
    palette: ["#ff6a1a", "#ffd166", "#140b05"],
  },
  {
    slug: "science",
    name: "Science",
    description: "Space, physics, biology and new discoveries.",
    icon: FlaskConical,
    palette: ["#ff9248", "#d9381e", "#1a0a04"],
  },
  {
    slug: "health",
    name: "Health",
    description: "Medicine, wellbeing and public health research.",
    icon: HeartPulse,
    palette: ["#ff7a59", "#ff3b30", "#1f0807"],
  },
  {
    slug: "sports",
    name: "Sports",
    description: "Scores, transfers, records and the moments that matter.",
    icon: Trophy,
    palette: ["#ffc247", "#ff7a1a", "#1d1204"],
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    description: "Film, music, TV and culture.",
    icon: Clapperboard,
    palette: ["#ff6b4a", "#c2410c", "#1c0905"],
  },
  {
    slug: "climate",
    name: "Climate",
    description: "Energy, environment and the race to net zero.",
    icon: Leaf,
    palette: ["#ffd166", "#ff8a3d", "#1a1404"],
  },
];

const bySlug = new Map(categories.map((category) => [category.slug, category]));

export function getCategory(slug: string): Category | undefined {
  return bySlug.get(slug as CategorySlug);
}

export function categoryName(slug: CategorySlug): string {
  return bySlug.get(slug)?.name ?? slug;
}
