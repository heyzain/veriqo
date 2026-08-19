import "server-only";

import mongoose, { Schema } from "mongoose";

import type { Issue } from "@/types/domain";

const issueSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    publicId: { type: String, required: true },
    projectId: { type: String, required: true },
    featureId: { type: String, required: true },
    testCaseId: { type: String, required: true },
    originResultId: { type: String, required: true },
    title: { type: String, required: true },
    status: { type: String, required: true },
    severity: { type: String, required: true },
    fixNote: { type: String },
    rerunResultId: { type: String },
    rerunTestRunId: { type: String },
    createdBySource: { type: String, required: true },
    createdByName: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false },
);

export type IssueDoc = mongoose.InferSchemaType<typeof issueSchema>;

export const IssueModel =
  (mongoose.models.Issue as mongoose.Model<IssueDoc> | undefined) ??
  mongoose.model<IssueDoc>("Issue", issueSchema);

export function toIssue(doc: IssueDoc): Issue {
  return {
    id: doc.id,
    publicId: doc.publicId,
    projectId: doc.projectId,
    featureId: doc.featureId,
    testCaseId: doc.testCaseId,
    originResultId: doc.originResultId,
    title: doc.title,
    status: doc.status as Issue["status"],
    severity: doc.severity as Issue["severity"],
    fixNote: doc.fixNote ?? undefined,
    rerunResultId: doc.rerunResultId ?? undefined,
    rerunTestRunId: doc.rerunTestRunId ?? undefined,
    createdBySource: doc.createdBySource as Issue["createdBySource"],
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
