import { beforeEach, describe, expect, it, vi } from "vitest";
import { engagementLists, type AccountActivity, type ActivityItem, type EngagementList } from "@/lib/activity";
import { defaultSettings } from "@/lib/settings";

// The stores as they run with Supabase, before and after <ActivitySync> loads the account.

const actions = vi.hoisted(() => ({
  setActivity: vi.fn(async () => ({ ok: true as const, at: Date.now() })),
  clearBookmarks: vi.fn(async () => ({ ok: true as const, at: Date.now() })),
  saveSettings: vi.fn(async () => ({ ok: true as const, at: Date.now() })),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/activity", () => actions);
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("./toast", () => ({ toast }));

function ready(lists: Partial<Record<EngagementList, string[]>> = {}): AccountActivity {
  const items = (ids: string[] = []): ActivityItem[] => ids.map((id) => ({ id, at: "2026-10-01T00:00:00Z" }));
  return {
    status: "ready",
    userId: "reader",
    lists: Object.fromEntries(engagementLists.map((list) => [list, items(lists[list])])) as Record<
      EngagementList,
      ActivityItem[]
    >,
    settings: defaultSettings,
    unreadNotifications: 0,
  };
}

// Each test starts with a page that has just loaded.
let engagement: typeof import("./engagement");
let settings: typeof import("./settings");
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  engagement = await import("./engagement");
  settings = await import("./settings");
});

describe("likes and follows while the account loads", () => {
  it("show at once and are saved once it has", () => {
    expect(engagement.toggleEngagement("liked", "story")).toBe(true);
    expect(engagement.getEngagement().liked).toEqual(["story"]);
    expect(actions.setActivity).not.toHaveBeenCalled();

    engagement.hydrateEngagement(ready());
    expect(engagement.getEngagement().liked).toEqual(["story"]);
    expect(actions.setActivity).toHaveBeenCalledExactlyOnceWith("liked", "story", true);
  });

  it("aren't saved again when the account already had them", () => {
    engagement.toggleEngagement("following", "source");
    engagement.hydrateEngagement(ready({ following: ["source", "other"] }));
    expect(engagement.getEngagement().following).toEqual(["source", "other"]);
    expect(actions.setActivity).not.toHaveBeenCalled();
  });

  it("are forgotten when switched off again before it loads", () => {
    engagement.toggleEngagement("liked", "story");
    engagement.toggleEngagement("liked", "story");
    expect(engagement.getEngagement().liked).toEqual([]);
    engagement.hydrateEngagement(ready());
    expect(actions.setActivity).not.toHaveBeenCalled();
  });

  it("ask a signed-out reader to sign in, and are undone", () => {
    engagement.toggleEngagement("reposted", "story");
    engagement.hydrateEngagement({ status: "signed-out" });
    expect(engagement.getEngagement().reposted).toEqual([]);
    expect(toast).toHaveBeenCalledWith("Sign in to repost stories", { label: "Sign in", href: "/login" });
    expect(actions.setActivity).not.toHaveBeenCalled();
  });
});

describe("settings changed while the account loads", () => {
  it("show at once and are saved to the account once it has", () => {
    settings.updateSetting("showImages", false);
    expect(settings.getSettings().showImages).toBe(false);
    expect(actions.saveSettings).not.toHaveBeenCalled();

    settings.hydrateSettings(ready());
    expect(settings.getSettings().showImages).toBe(false);
    expect(actions.saveSettings).toHaveBeenCalledExactlyOnceWith({ showImages: false });
  });

  it("stay in the browser for a signed-out reader", () => {
    settings.updateSetting("showImages", false);
    settings.hydrateSettings({ status: "signed-out" });
    expect(settings.getSettings().showImages).toBe(false);
    expect(actions.saveSettings).not.toHaveBeenCalled();
  });
});
