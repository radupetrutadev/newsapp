/*
 * Embeddings from OpenAI: what a story or a search is about, as a vector, so
 * they can be compared by meaning. text-embedding-3-small, shortened to the
 * 512 dimensions public.articles.embedding holds. Used by news ingestion for
 * stories and by search for queries; without OPENAI_API_KEY both go without.
 *
 * Plain fetch, no SDK. OPENAI_BASE_URL points it at another OpenAI-compatible
 * endpoint (the end-to-end tests use a stand-in).
 */

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 512;

/** The API takes up to 2,048 inputs per request; smaller batches retry less on failure. */
const BATCH_SIZE = 100;
const TIMEOUT_MS = 20_000;

export interface EmbeddingConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

/** Server-only: reads the secret key. Null when search by meaning is off. */
export function embeddingConfig(): EmbeddingConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? { apiKey, baseUrl: process.env.OPENAI_BASE_URL || undefined } : null;
}

export class EmbeddingError extends Error {}

interface EmbeddingsResponse {
  data: { index: number; embedding: number[] }[];
}

/** One vector per text, in order. */
export async function embed(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
  const fetchImpl = config.fetch ?? fetch;
  const url = `${(config.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "")}/embeddings`;
  const vectors: number[][] = [];

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const input = texts.slice(start, start + BATCH_SIZE);
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input, dimensions: EMBEDDING_DIMENSIONS }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      const detail = body?.error?.message;
      throw new EmbeddingError(`OpenAI embeddings: HTTP ${response.status}${detail ? ` (${detail})` : ""}`);
    }

    const { data } = (await response.json()) as EmbeddingsResponse;
    const batch = [...data].sort((a, b) => a.index - b.index).map((item) => item.embedding);
    if (batch.length !== input.length || batch.some((vector) => vector.length !== EMBEDDING_DIMENSIONS)) {
      throw new EmbeddingError("OpenAI embeddings: unexpected response");
    }
    vectors.push(...batch);
  }
  return vectors;
}

/** What a story is embedded from: its headline, summary, tags and topic. */
export function storyText(story: { title: string; summary: string; tags: string[]; category: string }): string {
  const tags = story.tags.map((tag) => tag.replace(/([a-z0-9])([A-Z])/g, "$1 $2")).join(", ");
  return [story.title, story.summary, tags && `Tags: ${tags}`, `Topic: ${story.category}`]
    .filter(Boolean)
    .join("\n");
}

/** A search as it's embedded, so equivalent queries share one embedding. */
export const normalizeQuery = (query: string) => query.trim().replace(/\s+/g, " ").toLowerCase();

/** A vector as pgvector reads it: "[0.1,0.2,…]". */
export const toVector = (values: number[]) => `[${values.join(",")}]`;
