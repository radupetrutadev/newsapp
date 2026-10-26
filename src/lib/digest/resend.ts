import "server-only";
import type { SendBatch } from "./run";

/*
 * Sends digest emails with Resend (resend.com). RESEND_API_KEY is a
 * server-only secret; DIGEST_FROM is the sender, e.g.
 * "Pulse <digest@yourdomain.com>", on a domain verified in Resend.
 */

const apiKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.DIGEST_FROM ?? "";

export function isEmailConfigured(): boolean {
  return apiKey.length > 0 && from.length > 0;
}

export function createResendSender(): SendBatch {
  return async (emails) => {
    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        emails.map((email) => ({
          from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: email.headers,
        })),
      ),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`Resend answered HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
  };
}
