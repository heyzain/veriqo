import "server-only";

import mongoose, { Schema } from "mongoose";

import type { Project } from "@/types/domain";

const projectSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    publicId: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    appUrl: { type: String, required: true },
    environment: { type: String, required: true },
    repository: { type: String },
    archived: { type: Boolean, required: true, default: false },
    setupStepsCompleted: { type: Number, required: true, default: 0 },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

export type ProjectDoc = mongoose.InferSchemaType<typeof projectSchema>;

export const ProjectModel =
  (mongoose.models.Project as mongoose.Model<ProjectDoc> | undefined) ??
  mongoose.model<ProjectDoc>("Project", projectSchema);

export function toProject(doc: ProjectDoc): Project {
  return {
    id: doc.id,
    publicId: doc.publicId,
    slug: doc.slug,
    ownerId: doc.ownerId,
    name: doc.name,
    description: doc.description,
    appUrl: doc.appUrl,
    environment: doc.environment as Project["environment"],
    repository: doc.repository ?? undefined,
    archived: doc.archived,
    setupStepsCompleted: doc.setupStepsCompleted,
    createdAt: doc.createdAt,
  };
}
