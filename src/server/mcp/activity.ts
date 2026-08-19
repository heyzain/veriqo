import "server-only";

import { randomUUID } from "node:crypto";

import { recordActivity } from "@/server/repositories/activity-repository";
import type { ActivityEvent } from "@/types/domain";

/**
 * Shared by `mcp-service.ts` (credential issuance/revocation, connection
 * attempts) and `protocol-server.ts` (per-tool-call activity, now that a
 * single HTTP request can carry any one JSON-RPC method rather than always
 * exactly one tool call). Pulled out on its own so neither of those two
 * files has to import the other — `mcp-service.ts` builds the transport via
 * `protocol-server.ts`, so the reverse import would cycle.
 */
export const MCP_ACTIVITY_ENTITY_TYPE = "mcpConnection";

export async function logMcpActivity(
  projectId: string,
  actorType: ActivityEvent["actorType"],
  actorName: string,
  action: string,
  entityId: string,
): Promise<void> {
  await recordActivity({
    id: randomUUID(),
    projectId,
    actorType,
    actorName,
    action,
    entityType: MCP_ACTIVITY_ENTITY_TYPE,
    entityId,
    createdAt: new Date().toISOString(),
  });
}
