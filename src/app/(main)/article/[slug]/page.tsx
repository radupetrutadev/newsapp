import { ExternalLink, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArticleTimestamp } from "@/components/article/article-timestamp";
import { CommentThread } from "@/components/article/comment-thread";
import { EngagementStats } from "@/components/article/engagement-stats";
import { FullCoverage } from "@/components/article/full-coverage";
import { RecordView } from "@/components/article/record-view";
import { ArticleActions } from "@/components/feed/article-actions";
import { ArticleList } from "@/components/feed/article-list";
import { ArticleMedia } from "@/components/feed/article-media";
import { PageHeader } from "@/components/layout/page-header";
import { FollowButton } from "@/components/source/follow-button";
import { StorySkeleton } from "@/components/source/profile-skeleton";
import { SourceAvatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { categoryName } from "@/lib/categories";
import { getArticle, getArticleSlugs, getComments, getCoverage, getRelatedArticles } from "@/lib/data";
import { getViewerReports } from "@/lib/data/activity";
import { getViewer } from "@/lib/data/viewer";
import type { Article } from "@/lib/types";
import { formatCount, hostname } from "@/lib/utils";

export async function generateStaticParams() {
  return (await getArticleSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/article/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Story not found" };

  return {
    title: article.title,
    description: article.summary,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary,
      publishedTime: article.publishedAt,
      authors: [article.source.name],
    },
  };
}

export default function ArticlePage({ params }: PageProps<"/article/[slug]">) {
  return (
    <>
      <PageHeader title="Story" back="/" />
      <Suspense fallback={<StorySkeleton />}>
        <Story params={params} />
      </Suspense>
    </>
  );
}

async function Story({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const [related, coverage] = await Promise.all([
    getRelatedArticles(article, 4),
    article.coverage ? getCoverage(article.coverage.clusterId) : [],
  ]);
  const { source, stats } = article;

  return (
    <>
      <RecordView articleId={article.id} />
      <article className="px-4 pt-3">
        <div className="flex items-center gap-3">
          <Link href={`/source/${source.handle}`}>
            <SourceAvatar source={source} size={40} />
          </Link>
          <Link href={`/source/${source.handle}`} className="min-w-0 flex-1 leading-5">
            <span className="flex items-center gap-1 text-[15px] font-bold">
              <span className="truncate hover:underline">{source.name}</span>
              {source.verified ? <VerifiedBadge variant="gold" /> : null}
            </span>
            <span className="block truncate text-[15px] text-muted">@{source.handle}</span>
          </Link>
          <FollowButton id={source.id} name={source.name} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
          {article.isBreaking ? (
            <span className="inline-flex items-center gap-1 rounded bg-live px-1.5 py-px text-[11px] font-extrabold tracking-wider text-white uppercase">
              <Zap className="size-3 fill-current" /> Breaking
            </span>
          ) : null}
          <Link
            href={`/topics/${article.category}`}
            className="rounded-full bg-accent/10 px-2.5 py-0.5 font-semibold text-accent hover:bg-accent/20"
          >
            {categoryName(article.category)}
          </Link>
          <span className="text-muted">{article.readTimeMinutes} min read</span>
        </div>

        <h1 className="mt-3 text-[26px] leading-[1.15] font-extrabold tracking-tight text-pretty sm:text-[31px]">
          {article.title}
        </h1>
        <p className="mt-3 text-[17px] leading-6 text-foreground/80">{article.summary}</p>

        <ArticleMedia
          article={article}
          controls
          priority
          sizes="(min-width: 640px) 568px, 100vw"
          className="mt-4 rounded-2xl border border-border"
        />

        <div className="mt-5 space-y-4 text-[17px] leading-[1.65] text-foreground/95">
          {article.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {article.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="text-[15px] text-accent hover:underline"
              >
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}

        {article.url ? (
          article.body.length === 0 ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-5 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover"
            >
              <SourceAvatar source={source} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold group-hover:underline">
                  Read the full story at {source.name}
                </span>
                <span className="block truncate text-[13px] text-muted">{hostname(article.url)}</span>
              </span>
              <ExternalLink className="size-5 shrink-0 text-accent" />
            </a>
          ) : (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "outline", className: "mt-5" })}
            >
              Read the full story at {hostname(article.url)} <ExternalLink className="size-4" />
            </a>
          )
        ) : null}

        <p className="mt-5 pb-4 text-[15px] text-muted">
          <ArticleTimestamp iso={article.publishedAt} />
          {stats.views > 0 ? (
            <>
              {" "}
              · <span className="font-bold text-foreground">{formatCount(stats.views)}</span> Views
            </>
          ) : null}
        </p>
      </article>

      <EngagementStats article={article} />

      <div className="mx-4 border-y border-border py-2">
        <ArticleActions article={article} size="detail" />
      </div>

      <FullCoverage article={article} stories={coverage} />

      <Suspense fallback={<FeedSkeleton count={2} />}>
        <Replies article={article} />
      </Suspense>

      {related.length > 0 ? (
        <section aria-labelledby="related">
          <h2 id="related" className="border-b border-border px-4 pt-6 pb-3 text-xl font-extrabold">
            More stories
          </h2>
          <ArticleList articles={related} />
        </section>
      ) : null}
    </>
  );
}

async function Replies({ article }: { article: Article }) {
  // Replies are read fresh for each visit (see getComments).
  await connection();
  const [comments, viewer, reportedIds] = await Promise.all([
    getComments(article.id),
    getViewer(),
    getViewerReports(article.id),
  ]);
  return (
    <CommentThread
      articleId={article.id}
      sourceHandle={article.source.handle}
      comments={comments}
      reportedIds={reportedIds}
      viewer={viewer}
    />
  );
}
