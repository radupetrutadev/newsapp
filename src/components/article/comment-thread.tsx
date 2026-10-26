"use client";

import { Heart, MessageCircle, Repeat2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { TimeAgo } from "@/components/ui/time-ago";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { postComment } from "@/lib/actions/comments";
import { useAdjustedCount, useToggle } from "@/lib/store/engagement";
import { toast } from "@/lib/store/toast";
import type { Comment, Viewer } from "@/lib/types";
import { cn, formatCount } from "@/lib/utils";

const MAX_LENGTH = 280;

export function CommentThread({
  articleId,
  sourceHandle,
  comments,
  viewer,
}: {
  articleId: string;
  sourceHandle: string;
  comments: Comment[];
  viewer: Viewer | null;
}) {
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const all = [...localComments, ...comments];

  // Links from notifications point at one comment (#comment-<id>). Replies
  // stream in after the page, so scroll to it and mark it once they're here.
  // (:target alone misses in-app navigation, which doesn't update it.)
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const linked = id.startsWith("comment-") ? document.getElementById(id) : null;
    if (!linked) return;
    linked.setAttribute("data-linked", "");
    linked.scrollIntoView({ block: "center" });
  }, []);

  return (
    <section id="replies" aria-label="Replies" className="scroll-mt-16">
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
            if (!result.persisted) setLocalComments((current) => [result.comment, ...current]);
            setReplyTo(null);
            toast("Your reply was sent");
            return true;
          }}
        />
      ) : (
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4">
          <p className="text-[15px] text-muted">Sign in to join the conversation.</p>
          <Link href="/login" className={buttonClasses({ variant: "accent", size: "sm" })}>
            Sign in
          </Link>
        </div>
      )}

      {all.length === 0 ? (
        <p className="px-4 py-10 text-center text-[15px] text-muted">
          No replies yet. Start the conversation.
        </p>
      ) : (
        all.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            authorHref={comment.author.id === viewer?.id ? "/profile" : `/user/${comment.author.handle}`}
            onReply={() => {
              if (!viewer) {
                toast("Sign in to reply", { label: "Sign in", href: "/login" });
                return;
              }
              setReplyTo(comment);
              textareaRef.current?.focus();
              textareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
            }}
          />
        ))
      )}
    </section>
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
  const remaining = MAX_LENGTH - body.length;
  const progress = Math.min(body.length / MAX_LENGTH, 1);

  return (
    <form
      className="flex gap-3 border-b border-border px-4 pt-1 pb-3"
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
              className="-my-1 ml-1 flex size-7 items-center justify-center rounded-full hover:bg-white/10"
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
          maxLength={MAX_LENGTH + 20}
          placeholder="Post your reply"
          aria-label="Post your reply"
          className="w-full resize-none bg-transparent pt-4 text-xl leading-6 placeholder:text-muted focus:outline-none"
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
                <circle cx="10" cy="10" r="8" fill="none" stroke="#2f3336" strokeWidth="2" />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke={remaining < 0 ? "#f4212e" : remaining <= 20 ? "#ffd400" : "#1d9bf0"}
                  strokeWidth="2"
                  strokeDasharray={`${progress * 50.27} 50.27`}
                />
              </svg>
            </span>
          ) : null}
          <Button
            type="submit"
            variant="accent"
            disabled={!body.trim() || remaining < 0 || pending}
          >
            {pending ? "Replying…" : "Reply"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  authorHref,
  onReply,
}: {
  comment: Comment;
  authorHref: string;
  onReply: () => void;
}) {
  return (
    <article
      id={`comment-${comment.id}`}
      className="flex scroll-mt-16 gap-3 border-b border-border px-4 pt-3 pb-2 transition-colors hover:bg-white/[0.03] data-linked:bg-accent/[0.06]"
    >
      <Link href={authorHref} className="shrink-0" aria-label={comment.author.name}>
        <UserAvatar user={comment.author} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px] leading-5">
          <Link href={authorHref} className="flex min-w-0 items-center gap-1">
            <span className="truncate font-bold hover:underline">{comment.author.name}</span>
            {comment.author.verified ? <VerifiedBadge /> : null}
            <span className="truncate text-muted">@{comment.author.handle}</span>
          </Link>
          <span className="text-muted">·</span>
          <TimeAgo iso={comment.createdAt} className="shrink-0 text-muted" />
        </div>
        {comment.replyToHandle ? (
          <p className="text-[15px] text-muted">
            Replying to{" "}
            <Link href={`/user/${comment.replyToHandle}`} className="text-accent hover:underline">
              @{comment.replyToHandle}
            </Link>
          </p>
        ) : null}
        <p className="mt-0.5 text-[15px] leading-5 whitespace-pre-wrap">{comment.body}</p>
        <div className="mt-2 flex max-w-[425px] justify-between text-muted">
          <button
            type="button"
            onClick={onReply}
            aria-label={`Reply to ${comment.author.name}`}
            className="group/action flex items-center hover:text-accent"
          >
            <span className="-m-2 flex size-[34px] items-center justify-center rounded-full group-hover/action:bg-accent/10">
              <MessageCircle className="size-[18px]" strokeWidth={1.9} />
            </span>
          </button>
          <span className="group/action flex items-center hover:text-repost">
            <span className="-m-2 flex size-[34px] items-center justify-center rounded-full group-hover/action:bg-repost/10">
              <Repeat2 className="size-[18px]" strokeWidth={1.9} />
            </span>
          </span>
          <CommentLike comment={comment} />
        </div>
      </div>
    </article>
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
      className={cn("group/action flex items-center", liked ? "text-like" : "hover:text-like")}
    >
      <span className="-m-2 flex size-[34px] items-center justify-center rounded-full group-hover/action:bg-like/10">
        <Heart className={cn("size-[18px]", liked && "animate-pop fill-current")} strokeWidth={1.9} />
      </span>
      {likes > 0 ? <span className="pl-1 text-[13px] tabular-nums">{formatCount(likes)}</span> : null}
    </button>
  );
}
