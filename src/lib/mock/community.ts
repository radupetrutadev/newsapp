import type { NotificationJson } from "../notifications";
import type { Comment, Trend, UserProfile, Viewer } from "../types";

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

export type MockComment = Omit<
  Comment,
  "author" | "createdAt" | "parentId" | "replyToHandle" | "rootId" | "removed" | "countedAt"
> & {
  authorId: string;
  minutesAgo: number;
  /** The comment this one answers. */
  parentId?: string;
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
  // Replies
  { id: "c-019", articleId: "art-001", authorId: "user-jonah", parentId: "c-001", minutesAgo: 4, likesCount: 36, body: "Public data only helps if someone is obliged to act on it. Who enforces?" },
  { id: "c-020", articleId: "art-001", authorId: "user-priya", parentId: "c-019", minutesAgo: 3, likesCount: 58, body: "@jonahwrites The repair fund is conditional on fixing the leaks the satellites flag. That's the lever." },
  { id: "c-021", articleId: "art-001", authorId: "user-lena", parentId: "c-001", minutesAgo: 2, likesCount: 12, body: "Weekly is a big deal too. Annual inventories were always years out of date." },
  { id: "c-022", articleId: "art-002", authorId: "user-sam", parentId: "c-004", minutesAgo: 12, likesCount: 44, body: "What GPU are you on? Curious about tokens per second on the quantized build." },
  { id: "c-023", articleId: "art-002", authorId: "user-marco", parentId: "c-022", minutesAgo: 10, likesCount: 19, body: "@samdoesdata A single 24 GB card. Fast enough that I stopped noticing." },
];

export const mockTrends: Trend[] = [
  { id: "t-1", context: "Climate · Live", topic: "Methane Deal", postsCount: 14, category: "climate" },
  { id: "t-2", context: "Technology · Trending", topic: "#OpenSourceAI", postsCount: 11, category: "tech" },
  { id: "t-3", context: "Sports · Trending", topic: "Overtime Thriller", postsCount: 9, category: "sports" },
  { id: "t-4", context: "Business · Trending", topic: "Rate Cuts", postsCount: 8, category: "business" },
  { id: "t-5", context: "Entertainment · Trending", topic: "#SurpriseDrop", postsCount: 7, category: "entertainment" },
  { id: "t-6", context: "Science · Trending", topic: "Water Ice", postsCount: 6, category: "science" },
  { id: "t-7", context: "Politics · Trending", topic: "Privacy Bill", postsCount: 5, category: "politics" },
  { id: "t-8", context: "Trending in World", topic: "High-Speed Rail", postsCount: 4, category: "world" },
];

/** Shaped like public.notification_json rows, so demo mode words them the same way. */
export type MockNotification = Omit<NotificationJson, "created_at" | "updated_at"> & { minutesAgo: number };

const actor = (handle: string, name: string) => ({ handle, display_name: name, avatar_url: null });

export const mockNotifications: MockNotification[] = [
  {
    id: "n-001",
    kind: "breaking",
    minutesAgo: 8,
    unread: true,
    actors_count: 0,
    actors: [],
    comment: null,
    article: {
      slug: "climate-summit-methane-deal",
      title: "Climate summit reaches last-minute deal to cut methane emissions 40% by 2035",
    },
    source: { handle: "pulsedispatch", name: "Pulse Dispatch", color: "#1d9bf0", logo_url: null },
  },
  {
    id: "n-002",
    kind: "like",
    minutesAgo: 34,
    unread: true,
    actors_count: 25,
    actors: [actor("priyaresearch", "Priya N."), actor("samdoesdata", "Sam Okafor"), actor("avachen", "Ava Chen")],
    comment: { id: "c-demo-1", body: "Storage is going to be the story of the next five years, not generation." },
    article: {
      slug: "solar-overtakes-coal-global-electricity",
      title: "Solar overtakes coal in global electricity generation for the first time",
    },
    source: null,
  },
  {
    id: "n-003",
    kind: "reply",
    minutesAgo: 58,
    unread: true,
    actors_count: 1,
    actors: [actor("marcobuilds", "Marco Silva")],
    comment: { id: "c-demo-2", body: "Agreed — and the quantized build makes it practical for small teams too." },
    article: {
      slug: "open-source-model-matches-proprietary-ai",
      title: "Open-source AI model matches top proprietary systems on reasoning benchmarks",
    },
    source: null,
  },
  {
    id: "n-004",
    kind: "follow",
    minutesAgo: 240,
    unread: false,
    actors_count: 2,
    actors: [actor("lena_k", "Lena Kowalski"), actor("theo_runs", "Theo Laurent")],
    comment: null,
    article: null,
    source: null,
  },
  {
    id: "n-005",
    kind: "breaking",
    minutesAgo: 390,
    unread: false,
    actors_count: 0,
    actors: [],
    comment: null,
    article: {
      slug: "earth-sized-planet-habitable-zone",
      title: "Astronomers spot an Earth-sized planet in the habitable zone 40 light-years away",
    },
    source: { handle: "orbitweekly", name: "Orbit Weekly", color: "#a855f7", logo_url: null },
  },
  {
    id: "n-006",
    kind: "mention",
    minutesAgo: 410,
    unread: false,
    actors_count: 1,
    actors: [actor("jonahwrites", "Jonah Brooks")],
    comment: { id: "c-demo-3", body: "@you called this one last week. Four-day week pilots are going municipal." },
    article: {
      slug: "cities-trial-four-day-work-week",
      title: "City councils vote to trial a four-day work week for municipal staff",
    },
    source: null,
  },
];

/** Sources the demo reader follows before they change anything. */
export const defaultFollowedSourceIds = ["src-dispatch", "src-circuit", "src-orbit", "src-greenline"];

export const defaultFollowedTopics = ["tech", "science", "climate"];
