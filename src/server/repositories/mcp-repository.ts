import "server-only";

import { dbConnect } from "@/server/db/connection";
import { McpCredentialModel, toMcpCredential } from "@/server/db/models/mcp-credential.model";
import {
  McpConnectionStateModel,
  toMcpConnectionState,
} from "@/server/db/models/mcp-connection-state.model";
import type { McpConnectionState, McpCredential } from "@/types/domain";

/**
 * At most one `active` credential exists per project — `mcp-service.ts`
 * enforces that by revoking the previous one before creating a new row,
 * rather than this layer filtering it out. Every read stays project-scoped.
 */
export async function findActiveCredentialForProject(projectId: string): Promise<McpCredential | null> {
  await dbConnect();
  const doc = await McpCredentialModel.findOne({ projectId, status: "active" }).lean();
  return doc ? toMcpCredential(doc) : null;
}

export async function findCredentialById(id: string): Promise<McpCredential | null> {
  await dbConnect();
  const doc = await McpCredentialModel.findOne({ id }).lean();
  return doc ? toMcpCredential(doc) : null;
}

export async function listCredentialsForProject(projectId: string): Promise<McpCredential[]> {
  await dbConnect();
  const docs = await McpCredentialModel.find({ projectId }).lean();
  return docs.map(toMcpCredential);
}

export async function saveCredential(credential: McpCredential): Promise<void> {
  await dbConnect();
  await McpCredentialModel.updateOne({ id: credential.id }, { $set: credential }, { upsert: true });
}

export async function getConnectionState(projectId: string): Promise<McpConnectionState | null> {
  await dbConnect();
  const doc = await McpConnectionStateModel.findOne({ projectId }).lean();
  return doc ? toMcpConnectionState(doc) : null;
}

export async function saveConnectionState(state: McpConnectionState): Promise<void> {
  await dbConnect();
  await McpConnectionStateModel.updateOne(
    { projectId: state.projectId },
    { $set: state },
    { upsert: true },
  );
}

/** Part of `account-service.deleteAccount`'s cascade. */
export async function deleteMcpDataForProject(projectId: string): Promise<void> {
  await dbConnect();
  await McpCredentialModel.deleteMany({ projectId });
  await McpConnectionStateModel.deleteOne({ projectId });
}
