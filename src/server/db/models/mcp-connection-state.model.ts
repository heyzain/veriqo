import "server-only";

import mongoose, { Schema } from "mongoose";

import type { McpConnectionState } from "@/types/domain";

const mcpConnectionStateSchema = new Schema(
  {
    projectId: { type: String, required: true, unique: true },
    lastAttemptAt: { type: String },
    lastAttemptStatus: { type: String },
    lastAttemptCredentialId: { type: String },
    lastAttemptTool: { type: String },
    lastAttemptError: { type: String },
    lastSuccessAt: { type: String },
    lastSuccessCredentialId: { type: String },
  },
  { versionKey: false },
);

export type McpConnectionStateDoc = mongoose.InferSchemaType<typeof mcpConnectionStateSchema>;

export const McpConnectionStateModel =
  (mongoose.models.McpConnectionState as mongoose.Model<McpConnectionStateDoc> | undefined) ??
  mongoose.model<McpConnectionStateDoc>("McpConnectionState", mcpConnectionStateSchema);

export function toMcpConnectionState(doc: McpConnectionStateDoc): McpConnectionState {
  return {
    projectId: doc.projectId,
    lastAttemptAt: doc.lastAttemptAt ?? undefined,
    lastAttemptStatus: doc.lastAttemptStatus as McpConnectionState["lastAttemptStatus"],
    lastAttemptCredentialId: doc.lastAttemptCredentialId ?? undefined,
    lastAttemptTool: doc.lastAttemptTool ?? undefined,
    lastAttemptError: doc.lastAttemptError ?? undefined,
    lastSuccessAt: doc.lastSuccessAt ?? undefined,
    lastSuccessCredentialId: doc.lastSuccessCredentialId ?? undefined,
  };
}
