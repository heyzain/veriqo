import "server-only";

import { store } from "@/server/repositories/store";
import type { ActivityEvent } from "@/types/domain";

/**
 * Structured activity events (04-CONFIG-BLUEPRINT.md, "Activity event
 * contract"). Phase 1 has no activity-timeline UI yet (that's Phase 2/9) —
 * this exists so account/project actions still honor the product invariant
 * "every important action creates an activity event" from day one.
 */
export function recordActivity(event: ActivityEvent): void {
  store.activity.push(event);
}

export function listActivityForProject(projectId: string): ActivityEvent[] {
  return store.activity
    .filter((event) => event.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
