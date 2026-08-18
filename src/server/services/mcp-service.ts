import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import type { McpConnectionStatus } from "@/config/status.config";
import { isMcpToolName, mcpToolNames, runMcpTool, type McpToolName } from "@/server/mcp/tools";
import { listActivityForProject, recordActivity } from "@/server/repositories/activity-repository";
import {
  findActiveCredentialForProject,
  getConnectionState,
  saveConnectionState,
  saveCredential,
} from "@/server/repositories/mcp-repository";
import { findProjectBySlug, updateProject } from "@/server/repositories/project-repository";
import type {
  ActivityEvent,
  McpConnectionState,
  McpCredential,
  Project,
  PublicMcpCredential,
} from "@/types/domain";

/**
 * Issue/regenerate/revoke a project's Claude MCP credential, and verify
 * inbound MCP requests against it (03-CLAUDE-RULES.md, "MCP rules";
 * 02-BUILD-PHASES.md Phase 3 security requirements). This is the one place
 * that ever sees a credential's plaintext secret or hash — every caller
 * outside this file, including client components, only ever holds a
 * `PublicMcpCredential` (no `secretHash`) or, for the one moment right after
 * issuance, the plaintext returned from `issueMcpCredential`.
 */

const SECRET_PREFIX = "vrq_live_";
const MCP_ACTIVITY_ENTITY_TYPE = "mcpConnection";

function generateSecret(): string {
  return `${SECRET_PREFIX}${randomBytes(24).toString("base64url")}`;
}

function toPublicCredential(credential: McpCredential): PublicMcpCredential {
  return {
    id: credential.id,
    projectId: credential.projectId,
    status: credential.status,
    displayPrefix: credential.displayPrefix,
    displaySuffix: credential.displaySuffix,
    createdAt: credential.createdAt,
    createdByName: credential.createdByName,
    revokedAt: credential.revokedAt,
    revokedByName: credential.revokedByName,
  };
}

function logMcpActivity(
  projectId: string,
  actorType: ActivityEvent["actorType"],
  actorName: string,
  action: string,
  entityId: string,
): void {
  recordActivity({
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

export type McpConnectionSnapshot = {
  credential: PublicMcpCredential | null;
  status: McpConnectionStatus;
  lastAttemptAt?: string;
  lastAttemptError?: string;
  lastSuccessAt?: string;
  recentActivity: ActivityEvent[];
};

/**
 * Derives the connection status the UI shows from real recorded state
 * rather than `project.setupStepsCompleted` (which only tells you the step
 * was *reached*, not whether the current credential still works). Revoking
 * or regenerating a credential changes its `id`, so a stale success/failure
 * recorded against a previous credential correctly stops counting.
 */
export function getMcpConnectionSnapshot(project: Project): McpConnectionSnapshot {
  const active = findActiveCredentialForProject(project.id);
  const state = getConnectionState(project.id);

  let status: McpConnectionStatus = "notConfigured";
  if (active) {
    if (state?.lastSuccessCredentialId === active.id) {
      status = "connected";
    } else if (state?.lastAttemptCredentialId === active.id && state.lastAttemptStatus === "error") {
      status = "error";
    } else {
      status = "pendingFirstConnection";
    }
  }

  const recentActivity = listActivityForProject(project.id)
    .filter((event) => event.entityType === MCP_ACTIVITY_ENTITY_TYPE)
    .slice(0, 8);

  return {
    credential: active ? toPublicCredential(active) : null,
    status,
    lastAttemptAt: state?.lastAttemptAt,
    lastAttemptError: state?.lastAttemptStatus === "error" ? state.lastAttemptError : undefined,
    lastSuccessAt: state?.lastSuccessAt,
    recentActivity,
  };
}

export type IssueCredentialResult = {
  credential: PublicMcpCredential;
  secret: string;
};

/**
 * Backs both "Generate credential" and "Regenerate credential" — the rule is
 * identical either way: revoke whatever is currently active, then issue a
 * new one. The plaintext `secret` is returned exactly once, here; it is
 * never stored or logged (only its scrypt hash is persisted).
 */
export function issueMcpCredential(project: Project, actorName: string): IssueCredentialResult {
  const existing = findActiveCredentialForProject(project.id);
  const now = new Date().toISOString();

  if (existing) {
    saveCredential({ ...existing, status: "revoked", revokedAt: now, revokedByName: actorName });
  }

  const secret = generateSecret();
  const credential: McpCredential = {
    id: randomUUID(),
    projectId: project.id,
    status: "active",
    secretHash: hashPassword(secret),
    displayPrefix: secret.slice(0, SECRET_PREFIX.length + 4),
    displaySuffix: secret.slice(-4),
    createdAt: now,
    createdByName: actorName,
  };
  saveCredential(credential);

  logMcpActivity(
    project.id,
    "human",
    actorName,
    existing ? "regenerated the Claude MCP credential" : "issued a new Claude MCP credential",
    credential.id,
  );

  return { credential: toPublicCredential(credential), secret };
}

export function revokeMcpCredential(project: Project, actorName: string): void {
  const existing = findActiveCredentialForProject(project.id);
  if (!existing) return;

  const now = new Date().toISOString();
  saveCredential({ ...existing, status: "revoked", revokedAt: now, revokedByName: actorName });
  logMcpActivity(project.id, "human", actorName, "revoked the Claude MCP credential", existing.id);
}

// ---- Inbound MCP request handling (app/api/mcp/[slug]/route.ts) ----

export type McpRequestResult =
  | { httpStatus: 200; body: { ok: true; tool: McpToolName; result: Record<string, unknown> } }
  | { httpStatus: 400 | 401 | 404 | 429; body: { ok: false; error: string } };

function recordConnectionAttempt(
  projectId: string,
  outcome:
    | { status: "success"; credentialId: string; tool: McpToolName }
    | { status: "error"; credentialId?: string; tool: McpToolName; error: string },
): void {
  const now = new Date().toISOString();
  const previous = getConnectionState(projectId);

  const next: McpConnectionState = {
    projectId,
    lastAttemptAt: now,
    lastAttemptStatus: outcome.status,
    lastAttemptCredentialId: outcome.credentialId ?? previous?.lastAttemptCredentialId,
    lastAttemptTool: outcome.tool,
    lastAttemptError: outcome.status === "error" ? outcome.error : undefined,
    lastSuccessAt: outcome.status === "success" ? now : previous?.lastSuccessAt,
    lastSuccessCredentialId:
      outcome.status === "success" ? outcome.credentialId : previous?.lastSuccessCredentialId,
  };
  saveConnectionState(next);
}

const toolActionLabel: Record<McpToolName, string> = {
  health_check: "ran a health check over MCP",
  get_project_context: "read the project QA context over MCP",
};

function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

/**
 * Authenticates and executes one MCP tool call. Rate-limited per project
 * slug (03-CLAUDE-RULES.md, "Rate-limit authentication, key management, and
 * MCP endpoints"). CSRF protection doesn't apply here the way it does to the
 * cookie-authenticated server actions elsewhere in the app — this endpoint
 * trusts a bearer secret, never an ambient session cookie, so a
 * cross-origin request without the secret simply fails authentication.
 */
export function handleMcpRequest(
  slug: string,
  authorizationHeader: string | null,
  body: unknown,
): McpRequestResult {
  const rateLimit = checkRateLimit(`mcp-auth:${slug}`, { limit: 30, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return { httpStatus: 429, body: { ok: false, error: "Too many requests. Try again shortly." } };
  }

  const tool = body && typeof body === "object" ? (body as Record<string, unknown>).tool : undefined;
  if (!isMcpToolName(tool)) {
    return {
      httpStatus: 400,
      body: { ok: false, error: `"tool" must be one of: ${mcpToolNames.join(", ")}.` },
    };
  }

  const project = findProjectBySlug(slug);
  if (!project) {
    return { httpStatus: 404, body: { ok: false, error: "Unknown project." } };
  }

  const secret = extractBearerToken(authorizationHeader);
  const active = findActiveCredentialForProject(project.id);

  if (!secret || !active || !verifyPassword(secret, active.secretHash)) {
    recordConnectionAttempt(project.id, {
      status: "error",
      credentialId: active?.id,
      tool,
      error: "Invalid or revoked credential.",
    });
    logMcpActivity(
      project.id,
      "system",
      "Veriqo",
      "rejected an MCP connection attempt (invalid or revoked credential)",
      active?.id ?? project.id,
    );
    return { httpStatus: 401, body: { ok: false, error: "Invalid or revoked credential." } };
  }

  recordConnectionAttempt(project.id, { status: "success", credentialId: active.id, tool });
  logMcpActivity(project.id, "claude", "Claude", toolActionLabel[tool], active.id);

  // Reassign so `runMcpTool` below reports the up-to-date step count on the
  // very request that completes the transition, not the stale pre-update value.
  let currentProject = project;
  if (project.setupStepsCompleted < 2) {
    currentProject = { ...project, setupStepsCompleted: 2 };
    updateProject(currentProject);
    logMcpActivity(
      project.id,
      "system",
      "Veriqo",
      "marked Claude MCP as connected after a verified request",
      active.id,
    );
  }

  return { httpStatus: 200, body: { ok: true, tool, result: runMcpTool(tool, currentProject) } };
}
