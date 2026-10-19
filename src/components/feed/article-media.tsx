"use client";

import Image from "next/image";
import { useState } from "react";
import { Cover } from "@/components/ui/cover";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The story's photo, or generated cover art when it has none. Publisher
 * images can disappear or block hotlinking, so a failed load falls back to
 * the cover too.
 */
export function ArticleMedia({
  article,
  className,
  sizes = "(min-width: 640px) 520px, 100vw",
  priority,
}: {
  article: Pick<Article, "slug" | "title" | "imageUrl" | "category">;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = article.imageUrl !== failedUrl ? article.imageUrl : null;

  return (
    <div className={cn("relative aspect-video overflow-hidden", className)}>
      {imageUrl ? (
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
      )}
    </div>
  );
}
