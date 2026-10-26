import { getAccountActivity } from "@/lib/data/activity";
import { ActivityHydrator } from "./activity-hydrator";

/**
 * Loads the signed-in reader's likes, bookmarks, follows and settings into
 * the client stores. Renders nothing; reads cookies, so keep it in <Suspense>.
 */
export async function ActivitySync() {
  const activity = await getAccountActivity();
  return activity ? <ActivityHydrator activity={activity} /> : null;
}
