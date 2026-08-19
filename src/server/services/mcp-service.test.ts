import { beforeEach, describe, expect, it } from "vitest";

import { McpCredentialModel } from "@/server/db/models/mcp-credential.model";
import { listActivityForProject } from "@/server/repositories/activity-repository";
import { resetTestDb } from "@/test/db";
import { createProjectForOwner } from "@/server/services/project-service";
import type { PublicUser } from "@/types/auth";

import {
  getMcpConnectionSnapshot,
  handleMcpRequest,
  issueMcpCredential,
  revokeMcpCredential,
} from "./mcp-service";

const owner: PublicUser = {
  id: "user-owner",
  name: "Owner",
  email: "owner@example.com",
  emailVerified: true,
  createdAt: new Date().toISOString(),
};

beforeEach(resetTestDb);

function makeProject(name: string) {
  return createProjectForOwner(
    { name, description: `Test project ${name}.`, appUrl: "https://example.com", environment: "development" },
    owner,
  );
}

/**
 * Drives the real MCP endpoint the same way `route.ts` does — a JSON-RPC
 * `tools/call` request through `handleMcpRequest` — then unwraps the
 * response into whichever of the three shapes it can come back as:
 *
 * - Transport-level rejection (bad auth, unknown project, rate-limited):
 *   non-200 HTTP status, plain `{ error }` body.
 * - JSON-RPC protocol error (unknown tool, arguments that fail the
 *   registered Zod schema): HTTP 200, `envelope.error` set.
 * - A successful tool invocation: HTTP 200, `envelope.result` set —
 *   `envelope.result.isError` distinguishes a business-logic failure
 *   (`tools.ts`'s `toolFail(...)`, e.g. "not found") from real success.
 */
async function callTool(slug: string, authHeader: string | null, tool: string, args: Record<string, unknown> = {}) {
  const request = new Request(`http://localhost/api/mcp/${slug}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Required by the MCP Streamable HTTP spec — the transport rejects
      // requests that don't advertise both with a 406.
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
  });

  const response = await handleMcpRequest(slug, authHeader, request);
  const status = response.status;
  const envelope = await response.json().catch(() => null);
  const isToolError = Boolean(envelope?.result?.isError);
  const text = envelope?.result?.content?.[0]?.text;
  // A successful result's text is `JSON.stringify(runMcpTool's result)`; an
  // error result's text (SDK-wrapped unknown-tool/invalid-args errors, or
  // `tools.ts`'s own `toolFail(...)` messages) is a plain human-readable
  // string, not JSON — only parse the former.
  const toolResult = !isToolError && text ? JSON.parse(text) : undefined;

  return { status, envelope, toolResult, isToolError, errorText: isToolError ? text : undefined };
}

function bearer(secret: string): string {
  return `Bearer ${secret}`;
}

describe("mcp-service — credential lifecycle", () => {
  it("issues exactly one active credential, revoking any previous one on regenerate", async () => {
    const project = await makeProject("Alpha");

    const first = await issueMcpCredential(project, owner.name);
    expect((await McpCredentialModel.findOne({ id: first.credential.id }).lean())?.status).toBe("active");

    const second = await issueMcpCredential(project, owner.name);
    expect(second.secret).not.toBe(first.secret);
    expect((await McpCredentialModel.findOne({ id: first.credential.id }).lean())?.status).toBe("revoked");
    expect((await McpCredentialModel.findOne({ id: second.credential.id }).lean())?.status).toBe("active");

    const activeCount = await McpCredentialModel.countDocuments({ projectId: project.id, status: "active" });
    expect(activeCount).toBe(1);
  });

  it("never returns the secret hash to a caller — only masked fragments", async () => {
    const project = await makeProject("Beta");
    const { credential } = await issueMcpCredential(project, owner.name);
    expect(credential).not.toHaveProperty("secretHash");
    expect(credential.displayPrefix.length).toBeGreaterThan(0);
    expect(credential.displaySuffix).toHaveLength(4);
  });

  it("revoking clears the active credential and is a no-op when none exists", async () => {
    const project = await makeProject("Gamma");
    await issueMcpCredential(project, owner.name);

    await revokeMcpCredential(project, owner.name);
    expect((await getMcpConnectionSnapshot(project)).credential).toBeNull();

    // Calling again with nothing active must not throw.
    await expect(revokeMcpCredential(project, owner.name)).resolves.not.toThrow();
  });
});

describe("mcp-service — inbound request authorization", () => {
  it("rejects an unknown project slug", async () => {
    const result = await callTool("does-not-exist", "Bearer whatever", "health_check");
    expect(result.status).toBe(404);
  });

  it("rejects a missing Authorization header", async () => {
    const project = await makeProject("Delta");
    await issueMcpCredential(project, owner.name);

    const result = await callTool(project.slug, null, "health_check");
    expect(result.status).toBe(401);
  });

  it("rejects an unknown tool name as a tool error, not a 500", async () => {
    const project = await makeProject("Epsilon");
    const { secret } = await issueMcpCredential(project, owner.name);

    const result = await callTool(project.slug, bearer(secret), "delete_everything");
    expect(result.status).toBe(200);
    expect(result.isToolError).toBe(true);
  });

  it("rejects a wrong secret and a revoked credential", async () => {
    const project = await makeProject("Zeta");
    const { secret } = await issueMcpCredential(project, owner.name);

    const wrongSecret = await callTool(project.slug, "Bearer not-the-right-secret", "health_check");
    expect(wrongSecret.status).toBe(401);

    await revokeMcpCredential(project, owner.name);
    const revoked = await callTool(project.slug, bearer(secret), "health_check");
    expect(revoked.status).toBe(401);
  });

  it("never authenticates one project's credential against a different project's slug (tenant isolation)", async () => {
    const projectA = await makeProject("Theta");
    const projectB = await makeProject("Iota");
    const { secret: secretA } = await issueMcpCredential(projectA, owner.name);
    await issueMcpCredential(projectB, owner.name);

    const result = await callTool(projectB.slug, bearer(secretA), "health_check");
    expect(result.status).toBe(401);
  });

  it("accepts a valid credential, marks the connection snapshot connected, and bumps the setup step exactly once", async () => {
    const project = await makeProject("Kappa");
    expect(project.setupStepsCompleted).toBe(1);
    const { secret } = await issueMcpCredential(project, owner.name);

    const first = await callTool(project.slug, bearer(secret), "health_check");
    expect(first.status).toBe(200);
    expect(first.isToolError).toBe(false);

    const snapshot = await getMcpConnectionSnapshot(project);
    expect(snapshot.status).toBe("connected");

    const activity = await listActivityForProject(project.id);
    const systemActivity = activity.filter(
      (event) => event.action === "marked Claude MCP as connected after a verified request",
    );
    expect(systemActivity).toHaveLength(1);

    // A second successful call is idempotent: no duplicate "marked connected" event.
    const second = await callTool(project.slug, bearer(secret), "get_project_context");
    expect(second.status).toBe(200);
    const activityAfter = await listActivityForProject(project.id);
    const systemActivityAfter = activityAfter.filter(
      (event) => event.action === "marked Claude MCP as connected after a verified request",
    );
    expect(systemActivityAfter).toHaveLength(1);
  });

  it("flips the connection status to error after a failed attempt against the still-active credential", async () => {
    const project = await makeProject("Lambda");
    await issueMcpCredential(project, owner.name);

    await callTool(project.slug, "Bearer wrong-value", "health_check");

    const snapshot = await getMcpConnectionSnapshot(project);
    expect(snapshot.status).toBe("error");
    expect(snapshot.lastAttemptError).toBeTruthy();
  });

  it("rate-limits repeated requests against the same project slug", async () => {
    const project = await makeProject("Mu");
    const { secret } = await issueMcpCredential(project, owner.name);

    let lastStatus = 200;
    for (let i = 0; i < 35; i += 1) {
      lastStatus = (await callTool(project.slug, bearer(secret), "health_check")).status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe("mcp-service — Phase 4 feature tools", () => {
  const featureInput = {
    name: "Authentication",
    description: "Sign up and sign in.",
    risk: "high",
    acceptanceCriteria: ["A user can sign in with valid credentials."],
  };

  it("create_feature saves a feature that starts Needs review and bumps setup step 3", async () => {
    const project = await makeProject("Nu");
    const { secret } = await issueMcpCredential(project, owner.name);

    const result = await callTool(project.slug, bearer(secret), "create_feature", featureInput);

    expect(result.status).toBe(200);
    expect(result.isToolError).toBe(false);
    expect(result.toolResult.feature.status).toBe("needsReview");
    expect(result.toolResult.feature.featureId).toMatch(/^FEAT-/);
  });

  it("rejects create_feature input that fails its schema, as a tool error", async () => {
    const project = await makeProject("Xi");
    const { secret } = await issueMcpCredential(project, owner.name);

    // Too short / missing required fields — rejected by the registered
    // tool's own input schema before `create_feature`'s handler ever runs.
    const result = await callTool(project.slug, bearer(secret), "create_feature", { name: "A" });

    expect(result.status).toBe(200);
    expect(result.isToolError).toBe(true);
  });

  it("update_feature resolves the target by public ID and rejects an unknown one", async () => {
    const project = await makeProject("Omicron");
    const { secret } = await issueMcpCredential(project, owner.name);

    const created = await callTool(project.slug, bearer(secret), "create_feature", featureInput);
    const featureId = created.toolResult.feature.featureId as string;

    const updated = await callTool(project.slug, bearer(secret), "update_feature", {
      featureId,
      description: "Sign up, sign in, and recover a password.",
    });
    expect(updated.status).toBe(200);
    expect(updated.isToolError).toBe(false);

    // A well-formed but nonexistent featureId passes schema validation and
    // fails inside the handler instead — a business-logic error, not a
    // protocol one.
    const missing = await callTool(project.slug, bearer(secret), "update_feature", { featureId: "FEAT-99" });
    expect(missing.status).toBe(200);
    expect(missing.isToolError).toBe(true);
  });

  it("list_features never returns another project's features (tenant isolation)", async () => {
    const projectA = await makeProject("Pi");
    const projectB = await makeProject("Rho");
    const { secret: secretA } = await issueMcpCredential(projectA, owner.name);
    const { secret: secretB } = await issueMcpCredential(projectB, owner.name);

    await callTool(projectA.slug, bearer(secretA), "create_feature", featureInput);

    const forB = await callTool(projectB.slug, bearer(secretB), "list_features");
    expect(forB.status).toBe(200);
    expect(forB.toolResult.features).toEqual([]);
  });
});
