import { describe, expect, it } from "vitest";
import { buildThreads } from "./comments";
import type { Comment } from "./types";

const author = { id: "u", handle: "reader", name: "Reader", avatarUrl: null, bio: "", verified: false };

function comment(id: string, minute: number, parentId: string | null = null, rootId: string | null = null, removed: Comment["removed"] = null): Comment {
  return {
    id,
    articleId: "a",
    author,
    body: removed ? "" : id,
    likesCount: 0,
    parentId,
    replyToHandle: null,
    rootId,
    removed,
    createdAt: new Date(Date.UTC(2026, 9, 26, 12, minute)).toISOString(),
  };
}

const ids = (threads: ReturnType<typeof buildThreads>) =>
  threads.map((thread) => [thread.root.id, ...thread.replies.map((reply) => reply.id)]);

describe("buildThreads", () => {
  it("puts replies under the comment that started the thread, oldest first, keeping root order", () => {
    const threads = buildThreads([
      comment("popular", 1),
      comment("r2", 5, "popular", "popular"),
      comment("newer", 3),
      comment("r1", 2, "popular", "popular"),
      comment("r1a", 4, "r1", "popular"),
    ]);
    expect(ids(threads)).toEqual([["popular", "r1", "r1a", "r2"], ["newer"]]);
  });

  it("keeps removed comments only while a kept reply answers them", () => {
    const threads = buildThreads([
      comment("deleted-root", 1, null, null, "deleted"),
      comment("answer", 2, "deleted-root", "deleted-root"),
      comment("lonely-deleted", 3, null, null, "deleted"),
      comment("root", 4),
      comment("hidden", 5, "root", "root", "hidden"),
      comment("ghost", 6, "hidden", "root", "deleted"),
      comment("deleted-chain", 7, "root", "root", "deleted"),
      comment("live", 8, "deleted-chain", "root"),
    ]);
    expect(ids(threads)).toEqual([["deleted-root", "answer"], ["root", "deleted-chain", "live"]]);
  });

  it("leaves out replies whose thread wasn't loaded", () => {
    expect(ids(buildThreads([comment("orphan", 2, "missing", "missing"), comment("root", 1)]))).toEqual([["root"]]);
  });
});
