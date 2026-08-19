import "server-only";

import { Schema } from "mongoose";

/**
 * Subdocument schemas reused across the domain models — kept here once
 * rather than redeclared per model. Every one uses `_id: false`: these are
 * value shapes embedded on their parent document, not independently
 * addressable records (`types/domain.ts`).
 */

export const featureSourceReferenceSchema = new Schema(
  {
    path: { type: String, required: true },
    note: { type: String },
  },
  { _id: false },
);

export const featureSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    risk: { type: String, required: true },
    acceptanceCriteria: { type: [String], default: [] },
  },
  { _id: false },
);

export const testCaseSnapshotSchema = new Schema(
  {
    title: { type: String, required: true },
    steps: { type: [String], default: [] },
    expectedResult: { type: String, required: true },
    priority: { type: String, required: true },
  },
  { _id: false },
);

export const testEvidenceSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    dataUrl: { type: String, required: true },
  },
  { _id: false },
);

export const relatedEntitySchema = new Schema(
  {
    type: { type: String, required: true },
    id: { type: String, required: true },
  },
  { _id: false },
);
