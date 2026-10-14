import type { AppNotification, Comment, Trend, UserProfile, Viewer } from "../types";

export const demoViewer: Viewer = {
  id: "user-demo",
  handle: "you",
  name: "Demo Reader",
  avatarUrl: null,
  bio: "News junkie. Reading everything, commenting on some of it. This is a demo account — connect Supabase to sign in for real.",
  verified: false,
  email: null,
  isDemo: true,
  joinedAt: "2026-01-15T00:00:00.000Z",
  followersCount: 248,
};

export const mockUsers: UserProfile[] = [
  { id: "user-ava", handle: "avachen", name: "Ava Chen", avatarUrl: null, bio: "", verified: true },
  { id: "user-marco", handle: "marcobuilds", name: "Marco Silva", avatarUrl: null, bio: "", verified: false },
  { id: "user-priya", handle: "priyaresearch", name: "Priya N.", avatarUrl: null, bio: "", verified: true },
  { id: "user-jonah", handle: "jonahwrites", name: "Jonah Brooks", avatarUrl: null, bio: "", verified: false },
  { id: "user-lena", handle: "lena_k", name: "Lena Kowalski", avatarUrl: null, bio: "", verified: false },
  { id: "user-sam", handle: "samdoesdata", name: "Sam Okafor", avatarUrl: null, bio: "", verified: true },
  { id: "user-ines", handle: "inesgarcia", name: "Inés García", avatarUrl: null, bio: "", verified: false },
  { id: "user-theo", handle: "theo_runs", name: "Theo Laurent", avatarUrl: null, bio: "", verified: false },
];

export type MockComment = Omit<Comment, "author" | "createdAt"> & {
  authorId: string;
  minutesAgo: number;
};

export const mockComments: MockComment[] = [
  { id: "c-001", articleId: "art-001", authorId: "user-priya", minutesAgo: 5, likesCount: 412, body: "The weekly satellite leak data is the real story here. Targets mean nothing without measurement, and this finally makes it public." },
  { id: "c-002", articleId: "art-001", authorId: "user-jonah", minutesAgo: 6, likesCount: 87, body: "Binding on paper. Let's see how many countries actually pass the national legislation in 18 months." },
  { id: "c-003", articleId: "art-001", authorId: "user-sam", minutesAgo: 7, likesCount: 239, body: "Fixing leaks is one of the few climate measures that pays for itself — the captured gas is sellable. Good to see it funded." },
  { id: "c-004", articleId: "art-002", authorId: "user-marco", minutesAgo: 14, likesCount: 356, body: "Running it locally right now. The quantized build is genuinely usable for coding. Wild how fast this gap closed." },
  { id: "c-005", articleId: "art-002", authorId: "user-ava", minutesAgo: 19, likesCount: 198, body: "Publishing the data pipeline matters more than the weights. That's what lets other labs actually build on it." },
  { id: "c-006", articleId: "art-002", authorId: "user-lena", minutesAgo: 22, likesCount: 41, body: "Benchmarks are one thing. Curious how it holds up on long agentic tasks — sounds like that's where it still lags." },
  { id: "c-007", articleId: "art-003", authorId: "user-sam", minutesAgo: 30, likesCount: 121, body: "Rent disinflation finally showing up in the core numbers. That was always going to be the lagging piece." },
  { id: "c-008", articleId: "art-003", authorId: "user-jonah", minutesAgo: 35, likesCount: 33, body: "Record highs on a soft-landing narrative. Priced for perfection." },
  { id: "c-009", articleId: "art-004", authorId: "user-priya", minutesAgo: 50, likesCount: 264, body: "5% by weight in the top meter is a lot more than most models predicted. Huge for in-situ resource planning." },
  { id: "c-010", articleId: "art-004", authorId: "user-theo", minutesAgo: 61, likesCount: 58, body: "Rooting for the drive back into the sunlight. Come on, little lander." },
  { id: "c-011", articleId: "art-005", authorId: "user-theo", minutesAgo: 80, likesCount: 903, body: "I was at the game. Nobody left their seat for the last 30 minutes. Best sporting night of my life." },
  { id: "c-012", articleId: "art-005", authorId: "user-ines", minutesAgo: 88, likesCount: 312, body: "That rookie went 2-for-14 before the last three minutes. Pure nerve." },
  { id: "c-013", articleId: "art-006", authorId: "user-lena", minutesAgo: 110, likesCount: 77, body: "Finally a study using trackers instead of self-reported exercise. Everyone overestimates how much they walk." },
  { id: "c-014", articleId: "art-011", authorId: "user-ava", minutesAgo: 260, likesCount: 640, body: "A decade ago this milestone was a 2040 forecast. Storage is the next bottleneck and it's moving just as fast." },
  { id: "c-015", articleId: "art-011", authorId: "user-marco", minutesAgo: 280, likesCount: 95, body: "Would love to see this broken down by country. The averages hide huge differences." },
  { id: "c-016", articleId: "art-013", authorId: "user-priya", minutesAgo: 350, likesCount: 488, body: "A quiet red dwarf is the important detail. Flares are what usually ruin the habitability story for these systems." },
  { id: "c-017", articleId: "art-017", authorId: "user-ines", minutesAgo: 560, likesCount: 1_204, body: "Track 9 is already my song of the year. No notes." },
  { id: "c-018", articleId: "art-018", authorId: "user-jonah", minutesAgo: 620, likesCount: 211, body: "Measuring resident satisfaction alongside staff wellbeing is the right design. Hope they publish the raw data." },
];

export const mockTrends: Trend[] = [
  { id: "t-1", context: "Climate · Live", topic: "Methane Deal", postsCount: 182_000, category: "climate" },
  { id: "t-2", context: "Technology · Trending", topic: "#OpenSourceAI", postsCount: 96_400, category: "tech" },
  { id: "t-3", context: "Sports · Trending", topic: "Overtime Thriller", postsCount: 241_000, category: "sports" },
  { id: "t-4", context: "Business · Trending", topic: "Rate Cuts", postsCount: 48_900, category: "business" },
  { id: "t-5", context: "Entertainment · Trending", topic: "#SurpriseDrop", postsCount: 512_000, category: "entertainment" },
  { id: "t-6", context: "Science · Trending", topic: "Water Ice", postsCount: 37_200, category: "science" },
  { id: "t-7", context: "Politics · Trending", topic: "Privacy Bill", postsCount: 29_800, category: "politics" },
  { id: "t-8", context: "Trending in World", topic: "High-Speed Rail", postsCount: 21_500, category: "world" },
];

export type MockNotification = Omit<AppNotification, "createdAt"> & { minutesAgo: number };

export const mockNotifications: MockNotification[] = [
  {
    id: "n-001",
    kind: "breaking",
    actors: [{ name: "Pulse Dispatch", handle: "pulsedispatch", color: "#1d9bf0" }],
    text: "Breaking: Climate summit reaches last-minute deal to cut methane emissions 40% by 2035",
    preview: null,
    href: "/article/climate-summit-methane-deal",
    minutesAgo: 8,
    unread: true,
  },
  {
    id: "n-002",
    kind: "like",
    actors: [
      { name: "Priya N.", handle: "priyaresearch", color: "#a855f7" },
      { name: "Sam Okafor", handle: "samdoesdata", color: "#f59e0b" },
      { name: "Ava Chen", handle: "avachen", color: "#06b6d4" },
    ],
    text: "Priya N. and 24 others liked your reply",
    preview: "Storage is going to be the story of the next five years, not generation.",
    href: "/article/solar-overtakes-coal-global-electricity",
    minutesAgo: 34,
    unread: true,
  },
  {
    id: "n-003",
    kind: "reply",
    actors: [{ name: "Marco Silva", handle: "marcobuilds", color: "#10b981" }],
    text: "Marco Silva replied to you",
    preview: "Agreed — and the quantized build makes it practical for small teams too.",
    href: "/article/open-source-model-matches-proprietary-ai",
    minutesAgo: 58,
    unread: true,
  },
  {
    id: "n-004",
    kind: "digest",
    actors: [{ name: "Pulse", handle: "pulse", color: "#1d9bf0" }],
    text: "Your morning brief is ready: 8 stories picked for you across Technology, Science and Climate.",
    preview: null,
    href: "/",
    minutesAgo: 180,
    unread: false,
  },
  {
    id: "n-005",
    kind: "follow",
    actors: [
      { name: "Lena Kowalski", handle: "lena_k", color: "#f43f5e" },
      { name: "Theo Laurent", handle: "theo_runs", color: "#f97316" },
    ],
    text: "Lena Kowalski and Theo Laurent followed you",
    preview: null,
    href: "/profile",
    minutesAgo: 240,
    unread: false,
  },
  {
    id: "n-006",
    kind: "mention",
    actors: [{ name: "Jonah Brooks", handle: "jonahwrites", color: "#8b5cf6" }],
    text: "Jonah Brooks mentioned you",
    preview: "@you called this one last week. Four-day week pilots are going municipal.",
    href: "/article/cities-trial-four-day-work-week",
    minutesAgo: 410,
    unread: false,
  },
  {
    id: "n-007",
    kind: "repost",
    actors: [{ name: "Inés García", handle: "inesgarcia", color: "#ec4899" }],
    text: "Inés García reposted a story you shared",
    preview: "Surprise album drop sends streaming platforms into overdrive",
    href: "/article/surprise-album-drop-streaming",
    minutesAgo: 720,
    unread: false,
  },
  {
    id: "n-008",
    kind: "digest",
    actors: [{ name: "Orbit Weekly", handle: "orbitweekly", color: "#a855f7" }],
    text: "New from Orbit Weekly: Astronomers spot an Earth-sized planet in the habitable zone 40 light-years away",
    preview: null,
    href: "/article/earth-sized-planet-habitable-zone",
    minutesAgo: 390,
    unread: false,
  },
];

/** Sources the demo reader follows before they change anything. */
export const defaultFollowedSourceIds = ["src-dispatch", "src-circuit", "src-orbit", "src-greenline"];

export const defaultFollowedTopics = ["tech", "science", "climate"];
