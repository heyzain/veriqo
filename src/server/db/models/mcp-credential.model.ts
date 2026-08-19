import "server-only";

import mongoose, { Schema } from "mongoose";

import type { McpCredential } from "@/types/domain";

const mcpCredentialSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    projectId: { type: String, required: true },
    status: { type: String, required: true },
    secretHash: { type: String, required: true },
    displayPrefix: { type: String, required: true },
    displaySuffix: { type: String, required: true },
    createdAt: { type: String, required: true },
    createdByName: { type: String, required: true },
    revokedAt: { type: String },
    revokedByName: { type: String },
  },
  { versionKey: false },
);

export type McpCredentialDoc = mongoose.InferSchemaType<typeof mcpCredentialSchema>;

export const McpCredentialModel =
  (mongoose.models.McpCredential as mongoose.Model<McpCredentialDoc> | undefined) ??
  mongoose.model<McpCredentialDoc>("McpCredential", mcpCredentialSchema);

export function toMcpCredential(doc: McpCredentialDoc): McpCredential {
  return {
    id: doc.id,
    projectId: doc.projectId,
    status: doc.status as McpCredential["status"],
    secretHash: doc.secretHash,
    displayPrefix: doc.displayPrefix,
    displaySuffix: doc.displaySuffix,
    createdAt: doc.createdAt,
    createdByName: doc.createdByName,
    revokedAt: doc.revokedAt ?? undefined,
    revokedByName: doc.revokedByName ?? undefined,
  };
}
