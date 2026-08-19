import "server-only";

import { dbConnect } from "@/server/db/connection";
import { ActivityModel, toActivityEvent } from "@/server/db/models/activity.model";
import type { ActivityEvent } from "@/types/domain";

/**
 * Structured activity events (04-CONFIG-BLUEPRINT.md, "Activity event
 * contract"). Phase 1 has no activity-timeline UI yet (that's Phase 2/9) —
 * this exists so account/project actions still honor the product invariant
 * "every important action creates an activity event" from day one.
 */
export async function recordActivity(event: ActivityEvent): Promise<void> {
  await dbConnect();
  await ActivityModel.create({
    id: event.id,
    projectId: event.projectId,
    actorType: event.actorType,
    actorName: event.actorName,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    relatedEntities: event.relatedEntities
      ? event.relatedEntities.map((related) => ({ type: related.type, id: related.id }))
      : undefined,
    metadata: event.metadata,
    createdAt: event.createdAt,
  });
}

export async function listActivityForProject(projectId: string): Promise<ActivityEvent[]> {
  await dbConnect();
  const docs = await ActivityModel.find({ projectId }).sort({ createdAt: -1 }).lean();
  return docs.map(toActivityEvent);
}

/** Part of `account-service.deleteAccount`'s cascade — removes every event for one project. */
export async function deleteActivityForProject(projectId: string): Promise<void> {
  await dbConnect();
  await ActivityModel.deleteMany({ projectId });
}
