import "server-only";

import mongoose, { Schema } from "mongoose";

import type { TestResult } from "@/types/domain";
import { testEvidenceSchema } from "./_shared";

const testResultSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    testRunId: { type: String, required: true },
    testCaseId: { type: String, required: true },
    status: { type: String, required: true },
    actualResult: { type: String },
    evidence: { type: [testEvidenceSchema], default: [] },
    recordedBySource: { type: String, required: true },
    recordedByName: { type: String },
    recordedAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    needsHumanReview: { type: Boolean },
    reviewedBySource: { type: String },
    reviewedByName: { type: String },
    reviewedAt: { type: String },
    idempotencyKey: { type: String },
  },
  { versionKey: false },
);

export type TestResultDoc = mongoose.InferSchemaType<typeof testResultSchema>;

export const TestResultModel =
  (mongoose.models.TestResult as mongoose.Model<TestResultDoc> | undefined) ??
  mongoose.model<TestResultDoc>("TestResult", testResultSchema);

export function toTestResult(doc: TestResultDoc): TestResult {
  return {
    id: doc.id,
    testRunId: doc.testRunId,
    testCaseId: doc.testCaseId,
    status: doc.status as TestResult["status"],
    actualResult: doc.actualResult ?? undefined,
    evidence: doc.evidence,
    recordedBySource: doc.recordedBySource as TestResult["recordedBySource"],
    recordedByName: doc.recordedByName ?? undefined,
    recordedAt: doc.recordedAt,
    updatedAt: doc.updatedAt,
    needsHumanReview: doc.needsHumanReview ?? undefined,
    reviewedBySource: doc.reviewedBySource as TestResult["reviewedBySource"],
    reviewedByName: doc.reviewedByName ?? undefined,
    reviewedAt: doc.reviewedAt ?? undefined,
    idempotencyKey: doc.idempotencyKey ?? undefined,
  };
}
