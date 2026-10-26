import { describe, expect, it } from "vitest";
import { isPushEndpoint, isPushKey } from "./config";

describe("isPushEndpoint", () => {
  it("accepts the browsers' push services", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abc:APA91b",
      "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
      "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA",
      "https://web.push.apple.com/QGuQyavXutnMH",
    ]) {
      expect(isPushEndpoint(endpoint), endpoint).toBe(true);
    }
  });

  it("refuses anything else", () => {
    for (const endpoint of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com.evil.example/x",
      "https://evilfcm.googleapis.com/x",
      "https://fcm.googleapis.com:8443/x",
      "https://user@fcm.googleapis.com/x",
      "https://localhost/push",
      "https://169.254.169.254/latest",
      "not a url",
      42,
      `https://fcm.googleapis.com/${"a".repeat(2100)}`,
    ]) {
      expect(isPushEndpoint(endpoint), String(endpoint).slice(0, 60)).toBe(false);
    }
  });
});

describe("isPushKey", () => {
  it("accepts base64url keys and nothing else", () => {
    expect(isPushKey("BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM")).toBe(true);
    expect(isPushKey("tBHItJI5svbpez7KI4CCXg")).toBe(true);
    expect(isPushKey("short")).toBe(false);
    expect(isPushKey("has spaces and stuff!!")).toBe(false);
    expect(isPushKey(null)).toBe(false);
  });
});
