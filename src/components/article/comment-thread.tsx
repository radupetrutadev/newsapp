"use client";

import { ChartNoAxesColumn, Heart, MessageCircle, Repeat2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { TimeAgo } from "@/components/ui/time-ago";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { postComment } from "@/lib/actions/comments";
import { toast } from "@/lib/store/toast";
import type { Comment, Viewer } from "@/lib/types";
import { cn, formatCount, hashString } from "@/lib/utils";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const all = [...localComments, ...comments];

  return (
    <section id="replies" aria-label="Replies" className="scroll-mt-16">
      {viewer ? (
        <Composer
          viewer={viewer}
          sourceHandle={sourceHandle}
          textareaRef={textareaRef}
          onSubmit={async (body) => {
            const result = await postComment(articleId, body);
            if (!result.ok) {
              toast(result.error);
              return false;
            }
            if (!result.persisted) setLocalComments((current) => [result.comment, ...current]);
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
            onReply={() => textareaRef.current?.focus()}
          />
        ))
      )}
    </section>
  );
}

function Composer({
  viewer,
  sourceHandle,
  textareaRef,
  onSubmit,
}: {
  viewer: Viewer;
  sourceHandle: string;
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
        {focused || body ? (
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
          rows={focused || body ? 3 : 1}
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

function CommentItem({ comment, onReply }: { comment: Comment; onReply: () => void }) {
  const [liked, setLiked] = useState(false);
  const views = (hashString(comment.id) % 9_000) + comment.likesCount * 12;

  return (
    <article className="flex gap-3 border-b border-border px-4 pt-3 pb-2 transition-colors hover:bg-white/[0.03]">
      <UserAvatar user={comment.author} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px] leading-5">
          <span className="truncate font-bold">{comment.author.name}</span>
          {comment.author.verified ? <VerifiedBadge /> : null}
          <span className="truncate text-muted">@{comment.author.handle}</span>
          <span className="text-muted">·</span>
          <TimeAgo iso={comment.createdAt} className="shrink-0 text-muted" />
        </div>
        <p className="mt-0.5 text-[15px] leading-5 whitespace-pre-wrap">{comment.body}</p>
        <div className="mt-2 flex max-w-[425px] justify-between text-muted">
          <button
            type="button"
            onClick={onReply}
            aria-label="Reply"
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
          <button
            type="button"
            aria-label={liked ? "Unlike" : "Like"}
            aria-pressed={liked}
            onClick={() => setLiked((value) => !value)}
            className={cn("group/action flex items-center", liked ? "text-like" : "hover:text-like")}
          >
            <span className="-m-2 flex size-[34px] items-center justify-center rounded-full group-hover/action:bg-like/10">
              <Heart
                className={cn("size-[18px]", liked && "animate-pop fill-current")}
                strokeWidth={1.9}
              />
            </span>
            <span className="pl-1 text-[13px] tabular-nums">
              {formatCount(comment.likesCount + (liked ? 1 : 0))}
            </span>
          </button>
          <span className="flex items-center" title="Views">
            <ChartNoAxesColumn className="size-[18px]" strokeWidth={1.9} />
            <span className="pl-1 text-[13px] tabular-nums">{formatCount(views)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
