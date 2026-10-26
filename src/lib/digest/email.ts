import { categoryName } from "@/lib/categories";
import type { Article } from "@/lib/types";

/*
 * The weekly digest email: the week's most-read stories, as HTML and plain
 * text. Pure, so tests can check it without sending anything.
 */

export interface DigestContent {
  /** The reader's display name. */
  name: string;
  stories: Article[];
  siteName: string;
  siteUrl: string;
  /** Page where the reader confirms they want no more digests. */
  unsubscribeUrl: string;
}

export interface DigestEmail {
  subject: string;
  html: string;
  text: string;
}

const SUMMARY_LENGTH = 180;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clip(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

export function buildDigestEmail({ name, stories, siteName, siteUrl, unsubscribeUrl }: DigestContent): DigestEmail {
  const link = (path: string) => new URL(path, siteUrl).toString();
  const lead = stories[0]?.title ?? "the week's most-read stories";
  const subject = clip(`${siteName} this week: ${lead}`, 120);
  const greeting = name ? `Hi ${name},` : "Hi,";
  const intro = `Here are the ${stories.length === 1 ? "story" : `${stories.length} stories`} people read most on ${siteName} this week.`;
  const settingsUrl = link("/settings#notifications");

  const items = stories.map((story, index) => {
    const url = link(`/article/${story.slug}`);
    const meta = `${story.source.name} · ${categoryName(story.category)}`;
    const summary = clip(story.summary, SUMMARY_LENGTH);
    return {
      text: `${index + 1}. ${story.title}\n   ${meta}\n   ${url}`,
      html: `
        <tr><td style="padding:16px 0;border-top:1px solid #e5e7eb">
          <div style="font-size:13px;color:#6b7280">${index + 1} · ${escapeHtml(meta)}</div>
          <a href="${escapeHtml(url)}" style="display:block;margin-top:4px;font-size:18px;line-height:24px;font-weight:700;color:#0f1419;text-decoration:none">${escapeHtml(story.title)}</a>
          ${summary ? `<div style="margin-top:6px;font-size:15px;line-height:21px;color:#374151">${escapeHtml(summary)}</div>` : ""}
        </td></tr>`,
    };
  });

  const text = [
    greeting,
    "",
    intro,
    "",
    ...items.map((item) => `${item.text}\n`),
    `Read more on ${siteName}: ${link("/")}`,
    "",
    `You're getting this because the weekly digest is on in your ${siteName} settings.`,
    `Stop these emails: ${unsubscribeUrl}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#000000;padding:20px 24px;color:#ffffff;font-size:22px;font-weight:800">${escapeHtml(siteName)}</td></tr>
        <tr><td style="padding:24px 24px 8px;color:#0f1419;font-size:15px;line-height:22px">
          <p style="margin:0 0 8px">${escapeHtml(greeting)}</p>
          <p style="margin:0">${escapeHtml(intro)}</p>
        </td></tr>
        <tr><td style="padding:0 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map((item) => item.html).join("")}
          </table>
        </td></tr>
        <tr><td style="padding:8px 24px 24px">
          <a href="${escapeHtml(link("/"))}" style="display:inline-block;background:#1d9bf0;color:#ffffff;font-weight:700;font-size:15px;padding:10px 20px;border-radius:9999px;text-decoration:none">Read more on ${escapeHtml(siteName)}</a>
        </td></tr>
      </table>
      <p style="max-width:600px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:18px">
        You're getting this because the weekly digest is on in your ${escapeHtml(siteName)} settings.
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a> ·
        <a href="${escapeHtml(settingsUrl)}" style="color:#6b7280">Settings</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
