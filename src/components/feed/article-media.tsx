"use client";

import { EyeOff, Play, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Cover } from "@/components/ui/cover";
import { useSettings } from "@/lib/store/settings";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";

const reducedMotion = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotion);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToMotion, () => window.matchMedia(reducedMotion).matches, () => false);
}

/**
 * Calls `onError` if the video fails to load, including before the page
 * hydrated, when React wasn't listening yet.
 */
function useVideoError(onError: () => void) {
  const ref = useRef<HTMLVideoElement>(null);
  const latest = useRef(onError);
  useEffect(() => {
    latest.current = onError;
  });
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const failed = () => latest.current();
    if (video.error) failed();
    video.addEventListener("error", failed);
    return () => video.removeEventListener("error", failed);
  }, []);
  return ref;
}

/**
 * The story's video, photo, or generated cover art when it has neither.
 * Publisher media can disappear or block hotlinking, so a failed load falls
 * back to the photo, then the cover.
 *
 * In lists (the default) the media is a preview: clicks go through to the
 * story link underneath, and a video plays muted while it's on screen if the
 * reader's autoplay setting is on. With `controls` (the story page) a video
 * gets a player. Either way, sensitive media is blurred until the reader
 * chooses to see it, unless they've turned that setting off.
 */
export function ArticleMedia({
  article,
  className,
  sizes = "(min-width: 640px) 520px, 100vw",
  priority,
  controls = false,
}: {
  article: Pick<Article, "slug" | "title" | "imageUrl" | "videoUrl" | "isSensitive" | "category">;
  className?: string;
  sizes?: string;
  priority?: boolean;
  controls?: boolean;
}) {
  const { autoplayVideo, hideSensitive } = useSettings();
  const motionReduced = useReducedMotion();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [failedVideo, setFailedVideo] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const imageUrl = article.imageUrl !== failedUrl ? article.imageUrl : null;
  const videoUrl = article.videoUrl !== failedVideo ? article.videoUrl : null;
  const hidden = article.isSensitive && hideSensitive && !revealed;
  const autoplay = autoplayVideo && !motionReduced;

  const still = imageUrl ? (
    <Image
      src={imageUrl}
      alt={article.title}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailedUrl(imageUrl)}
      className="object-cover"
    />
  ) : (
    <Cover seed={article.slug} category={article.category} className="absolute inset-0" />
  );

  let media = still;
  if (videoUrl && !hidden && controls) {
    media = (
      <PlayerVideo src={videoUrl} poster={imageUrl} title={article.title} onError={() => setFailedVideo(videoUrl)} />
    );
  } else if (videoUrl && !hidden && autoplay) {
    media = <PreviewVideo src={videoUrl} poster={imageUrl} title={article.title} onError={() => setFailedVideo(videoUrl)} />;
  }

  return (
    <div className={cn("relative aspect-video overflow-hidden bg-surface", !controls && "pointer-events-none", className)}>
      <div className={cn("absolute inset-0", hidden && "scale-110 blur-2xl")}>{media}</div>

      {videoUrl && !hidden && !controls && !autoplay ? (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="flex size-14 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/20">
            <Play className="size-6 translate-x-px fill-current text-white" />
          </span>
        </span>
      ) : null}

      {hidden ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 p-4 text-center">
          <EyeOff className="size-6 text-white" />
          <p className="mt-2 text-[15px] font-bold text-white">Sensitive content</p>
          <p className="mt-0.5 max-w-[280px] text-[13px] text-white/80">
            This story&apos;s {videoUrl ? "video" : "photo"} may show graphic or distressing scenes.
          </p>
          <button
            type="button"
            onClick={(event) => {
              // It can sit inside a link to the story.
              event.preventDefault();
              event.stopPropagation();
              setRevealed(true);
            }}
            className="pointer-events-auto mt-3 rounded-full border border-white/50 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            Show
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PlayerVideo({
  src,
  poster,
  title,
  onError,
}: {
  src: string;
  poster: string | null;
  title: string;
  onError: () => void;
}) {
  const ref = useVideoError(onError);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster ?? undefined}
      controls
      playsInline
      preload="metadata"
      aria-label={title}
      className="size-full bg-black object-contain"
    />
  );
}

/** A muted, looping preview that plays only while most of it is on screen. */
function PreviewVideo({
  src,
  poster,
  title,
  onError,
}: {
  src: string;
  poster: string | null;
  title: string;
  onError: () => void;
}) {
  const ref = useVideoError(onError);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.6 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [ref]);

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={title}
        className="size-full object-cover"
      />
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMuted((value) => !value);
        }}
        aria-label={muted ? "Unmute" : "Mute"}
        className="pointer-events-auto absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/85"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </>
  );
}
