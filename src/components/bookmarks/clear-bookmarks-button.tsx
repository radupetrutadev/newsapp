"use client";

import { Trash2 } from "lucide-react";
import { iconButton } from "@/components/layout/page-header";
import { clearEngagement, useEngagement } from "@/lib/store/engagement";
import { toast } from "@/lib/store/toast";

export function ClearBookmarksButton() {
  const { bookmarked } = useEngagement();
  if (bookmarked.length === 0) return null;

  return (
    <button
      type="button"
      aria-label="Clear all bookmarks"
      title="Clear all bookmarks"
      onClick={() => {
        if (!window.confirm("Clear all bookmarks? This can't be undone.")) return;
        clearEngagement("bookmarked");
        toast("All bookmarks cleared");
      }}
      className={`${iconButton} hover:text-live`}
    >
      <Trash2 className="size-5" />
    </button>
  );
}
