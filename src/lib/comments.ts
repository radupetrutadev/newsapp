import type { Comment } from "@/lib/types";

export const COMMENT_MAX_LENGTH = 280;

export const REPORT_REASONS = [
  { value: "spam", label: "Spam", description: "Ads, scams, or the same thing posted again and again." },
  { value: "harassment", label: "Harassment or hate", description: "Insults, threats or attacks on someone." },
  { value: "misinformation", label: "Misleading", description: "Presents false claims as facts." },
  { value: "other", label: "Something else", description: "It breaks the rules in another way." },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASONS.some((reason) => reason.value === value);
}

export interface Thread {
  /** The comment that started the thread. */
  root: Comment;
  /** Everything posted under it, oldest first. */
  replies: Comment[];
}

/**
 * Groups a story's comments into threads, keeping the order the comments
 * that start them come in. A removed comment stays only as a placeholder for
 * replies that answer it; replies whose thread isn't in the list are left out.
 */
export function buildThreads(comments: Comment[]): Thread[] {
  // A reply is always newer than what it answers, so walking newest first
  // settles every reply before the comment it answers.
  const kept = new Set<string>();
  const answered = new Set<string>();
  for (const comment of [...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (comment.removed && !answered.has(comment.id)) continue;
    kept.add(comment.id);
    if (comment.parentId) answered.add(comment.parentId);
  }

  const replies = new Map<string, Comment[]>();
  for (const comment of comments) {
    if (!comment.rootId || !kept.has(comment.id)) continue;
    const thread = replies.get(comment.rootId) ?? [];
    thread.push(comment);
    replies.set(comment.rootId, thread);
  }

  return comments
    .filter((comment) => !comment.rootId && kept.has(comment.id))
    .map((root) => ({
      root,
      replies: (replies.get(root.id) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
}
