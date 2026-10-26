import { describe, expect, it } from "vitest";
import { actorPhrase, matchesFilter, toAppNotification, toPushMessage, type NotificationJson } from "./notifications";

const at = "2026-10-26T09:00:00.123456+00:00";
const person = (handle: string, name: string) => ({ handle, display_name: name, avatar_url: null });

function row(overrides: Partial<NotificationJson>): NotificationJson {
  return {
    id: "6f7c6c1e-8c5e-4d47-9a39-1f0a7b6d2c11",
    kind: "reply",
    created_at: at,
    updated_at: at,
    unread: true,
    actors_count: 1,
    actors: [person("avachen", "Ava Chen")],
    comment: { id: "c1", body: "Good point" },
    article: { slug: "solar-record", title: "Solar sets a record" },
    source: null,
    ...overrides,
  };
}

describe("actorPhrase", () => {
  it("names one or two people and counts the rest", () => {
    expect(actorPhrase(["Ava"], 1)).toBe("Ava");
    expect(actorPhrase(["Ava", "Ben"], 2)).toBe("Ava and Ben");
    expect(actorPhrase(["Ava", "Ben", "Cy"], 3)).toBe("Ava and 2 others");
    expect(actorPhrase(["Ava", "Ben"], 2_000)).toBe("Ava and 1999 others");
    expect(actorPhrase(["Ava"], 2)).toBe("Ava and 1 other");
  });
});

describe("toAppNotification", () => {
  it("words replies and mentions with the comment as preview, linking to it", () => {
    expect(toAppNotification(row({}))).toMatchObject({
      text: "Ava Chen replied to you",
      preview: "Good point",
      href: "/article/solar-record#comment-c1",
      updatedAt: at,
    });
    expect(toAppNotification(row({ kind: "mention" }))?.text).toBe("Ava Chen mentioned you");
  });

  it("groups likes and follows with exact counts", () => {
    const likes = row({
      kind: "like",
      actors_count: 25,
      actors: [person("priya", "Priya N."), person("sam", "Sam"), person("ava", "Ava")],
    });
    expect(toAppNotification(likes)).toMatchObject({ text: "Priya N. and 24 others liked your reply", actorsCount: 25 });

    const one = row({ kind: "follow", comment: null, article: null });
    expect(toAppNotification(one)).toMatchObject({ text: "Ava Chen followed you", href: "/user/avachen", preview: null });
    const two = row({ kind: "follow", comment: null, article: null, actors_count: 2, actors: [person("a", "Ann"), person("b", "Bo")] });
    expect(toAppNotification(two)).toMatchObject({ text: "Ann and Bo followed you", href: "/profile" });
  });

  it("shows breaking news from its source", () => {
    const breaking = toAppNotification(
      row({
        kind: "breaking",
        actors_count: 0,
        actors: [],
        comment: null,
        source: { handle: "dispatch", name: "Pulse Dispatch", color: "#1d9bf0", logo_url: null },
      }),
    );
    expect(breaking).toMatchObject({ text: "Breaking: Solar sets a record", href: "/article/solar-record", actorsCount: 1 });
    expect(breaking?.actors[0]).toMatchObject({ type: "source", name: "Pulse Dispatch" });
  });

  it("drops rows with nothing left to show", () => {
    expect(toAppNotification(row({ comment: null }))).toBeNull();
    expect(toAppNotification(row({ kind: "like", actors_count: 0, actors: [] }))).toBeNull();
    expect(toAppNotification(row({ kind: "breaking", source: null }))).toBeNull();
  });
});

describe("toPushMessage", () => {
  it("puts the words in the title and the text in the body", () => {
    const message = toPushMessage(toAppNotification(row({ comment: { id: "c1", body: "x".repeat(400) } }))!);
    expect(message.title).toBe("Ava Chen replied to you");
    expect(message.body).toHaveLength(180);
    expect(message.body.endsWith("…")).toBe(true);
    expect(message).toMatchObject({ url: "/article/solar-record#comment-c1", tag: row({}).id });
  });

  it("names the source of breaking news", () => {
    const breaking = toAppNotification(
      row({ kind: "breaking", actors: [], comment: null, source: { handle: "d", name: "Dispatch", color: "#000", logo_url: null } }),
    )!;
    expect(toPushMessage(breaking)).toMatchObject({ title: "Breaking · Dispatch", body: "Solar sets a record" });
  });
});

describe("matchesFilter", () => {
  it("puts replies and mentions under Mentions", () => {
    expect(matchesFilter("mentions", "reply")).toBe(true);
    expect(matchesFilter("mentions", "like")).toBe(false);
    expect(matchesFilter("breaking", "breaking")).toBe(true);
    expect(matchesFilter("all", "follow")).toBe(true);
  });
});
