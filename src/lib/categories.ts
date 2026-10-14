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
    palette: ["#38bdf8", "#6366f1", "#0f172a"],
  },
  {
    slug: "politics",
    name: "Politics",
    description: "Policy, elections and the people shaping public life.",
    icon: Landmark,
    palette: ["#a78bfa", "#f43f5e", "#1e1b4b"],
  },
  {
    slug: "business",
    name: "Business",
    description: "Markets, companies, startups and the economy.",
    icon: Briefcase,
    palette: ["#34d399", "#14b8a6", "#022c22"],
  },
  {
    slug: "tech",
    name: "Technology",
    description: "AI, gadgets, software and the future of the internet.",
    icon: Cpu,
    palette: ["#22d3ee", "#3b82f6", "#0c1a3a"],
  },
  {
    slug: "science",
    name: "Science",
    description: "Space, physics, biology and new discoveries.",
    icon: FlaskConical,
    palette: ["#c084fc", "#ec4899", "#2e1065"],
  },
  {
    slug: "health",
    name: "Health",
    description: "Medicine, wellbeing and public health research.",
    icon: HeartPulse,
    palette: ["#fb7185", "#f472b6", "#3f0d1d"],
  },
  {
    slug: "sports",
    name: "Sports",
    description: "Scores, transfers, records and the moments that matter.",
    icon: Trophy,
    palette: ["#fb923c", "#facc15", "#3b1405"],
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    description: "Film, music, TV and culture.",
    icon: Clapperboard,
    palette: ["#f472b6", "#a855f7", "#2a0a2e"],
  },
  {
    slug: "climate",
    name: "Climate",
    description: "Energy, environment and the race to net zero.",
    icon: Leaf,
    palette: ["#4ade80", "#a3e635", "#052e16"],
  },
];

const bySlug = new Map(categories.map((category) => [category.slug, category]));

export function getCategory(slug: string): Category | undefined {
  return bySlug.get(slug as CategorySlug);
}

export function categoryName(slug: CategorySlug): string {
  return bySlug.get(slug)?.name ?? slug;
}
