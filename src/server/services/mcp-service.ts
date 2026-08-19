import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { logger } from "@/lib/logging/logger";
import type { McpConnectionStatus } from "@/config/status.config";
import { MCP_ACTIVITY_ENTITY_TYPE, logMcpActivity } from "@/server/mcp/activity";
import { buildMcpServer } from "@/server/mcp/protocol-server";
import { listActivityForProject } from "@/server/repositories/activity-repository";
import {
  findActiveCredentialForProject,
  getConnectionState,
  saveConnectionState,
  saveCredential,
} from "@/server/repositories/mcp-repository";
import { findProjectBySlug } from "@/server/repositories/project-repository";
import { advanceSetupStep } from "@/server/services/project-service";
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
export async function getMcpConnectionSnapshot(project: Project): Promise<McpConnectionSnapshot> {
  const [active, state, allActivity] = await Promise.all([
    findActiveCredentialForProject(project.id),
    getConnectionState(project.id),
    listActivityForProject(project.id),
  ]);

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

  const recentActivity = allActivity
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
export async function issueMcpCredential(project: Project, actorName: string): Promise<IssueCredentialResult> {
  const existing = await findActiveCredentialForProject(project.id);
  const now = new Date().toISOString();

  if (existing) {
    await saveCredential({ ...existing, status: "revoked", revokedAt: now, revokedByName: actorName });
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
  await saveCredential(credential);

  await logMcpActivity(
    project.id,
    "human",
    actorName,
    existing ? "regenerated the Claude MCP credential" : "issued a new Claude MCP credential",
    credential.id,
  );

  return { credential: toPublicCredential(credential), secret };
}

export async function revokeMcpCredential(project: Project, actorName: string): Promise<void> {
  const existing = await findActiveCredentialForProject(project.id);
  if (!existing) return;

  const now = new Date().toISOString();
  await saveCredential({ ...existing, status: "revoked", revokedAt: now, revokedByName: actorName });
  await logMcpActivity(project.id, "human", actorName, "revoked the Claude MCP credential", existing.id);
}

// ---- Inbound MCP request handling (app/api/mcp/[slug]/route.ts) ----

async function recordConnectionAttempt(
  projectId: string,
  outcome:
    | { status: "success"; credentialId: string; method: string }
    | { status: "error"; credentialId?: string; method: string; error: string },
): Promise<void> {
  const now = new Date().toISOString();
  const previous = await getConnectionState(projectId);

  const next: McpConnectionState = {
    projectId,
    lastAttemptAt: now,
    lastAttemptStatus: outcome.status,
    lastAttemptCredentialId: outcome.credentialId ?? previous?.lastAttemptCredentialId,
    lastAttemptTool: outcome.method,
    lastAttemptError: outcome.status === "error" ? outcome.error : undefined,
    lastSuccessAt: outcome.status === "success" ? now : previous?.lastSuccessAt,
    lastSuccessCredentialId:
      outcome.status === "success" ? outcome.credentialId : previous?.lastSuccessCredentialId,
  };
  await saveConnectionState(next);
}

function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

/**
 * Best-effort label for the connection-attempt audit trail
 * (`McpConnectionState.lastAttemptTool`). For a `tools/call` request this is
 * the actual tool name (`"health_check"`, `"submit_test_result"`, ...) —
 * the most useful thing to show — falling back to the bare JSON-RPC method
 * (`"initialize"`, `"tools/list"`, ...) for everything else, or `"unknown"`
 * if the body couldn't be read as JSON at all.
 */
function extractMethodLabel(parsedBody: unknown): string {
  if (!parsedBody || typeof parsedBody !== "object" || !("method" in parsedBody)) return "unknown";
  const method = String((parsedBody as { method?: unknown }).method ?? "unknown");
  if (method !== "tools/call" || !("params" in parsedBody)) return method;
  const params = (parsedBody as { params?: unknown }).params;
  if (!params || typeof params !== "object" || !("name" in params)) return method;
  return String((params as { name?: unknown }).name ?? method);
}

/**
 * Authenticates a request and, once authenticated, hands it to a real MCP
 * server over the Streamable HTTP transport — this is what
 * `mcp-setup-instructions.tsx` actually promises when it tells a user to run
 * `claude mcp add --transport http`. Rate-limited per project slug
 * (03-CLAUDE-RULES.md, "Rate-limit authentication, key management, and MCP
 * endpoints"). CSRF protection doesn't apply here the way it does to the
 * cookie-authenticated server actions elsewhere in the app — this endpoint
 * trusts a bearer secret, never an ambient session cookie, so a
 * cross-origin request without the secret simply fails authentication.
 *
 * Stateless mode (`sessionIdGenerator: undefined`): a fresh `McpServer` and
 * transport are built per request and discarded afterward — no session
 * state to leak between projects or requests, appropriate since none of
 * Veriqo's tools are long-running or need server-initiated pushes.
 * `enableJsonResponse: true` returns plain JSON instead of an SSE stream,
 * for the same reason.
 */
export async function handleMcpRequest(
  slug: string,
  authorizationHeader: string | null,
  request: Request,
): Promise<Response> {
  const rateLimit = checkRateLimit(`mcp-auth:${slug}`, { limit: 30, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.allowed) {
    logger.warn("mcp request rate-limited", { slug });
    return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const project = await findProjectBySlug(slug);
  if (!project) {
    return Response.json({ error: "Unknown project." }, { status: 404 });
  }

  // Read the body once here (for auth-audit labeling) and hand the parsed
  // value to the transport via `parsedBody` — a `Request` body can only be
  // consumed once, and the transport does its own `req.json()` otherwise.
  const parsedBody = await request
    .clone()
    .json()
    .catch(() => undefined);
  const method = extractMethodLabel(parsedBody);

  const secret = extractBearerToken(authorizationHeader);
  const active = await findActiveCredentialForProject(project.id);

  if (!secret || !active || !verifyPassword(secret, active.secretHash)) {
    await recordConnectionAttempt(project.id, {
      status: "error",
      credentialId: active?.id,
      method,
      error: "Invalid or revoked credential.",
    });
    await logMcpActivity(
      project.id,
      "system",
      "Veriqo",
      "rejected an MCP connection attempt (invalid or revoked credential)",
      active?.id ?? project.id,
    );
    // Never logs the offered secret itself — only that an attempt was rejected.
    logger.warn("mcp request rejected: invalid or revoked credential", { projectId: project.id, method });
    return Response.json({ error: "Invalid or revoked credential." }, { status: 401 });
  }

  await recordConnectionAttempt(project.id, { status: "success", credentialId: active.id, method });

  // Reassign so tool calls below report the up-to-date step count on the
  // very request that completes the transition, not the stale pre-update value.
  const currentProject = await advanceSetupStep(project, 2);
  if (currentProject !== project) {
    await logMcpActivity(
      project.id,
      "system",
      "Veriqo",
      "marked Claude MCP as connected after a verified request",
      active.id,
    );
  }

  const server = buildMcpServer(currentProject, active.id);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  return transport.handleRequest(request, { parsedBody });
}
