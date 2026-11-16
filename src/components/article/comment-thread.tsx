"use client";

import { Flag, Heart, MessageCircle, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { MenuItem, MoreMenu } from "@/components/ui/menu";
import { TimeAgo } from "@/components/ui/time-ago";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { deleteComment, postComment, reportComment } from "@/lib/actions/comments";
import { buildThreads, COMMENT_MAX_LENGTH, REPORT_REASONS, type ReportReason, type Thread } from "@/lib/comments";
import { useAdjustedCount, useToggle } from "@/lib/store/engagement";
import { toast } from "@/lib/store/toast";
import type { Comment, Viewer } from "@/lib/types";
import { cn, formatCount } from "@/lib/utils";

/** Threads with more replies than this show the first two until opened. */
const FOLDED_AFTER = 3;

interface Handlers {
  viewer: Viewer | null;
  reported: ReadonlySet<string>;
  onReply: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
  onReport: (comment: Comment) => void;
}

export function CommentThread({
  articleId,
  sourceHandle,
  comments,
  reportedIds,
  viewer,
}: {
  articleId: string;
  sourceHandle: string;
  comments: Comment[];
  /** Comments the reader reported, which stay folded away for them. */
  reportedIds: string[];
  viewer: Viewer | null;
}) {
  // The reader's own new comments stay at the top until they leave the page,
  // rather than moving down among the comments nobody has liked yet.
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [deletedIds, setDeletedIds] = useState<ReadonlySet<string>>(new Set());
  const [reported, setReported] = useState<ReadonlySet<string>>(() => new Set(reportedIds));
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState<Comment | null>(null);
  const [reporting, setReporting] = useState<Comment | null>(null);
  const [postedId, setPostedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linkedId = useLinkedComment();

  const threads = useMemo(() => {
    const local = new Set(localComments.map((comment) => comment.id));
    return buildThreads(
      [...localComments, ...comments.filter((comment) => !local.has(comment.id))].map((comment) =>
        deletedIds.has(comment.id) ? { ...comment, removed: "deleted" as const, body: "" } : comment,
      ),
    );
  }, [localComments, comments, deletedIds]);

  // Links from notifications point at one comment (#comment-<id>). Replies
  // stream in after the page, so scroll to it and mark it once they're here.
  // (:target alone misses in-app navigation, which doesn't update it.)
  useEffect(() => {
    const linked = linkedId ? document.getElementById(`comment-${linkedId}`) : null;
    if (!linked) return;
    linked.setAttribute("data-linked", "");
    linked.scrollIntoView({ block: "center" });
  }, [linkedId]);

  useEffect(() => {
    if (postedId) document.getElementById(`comment-${postedId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [postedId]);

  const focused = new Set([linkedId, postedId].filter((id) => id !== null));
  const handlers: Handlers = {
    viewer,
    reported,
    onReply: (comment) => {
      if (!viewer) {
        toast("Sign in to reply", { label: "Sign in", href: "/login" });
        return;
      }
      setReplyTo(comment);
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    onDelete: setDeleting,
    onReport: (comment) => {
      if (!viewer) {
        toast("Sign in to report replies", { label: "Sign in", href: "/login" });
        return;
      }
      setReporting(comment);
    },
  };

  return (
    <section
      id="replies"
      aria-label="Replies"
      className="mx-4 mt-6 scroll-mt-24 rounded-2xl border border-border bg-surface md:mx-0 md:scroll-mt-40"
    >
      <h2 className="px-4 pt-5 pb-1 font-display text-[22px] font-semibold tracking-tight sm:px-5">Replies</h2>
      {viewer ? (
        <Composer
          viewer={viewer}
          sourceHandle={sourceHandle}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          textareaRef={textareaRef}
          onSubmit={async (body) => {
            const result = await postComment(articleId, body, replyTo?.id ?? null);
            if (!result.ok) {
              toast(result.error);
              return false;
            }
            // Demo mode doesn't store replies, so the page threads them itself.
            const comment = result.persisted
              ? result.comment
              : {
                  ...result.comment,
                  rootId: replyTo ? (replyTo.rootId ?? replyTo.id) : null,
                  replyToHandle: replyTo?.author.handle ?? null,
                };
            setLocalComments((current) => [comment, ...current]);
            setPostedId(comment.id);
            setReplyTo(null);
            toast("Your reply was sent");
            return true;
          }}
        />
      ) : (
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <p className="text-[15px] text-muted">Sign in to join the conversation.</p>
          <Link href="/login" className={buttonClasses({ variant: "primary", size: "sm" })}>
            Sign in
          </Link>
        </div>
      )}

      {threads.length === 0 ? (
        <p className="px-4 py-10 text-center text-[15px] text-muted">
          No replies yet. Start the conversation.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {threads.map((thread) => (
            <ThreadView key={thread.root.id} thread={thread} focused={focused} handlers={handlers} />
          ))}
        </div>
      )}

      <DeleteDialog
        comment={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(comment) => {
          setDeletedIds((current) => new Set(current).add(comment.id));
          if (replyTo?.id === comment.id) setReplyTo(null);
        }}
      />
      <ReportDialog
        comment={reporting}
        onClose={() => setReporting(null)}
        onReported={(comment) => setReported((current) => new Set(current).add(comment.id))}
      />
    </section>
  );
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** The comment the URL points at (#comment-<id>), if any. */
function useLinkedComment(): string | null {
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash, () => "");
  try {
    const target = decodeURIComponent(hash.slice(1));
    return target.startsWith("comment-") ? target.slice("comment-".length) : null;
  } catch {
    return null;
  }
}

function ThreadView({
  thread,
  focused,
  handlers,
}: {
  thread: Thread;
  /** Comments to keep in view: the one linked to, and the reader's new reply. */
  focused: ReadonlySet<string>;
  handlers: Handlers;
}) {
  const [expanded, setExpanded] = useState(false);
  const { root, replies } = thread;
  const showAll = expanded || replies.length <= FOLDED_AFTER || replies.some((reply) => focused.has(reply.id));
  const shown = showAll ? replies : replies.slice(0, 2);
  const more = replies.length - shown.length;

  return (
    <div className="py-1">
      <Entry comment={root} threaded={replies.length > 0} handlers={handlers} />
      {shown.map((reply) => (
        <Entry key={reply.id} comment={reply} nested handlers={handlers} />
      ))}
      {more > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="block w-full py-2.5 pr-4 pl-[68px] text-left text-[14px] font-medium text-accent hover:underline"
        >
          Show {more} more {more === 1 ? "reply" : "replies"}
        </button>
      ) : null}
    </div>
  );
}

/** One comment, or the note standing in for a removed or reported one. */
function Entry({
  comment,
  nested = false,
  threaded = false,
  handlers,
}: {
  comment: Comment;
  nested?: boolean;
  /** Replies follow, so a line joins it to them. */
  threaded?: boolean;
  handlers: Handlers;
}) {
  const [revealed, setRevealed] = useState(false);
  const padding = nested ? "pr-4 pl-[68px]" : "px-4";

  if (comment.removed || (handlers.reported.has(comment.id) && !revealed)) {
    return (
      <div id={`comment-${comment.id}`} className={cn("relative scroll-mt-16 py-2", padding)}>
        {threaded ? <ThreadLine top={8} /> : null}
        <div className={cn("flex items-center justify-between gap-3 rounded-xl border border-dashed border-border-strong px-4 py-3 text-[14px] text-muted", threaded && "ml-[52px]")}>
          {comment.removed === "deleted"
            ? "This reply was deleted."
            : comment.removed === "hidden"
              ? "This reply was hidden after readers reported it."
              : "You reported this reply."}
          {comment.removed ? null : (
            <button type="button" onClick={() => setRevealed(true)} className="shrink-0 font-semibold text-foreground hover:underline">
              Show
            </button>
          )}
        </div>
      </div>
    );
  }

  return <CommentItem comment={comment} nested={nested} threaded={threaded} padding={padding} handlers={handlers} />;
}

function ThreadLine({ top }: { top: number }) {
  return <span aria-hidden className="absolute bottom-0 left-[35px] w-0.5 rounded-full bg-border-strong" style={{ top }} />;
}

function CommentItem({
  comment,
  nested,
  threaded,
  padding,
  handlers,
}: {
  comment: Comment;
  nested: boolean;
  threaded: boolean;
  padding: string;
  handlers: Handlers;
}) {
  const { viewer } = handlers;
  const own = comment.author.id === viewer?.id;
  const authorHref = own ? "/profile" : `/user/${comment.author.handle}`;
  const avatarSize = nested ? 32 : 40;
  // Replies to a reply say whom they answer; replies to the thread's first
  // comment sit right under it.
  const answers = comment.parentId && comment.parentId !== comment.rootId ? comment.replyToHandle : null;

  return (
    <article
      id={`comment-${comment.id}`}
      className={cn(
        "relative flex scroll-mt-24 gap-3 pt-3 pb-1.5 data-linked:bg-accent/[0.07] md:scroll-mt-40",
        padding,
      )}
    >
      {threaded ? <ThreadLine top={56} /> : null}
      <Link href={authorHref} className="shrink-0" aria-label={comment.author.name}>
        <UserAvatar user={comment.author} size={avatarSize} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px] leading-5">
          <Link href={authorHref} className="flex min-w-0 items-center gap-1">
            <span className="truncate font-semibold hover:underline">{comment.author.name}</span>
            {comment.author.verified ? <VerifiedBadge /> : null}
            <span className="truncate text-[14px] text-muted">@{comment.author.handle}</span>
          </Link>
          <span className="text-muted">·</span>
          <TimeAgo iso={comment.createdAt} className="shrink-0 text-[13px] text-muted" />
          <span className="ml-auto pl-2">
            <MoreMenu label="More options for this reply">
              {(close) =>
                own ? (
                  <MenuItem
                    icon={Trash2}
                    danger
                    onSelect={() => {
                      close();
                      handlers.onDelete(comment);
                    }}
                  >
                    Delete
                  </MenuItem>
                ) : (
                  <MenuItem
                    icon={Flag}
                    onSelect={() => {
                      close();
                      handlers.onReport(comment);
                    }}
                  >
                    Report reply
                  </MenuItem>
                )
              }
            </MoreMenu>
          </span>
        </div>
        {answers ? (
          <p className="text-[15px] text-muted">
            Replying to{" "}
            <Link href={`/user/${answers}`} className="text-accent hover:underline">
              @{answers}
            </Link>
          </p>
        ) : null}
        <p className="mt-1 text-[15px] leading-[1.45] break-words whitespace-pre-wrap text-foreground/90">{comment.body}</p>
        <div className="mt-1 -ml-2.5 flex items-center gap-1 text-muted">
          <CommentLike comment={comment} />
          <button
            type="button"
            onClick={() => handlers.onReply(comment)}
            aria-label={`Reply to ${comment.author.name}`}
            className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <MessageCircle className="size-4" strokeWidth={1.9} /> Reply
          </button>
        </div>
      </div>
    </article>
  );
}

function Composer({
  viewer,
  sourceHandle,
  replyTo,
  onCancelReply,
  textareaRef,
  onSubmit,
}: {
  viewer: Viewer;
  sourceHandle: string;
  /** The comment being answered; null for a reply to the story. */
  replyTo: Comment | null;
  onCancelReply: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: (body: string) => Promise<boolean>;
}) {
  const [body, setBody] = useState("");
  const [focused, setFocused] = useState(false);
  const [pending, startTransition] = useTransition();
  const remaining = COMMENT_MAX_LENGTH - body.length;
  const progress = Math.min(body.length / COMMENT_MAX_LENGTH, 1);

  return (
    <form
      className="flex gap-3 border-b border-border px-4 pt-1 pb-4 sm:px-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          if (await onSubmit(body)) setBody("");
        });
      }}
    >
      <UserAvatar user={viewer} size={40} className="mt-3" />
      <div className="min-w-0 flex-1">
        {replyTo ? (
          <p className="flex items-center gap-1 pt-3 text-[15px] text-muted">
            Replying to <span className="text-accent">@{replyTo.author.handle}</span>
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Reply to the story instead"
              className="-my-1 ml-1 flex size-7 items-center justify-center rounded-full hover:bg-white/[0.08]"
            >
              <X className="size-4" />
            </button>
          </p>
        ) : focused || body ? (
          <p className="pt-3 text-[15px] text-muted">
            Replying to <span className="text-accent">@{sourceHandle}</span>
          </p>
        ) : null}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={focused || body || replyTo ? 3 : 1}
          maxLength={COMMENT_MAX_LENGTH + 20}
          placeholder="Post your reply"
          aria-label="Post your reply"
          className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-[16px] leading-6 transition-colors placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <div className="flex items-center justify-end gap-3 pt-2">
          {body ? (
            <span className="flex items-center gap-2">
              {remaining <= 20 ? (
                <span className={cn("text-[13px]", remaining < 0 ? "text-live" : "text-muted")}>
                  {remaining}
                </span>
              ) : null}
              <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden>
                <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-border-strong)" strokeWidth="2" />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke={remaining < 0 ? "var(--color-live)" : remaining <= 20 ? "var(--color-repost)" : "var(--color-accent)"}
                  strokeWidth="2"
                  strokeDasharray={`${progress * 50.27} 50.27`}
                />
              </svg>
            </span>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            disabled={!body.trim() || remaining < 0 || pending}
          >
            {pending ? "Replying…" : "Reply"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CommentLike({ comment }: { comment: Comment }) {
  const [liked, toggle] = useToggle("likedComments", comment.id);
  const likes = useAdjustedCount("likedComments", comment.id, comment.likesCount, comment.countedAt);

  return (
    <button
      type="button"
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      onClick={() => toggle()}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full px-2.5 transition-colors",
        liked ? "bg-like/10 text-like" : "hover:bg-white/[0.06] hover:text-foreground",
      )}
    >
      <Heart key={liked ? "on" : "off"} className={cn("size-4", liked && "animate-pop fill-current")} strokeWidth={1.9} />
      {likes > 0 ? <span className="text-[13px] font-medium tabular-nums">{formatCount(likes)}</span> : null}
    </button>
  );
}

function DeleteDialog({
  comment,
  onClose,
  onDeleted,
}: {
  comment: Comment | null;
  onClose: () => void;
  onDeleted: (comment: Comment) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={comment !== null}
      onClose={onClose}
      title="Delete reply?"
      description="This can't be undone. Replies people wrote to it stay, under a note that yours was deleted."
    >
      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="destructive"
          size="lg"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (!comment) return;
              const result = await deleteComment(comment.id);
              if (!result.ok) {
                toast(result.error);
                return;
              }
              onDeleted(comment);
              onClose();
              toast("Your reply was deleted");
            })
          }
        >
          {pending ? "Deleting…" : "Delete"}
        </Button>
        <Button variant="outline" size="lg" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

function ReportDialog({
  comment,
  onClose,
  onReported,
}: {
  comment: Comment | null;
  onClose: () => void;
  onReported: (comment: Comment) => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [pending, startTransition] = useTransition();
  const close = () => {
    setReason(null);
    onClose();
  };

  return (
    <Dialog
      open={comment !== null}
      onClose={close}
      title="Report this reply"
      description={
        comment ? (
          <>
            What&apos;s wrong with @{comment.author.handle}&apos;s reply? Replies several readers report are hidden.
          </>
        ) : null
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            if (!comment || !reason) return;
            const result = await reportComment(comment.id, reason);
            if (!result.ok) {
              toast(result.error);
              return;
            }
            onReported(comment);
            close();
            toast("Thanks for letting us know");
          });
        }}
      >
        <fieldset className="mt-4">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map((option) => (
            <label
              key={option.value}
              className="-mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.04] has-checked:bg-accent/10"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{option.label}</span>
                <span className="block text-[13px] text-muted">{option.description}</span>
              </span>
              <input
                type="radio"
                name="reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className="size-5 shrink-0 accent-accent"
              />
            </label>
          ))}
        </fieldset>
        <div className="mt-5 flex flex-col gap-3">
          <Button type="submit" variant="primary" size="lg" disabled={!reason || pending}>
            {pending ? "Reporting…" : "Report"}
          </Button>
          <Button variant="outline" size="lg" onClick={close}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
