import { describe, expect, it } from "vitest";
import { photoType } from "./profile";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((value) => (typeof value === "string" ? [...value].map((c) => c.charCodeAt(0)) : [value])));

describe("photoType", () => {
  it("recognizes JPEG, PNG and WebP from their first bytes", () => {
    expect(photoType(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe("image/jpeg");
    expect(photoType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe("image/png");
    expect(photoType(bytes("RIFF", 1, 2, 3, 4, "WEBPVP8 "))?.mime).toBe("image/webp");
  });

  it("rejects anything else, whatever it claims to be", () => {
    expect(photoType(bytes("<svg xmlns"))).toBeNull();
    expect(photoType(bytes("GIF89a"))).toBeNull();
    expect(photoType(bytes("RIFF", 1, 2, 3, 4, "WAVE"))).toBeNull();
    expect(photoType(new Uint8Array())).toBeNull();
  });
});
