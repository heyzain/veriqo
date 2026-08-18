import "server-only";

import { store } from "@/server/repositories/store";
import type { McpConnectionState, McpCredential } from "@/types/domain";

/**
 * At most one `active` credential exists per project — `mcp-service.ts`
 * enforces that by revoking the previous one before creating a new row,
 * rather than this layer filtering it out. Every read stays project-scoped.
 */
export function findActiveCredentialForProject(projectId: string): McpCredential | null {
  return (
    Array.from(store.mcpCredentials.values()).find(
      (c) => c.projectId === projectId && c.status === "active",
    ) ?? null
  );
}

export function findCredentialById(id: string): McpCredential | null {
  return store.mcpCredentials.get(id) ?? null;
}

export function listCredentialsForProject(projectId: string): McpCredential[] {
  return Array.from(store.mcpCredentials.values()).filter((c) => c.projectId === projectId);
}

export function saveCredential(credential: McpCredential): void {
  store.mcpCredentials.set(credential.id, credential);
}

export function getConnectionState(projectId: string): McpConnectionState | null {
  return store.mcpConnectionStates.get(projectId) ?? null;
}

export function saveConnectionState(state: McpConnectionState): void {
  store.mcpConnectionStates.set(state.projectId, state);
}
