import { describe, expect, it } from "vitest";
import { countAdjustment, isUuid, type ActivityChange } from "./activity";

const at = (time: string) => Date.parse(`2026-10-24T${time}Z`);
const counted = (time: string) => `2026-10-24T${time}.000Z`;

describe("countAdjustment", () => {
  it("adds the reader to demo counts, which never include them", () => {
    expect(countAdjustment(true, undefined, undefined)).toBe(1);
    expect(countAdjustment(false, undefined, undefined)).toBe(0);
  });

  it("leaves counts alone when nothing changed", () => {
    expect(countAdjustment(false, undefined, counted("12:00:00"))).toBe(0);
  });

  it("does not count a like twice once the count includes it", () => {
    const changes: ActivityChange[] = [{ on: true, at: at("11:00:00") }];
    expect(countAdjustment(true, changes, counted("12:00:00"))).toBe(0);
  });

  it("adds a like made after the count was read", () => {
    const changes: ActivityChange[] = [{ on: true, at: at("12:30:00") }];
    expect(countAdjustment(true, changes, counted("12:00:00"))).toBe(1);
  });

  it("adds a like that is still being saved", () => {
    expect(countAdjustment(true, [{ on: true, at: null }], counted("12:00:00"))).toBe(1);
  });

  it("removes an unlike made after the count was read", () => {
    const changes: ActivityChange[] = [
      { on: true, at: at("11:00:00") },
      { on: false, at: at("12:30:00") },
    ];
    expect(countAdjustment(false, changes, counted("12:00:00"))).toBe(-1);
  });

  it("ignores a like and unlike that both happened after the count", () => {
    const changes: ActivityChange[] = [
      { on: true, at: at("12:10:00") },
      { on: false, at: at("12:20:00") },
    ];
    expect(countAdjustment(false, changes, counted("12:00:00"))).toBe(0);
  });

  it("nets out an unlike and like again after the count", () => {
    const changes: ActivityChange[] = [
      { on: true, at: at("11:00:00") },
      { on: false, at: at("12:10:00") },
      { on: true, at: null },
    ];
    expect(countAdjustment(true, changes, counted("12:00:00"))).toBe(0);
  });

  it("compares database timestamps with microseconds and offsets", () => {
    const changes: ActivityChange[] = [{ on: true, at: Date.parse("2026-10-24T12:00:00.000500+00:00") }];
    expect(countAdjustment(true, changes, "2026-10-24T12:00:00.001Z")).toBe(0);
  });
});

describe("isUuid", () => {
  it("accepts uuids and rejects anything else", () => {
    expect(isUuid("c47e7cbf-7f22-4681-a95d-88a555bd2b3a")).toBe(true);
    expect(isUuid("art-001")).toBe(false);
    expect(isUuid("c47e7cbf-7f22-4681-a95d-88a555bd2b3a' or 1=1")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});
