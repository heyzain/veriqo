import "server-only";

import mongoose, { Schema } from "mongoose";

import type { TestRun } from "@/types/domain";

const testRunSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    publicId: { type: String, required: true },
    projectId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, required: true },
    build: { type: String, required: true },
    environment: { type: String, required: true },
    browser: { type: String, required: true },
    assigneeName: { type: String },
    notes: { type: String },
    executionMode: { type: String, required: true },
    selectedTestCaseIds: { type: [String], default: [] },
    createdBySource: { type: String, required: true },
    createdByName: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    startedAt: { type: String },
    completedAt: { type: String },
  },
  { versionKey: false },
);

export type TestRunDoc = mongoose.InferSchemaType<typeof testRunSchema>;

export const TestRunModel =
  (mongoose.models.TestRun as mongoose.Model<TestRunDoc> | undefined) ??
  mongoose.model<TestRunDoc>("TestRun", testRunSchema);

export function toTestRun(doc: TestRunDoc): TestRun {
  return {
    id: doc.id,
    publicId: doc.publicId,
    projectId: doc.projectId,
    name: doc.name,
    status: doc.status as TestRun["status"],
    build: doc.build,
    environment: doc.environment,
    browser: doc.browser,
    assigneeName: doc.assigneeName ?? undefined,
    notes: doc.notes ?? undefined,
    executionMode: doc.executionMode as TestRun["executionMode"],
    selectedTestCaseIds: doc.selectedTestCaseIds,
    createdBySource: doc.createdBySource as TestRun["createdBySource"],
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    startedAt: doc.startedAt ?? undefined,
    completedAt: doc.completedAt ?? undefined,
  };
}
