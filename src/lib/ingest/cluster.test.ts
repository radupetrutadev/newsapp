import { describe, expect, it } from "vitest";
import { labeledStories } from "./__fixtures__/clusters";
import { assignClusters, CLUSTER_GAP_HOURS, terms, type ClusterAssignment, type ClusterInput } from "./cluster";
import { NOW } from "./test-helpers";

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

function story(id: string, title: string, summary = "", hours = 1, clusterId: string | null = null): ClusterInput {
  return { id, title, summary, tags: [], publishedAt: hoursAgo(hours), clusterId };
}

/** Pairwise precision and recall of a clustering against the labels. */
function score(stories: (ClusterInput & { event: string })[], assignments: ClusterAssignment[]) {
  const clusterOf = new Map<string, number>();
  assignments.forEach((assignment, index) => assignment.articleIds.forEach((id) => clusterOf.set(id, index)));
  let together = 0;
  let correct = 0;
  let related = 0;
  for (let i = 0; i < stories.length; i++) {
    for (let j = i + 1; j < stories.length; j++) {
      const same = stories[i].event === stories[j].event;
      const cluster = clusterOf.get(stories[i].id);
      const joined = cluster !== undefined && cluster === clusterOf.get(stories[j].id);
      if (joined) together++;
      if (same) related++;
      if (joined && same) correct++;
    }
  }
  return { precision: correct / together, recall: correct / related };
}

describe("terms", () => {
  it("keeps the words and figures that tell stories apart, singular", () => {
    expect(terms("The Fed's policies: rates hold at 4.5% for 40,000 homes")).toEqual([
      "fed",
      "policy",
      "rate",
      "hold",
      "4_5",
      "40000",
      "home",
    ]);
  });

  it("folds accents and drops news filler", () => {
    expect(terms("LIVE: Zürich café reopens, officials say")).toEqual(["zurich", "cafe", "reopen", "official"]);
  });
});

describe("assignClusters", () => {
  const labeled = labeledStories.map((item, index) => ({
    id: `story-${index}`,
    title: item.title,
    summary: item.summary,
    tags: item.tags ?? [],
    publishedAt: hoursAgo(item.hoursAgo),
    clusterId: null,
    event: item.event,
  }));

  it("groups the labeled stories by event without merging look-alikes", () => {
    const { precision, recall } = score(labeled, assignClusters(labeled));
    // Every pair it puts together belongs together, and it finds almost all of them.
    expect(precision).toBe(1);
    expect(recall).toBeGreaterThanOrEqual(0.9);
  });

  it("changes nothing when run again on its own result", () => {
    const assignments = assignClusters(labeled);
    const clusterOf = new Map<string, string>();
    assignments.forEach((assignment, index) =>
      assignment.articleIds.forEach((id) => clusterOf.set(id, `cluster-${index}`)),
    );
    const stored = labeled.map((item) => ({ ...item, clusterId: clusterOf.get(item.id) ?? null }));
    expect(assignClusters(stored)).toEqual([]);
  });

  it("adds a new story to the cluster that already covers its event", () => {
    const assignments = assignClusters([
      story("a", "Magnitude 7.1 earthquake strikes off Japan's Miyagi coast", "", 5, "quake"),
      story("b", "Japan lifts tsunami advisory after 7.1 quake off Miyagi", "", 4, "quake"),
      story("c", "Apple unveils iPhone 18 with a faster A20 chip", "", 3),
      story("d", "Miyagi quake: bullet trains resume after the magnitude 7.1 tremor", "", 1),
    ]);
    expect(assignments).toEqual([{ clusterId: "quake", articleIds: ["d"] }]);
  });

  it("pairs a new story with an earlier one that had no match yet", () => {
    const assignments = assignClusters([
      story("old", "Paramount and Warner Bros. Discovery agree to a $40 billion merger", "", 3),
      story("other", "Netflix raises prices in the US and Canada", "", 2),
      story("new", "Warner Bros. Discovery to combine with Paramount in $40 billion deal", "", 1),
    ]);
    expect(assignments).toEqual([{ clusterId: null, articleIds: ["old", "new"] }]);
  });

  it("doesn't join stories published far apart", () => {
    const title = "Air France pilots strike over pay, cancelling 1,200 flights";
    expect(assignClusters([story("a", title, "", CLUSTER_GAP_HOURS + 3), story("b", title, "", 1)])).toEqual([]);
  });

  it("leaves stories with nothing in common alone", () => {
    expect(
      assignClusters([
        story("a", "FDA approves the first daily pill for peanut allergy"),
        story("b", "Arsenal clinch the Premier League title"),
      ]),
    ).toEqual([]);
  });
});
