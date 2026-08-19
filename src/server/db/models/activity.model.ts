import "server-only";

import mongoose, { Schema } from "mongoose";

import type { ActivityEvent } from "@/types/domain";
import { relatedEntitySchema } from "./_shared";

const activitySchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    projectId: { type: String, required: true },
    actorType: { type: String, required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    relatedEntities: { type: [relatedEntitySchema] },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

export type ActivityDoc = mongoose.InferSchemaType<typeof activitySchema>;

export const ActivityModel =
  (mongoose.models.Activity as mongoose.Model<ActivityDoc> | undefined) ??
  mongoose.model<ActivityDoc>("Activity", activitySchema);

export function toActivityEvent(doc: ActivityDoc): ActivityEvent {
  return {
    id: doc.id,
    projectId: doc.projectId,
    actorType: doc.actorType as ActivityEvent["actorType"],
    actorName: doc.actorName,
    action: doc.action,
    entityType: doc.entityType,
    entityId: doc.entityId,
    relatedEntities: doc.relatedEntities ?? undefined,
    metadata: (doc.metadata as Record<string, unknown> | undefined) ?? undefined,
    createdAt: doc.createdAt,
  };
}
