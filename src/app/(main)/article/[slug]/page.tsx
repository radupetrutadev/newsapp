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
      <article className="px-4 pt-4 md:px-0">
        <div className="flex flex-wrap items-center gap-2">
          {article.isBreaking ? (
            <span className="kicker inline-flex items-center gap-1 rounded-md bg-live px-2 py-1 text-white">
              <Zap className="size-3 fill-current" /> Breaking
            </span>
          ) : null}
          <Link
            href={`/topics/${article.category}`}
            className="kicker rounded-full border border-accent/30 px-2.5 py-1 text-accent transition-colors hover:bg-accent/10"
          >
            {categoryName(article.category)}
          </Link>
          <span className="kicker text-muted">{article.readTimeMinutes} min read</span>
        </div>

        <h1 className="mt-4 font-display text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-[40px]">
          {article.title}
        </h1>
        <p className="mt-4 text-[18px] leading-7 text-foreground/70 sm:text-[19px]">{article.summary}</p>

        <div className="mt-6 flex items-center gap-3 border-y border-border py-4">
          <Link href={`/source/${source.handle}`} className="shrink-0">
            <SourceAvatar source={source} size={44} />
          </Link>
          <div className="min-w-0 flex-1 leading-5">
            <Link
              href={`/source/${source.handle}`}
              className="flex items-center gap-1 text-[15px] font-semibold hover:underline"
            >
              <span className="truncate">{source.name}</span>
              {source.verified ? <VerifiedBadge variant="source" /> : null}
            </Link>
            <p className="truncate text-[13px] text-muted">
              <ArticleTimestamp iso={article.publishedAt} />
              {stats.views > 0 ? <> · {formatCount(stats.views)} reads</> : null}
            </p>
          </div>
          <FollowButton id={source.id} name={source.name} />
        </div>

        <ArticleMedia
          article={article}
          controls
          priority
          sizes="(min-width: 768px) 720px, 100vw"
          className="mt-6 rounded-2xl border border-border"
        />

        <div className="mt-6 space-y-5 text-[17px] leading-[1.75] text-foreground/90 [&>p:first-child]:text-[19px] [&>p:first-child]:text-foreground">
          {article.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {article.tags.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="rounded-full border border-border bg-surface px-3 py-1 text-[13px] text-foreground/80 transition-colors hover:border-accent/40 hover:text-accent"
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
              className="group mt-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-hover"
            >
              <SourceAvatar source={source} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold group-hover:text-accent">
                  Read the full story at {source.name}
                </span>
                <span className="block truncate text-[13px] text-muted">{hostname(article.url)}</span>
              </span>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent">
                <ExternalLink className="size-[18px]" />
              </span>
            </a>
          ) : (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "outline", className: "mt-6" })}
            >
              Read the full story at {hostname(article.url)} <ExternalLink className="size-4" />
            </a>
          )
        ) : null}
      </article>

      <div className="mx-4 mt-8 rounded-2xl border border-border bg-surface md:mx-0">
        <EngagementStats article={article} />
        <ArticleActions article={article} size="detail" className="px-2 py-1.5 sm:px-3" />
      </div>

      <FullCoverage article={article} stories={coverage} />

      <Suspense fallback={<FeedSkeleton count={2} />}>
        <Replies article={article} />
      </Suspense>

      {related.length > 0 ? (
        <section aria-labelledby="related" className="mt-10">
          <h2 id="related" className="px-4 pb-4 font-display text-[24px] font-semibold tracking-tight md:px-0">
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
