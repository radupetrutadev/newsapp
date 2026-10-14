import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy" updated="October 14, 2026">
      <p>
        This is placeholder text for {site.name}&apos;s Privacy Policy. Replace it with a policy
        that reflects how you actually collect and process data before launch.
      </p>
      <h3>What we collect</h3>
      <ul>
        <li>Account details you give us: name, username and email address.</li>
        <li>Activity such as likes, reposts, bookmarks, follows and replies.</li>
        <li>Basic technical data needed to keep the service running and secure.</li>
      </ul>
      <h3>How we use it</h3>
      <p>
        To run your account, personalize your feed and keep {site.name} safe. We do not sell your
        personal data.
      </p>
      <h3>Your choices</h3>
      <p>
        You can change notification and feed preferences in Settings, and ask us to export or
        delete your data at any time.
      </p>
    </ProsePage>
  );
}
