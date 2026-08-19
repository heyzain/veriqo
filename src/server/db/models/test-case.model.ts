import "server-only";

import mongoose, { Schema } from "mongoose";

import type { TestCase } from "@/types/domain";
import { testCaseSnapshotSchema } from "./_shared";

const testCaseSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    publicId: { type: String, required: true },
    projectId: { type: String, required: true },
    featureId: { type: String, required: true },
    title: { type: String, required: true },
    status: { type: String, required: true },
    priority: { type: String, required: true },
    preconditions: { type: String },
    steps: { type: [String], default: [] },
    expectedResult: { type: String, required: true },
    roles: { type: [String], default: [] },
    environments: { type: [String], default: [] },
    possibleDuplicateOfId: { type: String },
    previousSnapshot: { type: testCaseSnapshotSchema },
    createdBySource: { type: String, required: true },
    promptId: { type: String },
    promptVersion: { type: Number },
    idempotencyKey: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false },
);

export type TestCaseDoc = mongoose.InferSchemaType<typeof testCaseSchema>;

export const TestCaseModel =
  (mongoose.models.TestCase as mongoose.Model<TestCaseDoc> | undefined) ??
  mongoose.model<TestCaseDoc>("TestCase", testCaseSchema);

export function toTestCase(doc: TestCaseDoc): TestCase {
  return {
    id: doc.id,
    publicId: doc.publicId,
    projectId: doc.projectId,
    featureId: doc.featureId,
    title: doc.title,
    status: doc.status as TestCase["status"],
    priority: doc.priority as TestCase["priority"],
    preconditions: doc.preconditions ?? undefined,
    steps: doc.steps,
    expectedResult: doc.expectedResult,
    roles: doc.roles,
    environments: doc.environments,
    possibleDuplicateOfId: doc.possibleDuplicateOfId ?? undefined,
    previousSnapshot: doc.previousSnapshot
      ? {
          title: doc.previousSnapshot.title,
          steps: doc.previousSnapshot.steps,
          expectedResult: doc.previousSnapshot.expectedResult,
          priority: doc.previousSnapshot.priority as TestCase["priority"],
        }
      : undefined,
    createdBySource: doc.createdBySource as TestCase["createdBySource"],
    promptId: doc.promptId ?? undefined,
    promptVersion: doc.promptVersion ?? undefined,
    idempotencyKey: doc.idempotencyKey ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
