import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ProsePage title={`About ${site.name}`}>
      <p>
        {site.name} is a real-time news feed. It brings breaking stories, trending topics and the
        publishers you trust into one fast, distraction-free timeline.
      </p>
      <h3>How the feed works</h3>
      <ul>
        <li>
          <strong>For you</strong> shows the latest stories from every source, with breaking news
          pinned to the top.
        </li>
        <li>
          <strong>Following</strong> shows only the publishers you follow, newest first.
        </li>
        <li>
          <strong>Topics</strong> let you tune what you see, from Technology to Climate.
        </li>
      </ul>
      <h3>Join the conversation</h3>
      <p>
        Every story has its own thread. Like, repost, bookmark and reply — your activity stays
        attached to your account.
      </p>
      <p>
        Ready to start? <Link href="/" className="text-accent hover:underline">Open your feed</Link>{" "}
        or <Link href="/topics" className="text-accent hover:underline">pick some topics</Link>.
      </p>
    </ProsePage>
  );
}
