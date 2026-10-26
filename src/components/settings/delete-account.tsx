"use client";

import { Trash2 } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { deleteAccount } from "@/lib/actions/account";
import { turnOffPush } from "@/lib/push/browser";

/** "Delete account", with a dialog that asks for the reader's username first. */
export function DeleteAccount({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [state, dispatch, pending] = useActionState(deleteAccount, {});
  const close = () => {
    setOpen(false);
    setConfirmation("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left text-[15px] text-live transition-colors hover:bg-live/10"
      >
        <Trash2 className="size-5" /> Delete account
      </button>
      <Dialog
        open={open}
        onClose={close}
        title="Delete your account?"
        description={
          <>
            This permanently deletes your profile, photo, replies, likes, bookmarks, follows and settings. Replies
            other people answered stay in their threads, without your name. This can&apos;t be undone.
          </>
        }
      >
        <form
          action={async (formData) => {
            // This browser shouldn't keep a push subscription for an account that's gone.
            await turnOffPush().catch(() => {});
            startTransition(() => dispatch(formData));
          }}
          className="mt-5 space-y-3"
        >
          <label className="block text-[15px]">
            Type <strong className="font-bold">{handle}</strong> to confirm.
            <input
              name="confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label={`Type ${handle} to confirm`}
              className="mt-2 h-11 w-full rounded-md border border-[#333639] bg-transparent px-3 text-[17px] outline-none focus:border-live focus:ring-1 focus:ring-live"
            />
          </label>
          {state.error ? (
            <p role="alert" className="rounded-md border border-live/40 bg-live/10 px-3 py-2 text-[14px] text-[#ff6b75]">
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              variant="destructive"
              size="lg"
              disabled={pending || confirmation.trim().replace(/^@/, "").toLowerCase() !== handle}
            >
              {pending ? "Deleting…" : "Delete account"}
            </Button>
            <Button variant="outline" size="lg" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
