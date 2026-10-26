import { XMLParser } from "fast-xml-parser";

/** One entry from an RSS 2.0, RSS 1.0 (RDF) or Atom feed, before cleanup. */
export interface ParsedItem {
  title: string;
  link: string | null;
  published: string | null;
  /** Short description or summary; may contain HTML. */
  description: string | null;
  /** Full content (content:encoded or Atom content); may contain HTML. */
  content: string | null;
  /** Image declared through media:* or an image enclosure. */
  imageUrl: string | null;
  /** A video browsers can play, declared through media:content or an enclosure. */
  videoUrl: string | null;
  /** The feed rates the item's media as adult (media:rating). */
  ratedAdult: boolean;
  categories: string[];
}

export interface ParsedFeed {
  format: "rss" | "rdf" | "atom";
  title: string | null;
  items: ParsedItem[];
}

const arrayTags = new Set([
  "item",
  "entry",
  "category",
  "link",
  "enclosure",
  "media:content",
  "media:thumbnail",
  "media:group",
  "media:rating",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (tagName) => arrayTags.has(tagName),
});

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Text content of an element that may be a string, a number or { "#text": … }. */
function text(value: unknown): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first === "string") return first.trim() || null;
  if (typeof first === "number") return String(first);
  if (isNode(first)) return text(first["#text"]);
  return null;
}

function attr(value: unknown, name: string): string | null {
  return isNode(value) && typeof value[`@_${name}`] === "string"
    ? (value[`@_${name}`] as string).trim() || null
    : null;
}

/** Picks the largest image from media:content / media:thumbnail / enclosure. */
function declaredImage(item: Node): string | null {
  const groups = list(item["media:group"]).filter(isNode);
  const candidates = [item, ...groups].flatMap((node) => [
    ...list(node["media:content"]),
    ...list(node["media:thumbnail"]),
  ]);

  let best: { url: string; width: number } | null = null;
  for (const candidate of candidates) {
    const url = attr(candidate, "url");
    if (!url) continue;
    // media:thumbnail usually carries no type; media:content may be video or audio.
    const medium = attr(candidate, "medium");
    const type = attr(candidate, "type");
    const isImage = medium ? medium === "image" : type ? type.startsWith("image/") : true;
    if (!isImage) continue;
    const width = Number(attr(candidate, "width") ?? 0);
    if (!best || width > best.width) best = { url, width };
  }
  if (best) return best.url;

  for (const enclosure of list(item.enclosure)) {
    const url = attr(enclosure, "url");
    if (url && attr(enclosure, "type")?.startsWith("image/")) return url;
  }
  return null;
}

// MP4 and WebM play everywhere; HLS playlists and the rest need a player.
const playableVideo = new Set(["video/mp4", "video/webm"]);
/** Feeds offer several sizes; previews don't need more than this. */
const VIDEO_MAX_WIDTH = 1280;

function isPlayableVideo(url: string, type: string | null, medium: string | null): boolean {
  if (type) return playableVideo.has(type.split(";")[0].trim().toLowerCase());
  return medium === "video" && /\.(?:mp4|m4v|webm)(?:[?#]|$)/i.test(url);
}

/** Picks a playable video: the widest up to VIDEO_MAX_WIDTH, else the narrowest. */
function declaredVideo(item: Node): string | null {
  const groups = list(item["media:group"]).filter(isNode);
  const candidates = [item, ...groups].flatMap((node) => list(node["media:content"]));

  const videos: { url: string; width: number }[] = [];
  for (const candidate of candidates) {
    const url = attr(candidate, "url");
    if (url && isPlayableVideo(url, attr(candidate, "type"), attr(candidate, "medium"))) {
      videos.push({ url, width: Number(attr(candidate, "width") ?? 0) || 0 });
    }
  }
  const fitting = videos.filter((video) => video.width <= VIDEO_MAX_WIDTH).sort((a, b) => b.width - a.width);
  const best = fitting[0] ?? videos.sort((a, b) => a.width - b.width)[0];
  if (best) return best.url;

  for (const enclosure of list(item.enclosure)) {
    const url = attr(enclosure, "url");
    if (url && isPlayableVideo(url, attr(enclosure, "type"), null)) return url;
  }
  return null;
}

/**
 * Media RSS ratings, on the item, a media:group or a media:content:
 * <media:rating>adult</media:rating> (the default urn:simple scheme), or
 * the film and TV schemes' adult ratings.
 */
function ratedAdult(item: Node): boolean {
  const groups = list(item["media:group"]).filter(isNode);
  const media = [item, ...groups].flatMap((node) => list(node["media:content"]).filter(isNode));
  return [item, ...groups, ...media].some((node) =>
    list(node["media:rating"]).some((rating) => {
      const value = text(rating)?.toLowerCase();
      switch (attr(rating, "scheme") ?? "urn:simple") {
        case "urn:simple":
          return value === "adult";
        case "urn:mpaa":
          return value === "r" || value === "nc-17";
        case "urn:v-chip":
          return value === "tv-ma";
        default:
          return false;
      }
    }),
  );
}

function categoriesOf(item: Node): string[] {
  return list(item.category)
    .map((category) => attr(category, "label") ?? attr(category, "term") ?? text(category))
    .filter((value): value is string => Boolean(value));
}

function rssItem(item: Node): ParsedItem {
  const guid = item.guid;
  const guidIsLink = attr(guid, "isPermaLink") !== "false";
  const guidText = text(guid);
  return {
    title: text(item.title) ?? "",
    link: text(item.link) ?? (guidIsLink && guidText?.startsWith("http") ? guidText : null),
    published: text(item.pubDate) ?? text(item["dc:date"]) ?? text(item.published),
    description: text(item.description),
    content: text(item["content:encoded"]),
    imageUrl: declaredImage(item),
    videoUrl: declaredVideo(item),
    ratedAdult: ratedAdult(item),
    categories: [
      ...categoriesOf(item),
      ...list(item["dc:subject"])
        .map(text)
        .filter((value): value is string => Boolean(value)),
    ],
  };
}

function atomLink(entry: Node): string | null {
  const links = list(entry.link);
  const preferred =
    links.find((link) => {
      const rel = attr(link, "rel");
      return (!rel || rel === "alternate") && (attr(link, "type") ?? "text/html") === "text/html";
    }) ?? links.find((link) => !attr(link, "rel") || attr(link, "rel") === "alternate");
  return attr(preferred, "href") ?? text(preferred);
}

function atomEntry(entry: Node): ParsedItem {
  return {
    title: text(entry.title) ?? "",
    link: atomLink(entry),
    published: text(entry.published) ?? text(entry.updated) ?? text(entry["dc:date"]),
    description: text(entry.summary),
    content: text(entry.content),
    imageUrl: declaredImage(entry),
    videoUrl: declaredVideo(entry),
    ratedAdult: ratedAdult(entry),
    categories: categoriesOf(entry),
  };
}

/** Parses an RSS 2.0, RSS 1.0 (RDF) or Atom document. Throws if it is none of them. */
export function parseFeed(xml: string): ParsedFeed {
  const doc = parser.parse(xml) as Node;

  const rss = isNode(doc.rss) ? doc.rss : null;
  const channel = rss && isNode(rss.channel) ? rss.channel : null;
  if (channel) {
    return {
      format: "rss",
      title: text(channel.title),
      items: list(channel.item).filter(isNode).map(rssItem),
    };
  }

  const rdf = isNode(doc["rdf:RDF"]) ? doc["rdf:RDF"] : null;
  if (rdf) {
    const rdfChannel = isNode(rdf.channel) ? rdf.channel : null;
    return {
      format: "rdf",
      title: text(rdfChannel?.title),
      items: list(rdf.item).filter(isNode).map(rssItem),
    };
  }

  const feed = isNode(doc.feed) ? doc.feed : null;
  if (feed) {
    return {
      format: "atom",
      title: text(feed.title),
      items: list(feed.entry).filter(isNode).map(atomEntry),
    };
  }

  throw new Error("Not an RSS or Atom feed");
}
