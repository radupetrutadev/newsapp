import { describe, expect, it } from "vitest";
import { embed, EMBEDDING_DIMENSIONS, EmbeddingError, normalizeQuery, storyText, toVector } from "./openai";

const vector = (seed: number) => Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => (index === seed ? 1 : 0));

/** Answers like the embeddings API, in shuffled order, and records each request. */
function fakeApi(status = 200) {
  const requests: { url: string; init: RequestInit; body: { model: string; input: string[]; dimensions: number } }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    requests.push({ url, init, body });
    if (status !== 200) return Response.json({ error: { message: "Incorrect API key provided" } }, { status });
    const data = body.input.map((text: string, index: number) => ({ index, embedding: vector(text.length) }));
    return Response.json({ data: data.reverse() });
  }) as unknown as typeof fetch;
  return { fetchImpl, requests };
}

describe("embed", () => {
  it("asks for small 512-dimension embeddings and keeps the input order", async () => {
    const { fetchImpl, requests } = fakeApi();
    const vectors = await embed(["a", "bbb"], { apiKey: "sk-test", fetch: fetchImpl });

    expect(vectors).toEqual([vector(1), vector(3)]);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://api.openai.com/v1/embeddings");
    expect(requests[0].body).toEqual({ model: "text-embedding-3-small", input: ["a", "bbb"], dimensions: 512 });
    expect(new Headers(requests[0].init.headers).get("authorization")).toBe("Bearer sk-test");
  });

  it("sends large batches in parts and uses another base URL when set", async () => {
    const { fetchImpl, requests } = fakeApi();
    const texts = Array.from({ length: 250 }, (_, index) => "x".repeat((index % 500) + 1));
    const vectors = await embed(texts, { apiKey: "k", baseUrl: "http://localhost:9999/v1/", fetch: fetchImpl });

    expect(vectors).toHaveLength(250);
    expect(requests.map((request) => request.body.input.length)).toEqual([100, 100, 50]);
    expect(requests[0].url).toBe("http://localhost:9999/v1/embeddings");
  });

  it("explains failures", async () => {
    const { fetchImpl } = fakeApi(401);
    await expect(embed(["a"], { apiKey: "bad", fetch: fetchImpl })).rejects.toThrow(
      new EmbeddingError("OpenAI embeddings: HTTP 401 (Incorrect API key provided)"),
    );
  });
});

describe("storyText", () => {
  it("combines what the story is about", () => {
    expect(
      storyText({ title: "Fed holds rates", summary: "Powell urges patience.", tags: ["FederalReserve"], category: "business" }),
    ).toBe("Fed holds rates\nPowell urges patience.\nTags: Federal Reserve\nTopic: business");
  });
});

describe("helpers", () => {
  it("normalize queries and format vectors for pgvector", () => {
    expect(normalizeQuery("  Northern   Lights ")).toBe("northern lights");
    expect(toVector([0.5, -1, 0])).toBe("[0.5,-1,0]");
  });
});
