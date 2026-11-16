// A stand-in for OpenAI's embeddings API, for the end-to-end tests, which
// never call the real one. Embeddings are hashed bags of words, with a few
// words mapped to a shared concept, so tests can search by meaning:
// "automobiles" lands next to stories about cars.
//
//   node e2e/support/fake-openai.mjs [port]
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 3101);
const DIMENSIONS = 512;
const concepts = { automobile: "car", automobiles: "car", vehicle: "car", vehicles: "car", cars: "car" };
const stopwords = new Set("a an and as at by for from in into is it its of on or the to with".split(" "));

function bucket(word) {
  let hash = 2166136261;
  for (const char of word) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % DIMENSIONS;
}

function embedding(text) {
  const vector = new Array(DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length < 2 || stopwords.has(word)) continue;
    vector[bucket(concepts[word] ?? word)] += 1;
  }
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

createServer((request, response) => {
  const reply = (status, body) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.method === "GET" && request.url === "/health") return reply(200, { ok: true });
  if (request.method !== "POST" || request.url !== "/v1/embeddings") return reply(404, { error: { message: "Not found" } });
  if (request.headers.authorization !== "Bearer e2e-fake-key") return reply(401, { error: { message: "Bad key" } });

  let raw = "";
  request.on("data", (chunk) => (raw += chunk));
  request.on("end", () => {
    const { input, dimensions } = JSON.parse(raw);
    if (dimensions !== DIMENSIONS) return reply(400, { error: { message: `Expected ${DIMENSIONS} dimensions` } });
    reply(200, { data: input.map((text, index) => ({ index, embedding: embedding(text) })) });
  });
}).listen(port, "127.0.0.1");
