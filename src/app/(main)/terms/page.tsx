import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <ProsePage title="Terms of Service" updated="October 14, 2026">
      <p>
        This is placeholder text for {site.name}&apos;s Terms of Service. Replace it with terms
        reviewed by your legal counsel before launch.
      </p>
      <h3>Using {site.name}</h3>
      <p>
        You may use {site.name} to read, share and discuss news. You are responsible for the
        content you post, including replies, and for keeping your account secure.
      </p>
      <h3>Content</h3>
      <p>
        Stories belong to their publishers. {site.name} links to and summarizes their reporting;
        follow the link on each story to read it at the source.
      </p>
      <h3>Community rules</h3>
      <ul>
        <li>No harassment, hate speech or threats.</li>
        <li>No spam, impersonation or misleading manipulated media.</li>
        <li>Respect copyright and other people&apos;s privacy.</li>
      </ul>
    </ProsePage>
  );
}
