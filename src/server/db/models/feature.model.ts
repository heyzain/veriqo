import "server-only";

import mongoose, { Schema } from "mongoose";

import type { Feature } from "@/types/domain";
import { featureSnapshotSchema, featureSourceReferenceSchema } from "./_shared";

const featureSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    publicId: { type: String, required: true },
    projectId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, required: true },
    risk: { type: String, required: true },
    acceptanceCriteria: { type: [String], default: [] },
    roles: { type: [String], default: [] },
    dependencies: { type: [String], default: [] },
    sourceReferences: { type: [featureSourceReferenceSchema], default: [] },
    possibleDuplicateOfId: { type: String },
    previousSnapshot: { type: featureSnapshotSchema },
    createdBySource: { type: String, required: true },
    promptId: { type: String },
    promptVersion: { type: Number },
    idempotencyKey: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false },
);

export type FeatureDoc = mongoose.InferSchemaType<typeof featureSchema>;

export const FeatureModel =
  (mongoose.models.Feature as mongoose.Model<FeatureDoc> | undefined) ??
  mongoose.model<FeatureDoc>("Feature", featureSchema);

export function toFeature(doc: FeatureDoc): Feature {
  return {
    id: doc.id,
    publicId: doc.publicId,
    projectId: doc.projectId,
    name: doc.name,
    description: doc.description,
    status: doc.status as Feature["status"],
    risk: doc.risk as Feature["risk"],
    acceptanceCriteria: doc.acceptanceCriteria,
    roles: doc.roles,
    dependencies: doc.dependencies,
    sourceReferences: doc.sourceReferences.map((ref) => ({ path: ref.path, note: ref.note ?? undefined })),
    possibleDuplicateOfId: doc.possibleDuplicateOfId ?? undefined,
    previousSnapshot: doc.previousSnapshot
      ? {
          name: doc.previousSnapshot.name,
          description: doc.previousSnapshot.description,
          risk: doc.previousSnapshot.risk as Feature["risk"],
          acceptanceCriteria: doc.previousSnapshot.acceptanceCriteria,
        }
      : undefined,
    createdBySource: doc.createdBySource as Feature["createdBySource"],
    promptId: doc.promptId ?? undefined,
    promptVersion: doc.promptVersion ?? undefined,
    idempotencyKey: doc.idempotencyKey ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
