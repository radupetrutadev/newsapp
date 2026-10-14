import Image from "next/image";
import { Cover } from "@/components/ui/cover";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The article's photo, or generated cover art when it has none. */
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
  return (
    <div className={cn("relative aspect-video overflow-hidden", className)}>
      {article.imageUrl ? (
        <Image
          src={article.imageUrl}
          alt={article.title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <Cover seed={article.slug} category={article.category} className="absolute inset-0" />
      )}
    </div>
  );
}
