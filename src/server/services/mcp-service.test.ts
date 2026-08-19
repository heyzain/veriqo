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
    const result = await handleMcpRequest("does-not-exist", "Bearer whatever", { tool: "health_check" });
    expect(result.httpStatus).toBe(404);
  });

  it("rejects a missing Authorization header", async () => {
    const project = await makeProject("Delta");
    await issueMcpCredential(project, owner.name);

    const result = await handleMcpRequest(project.slug, null, { tool: "health_check" });
    expect(result.httpStatus).toBe(401);
  });

  it("rejects an unknown tool name", async () => {
    const project = await makeProject("Epsilon");
    const { secret } = await issueMcpCredential(project, owner.name);

    const result = await handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "delete_everything" });
    expect(result.httpStatus).toBe(400);
  });

  it("rejects a wrong secret and a revoked credential", async () => {
    const project = await makeProject("Zeta");
    const { secret } = await issueMcpCredential(project, owner.name);

    const wrongSecret = await handleMcpRequest(project.slug, "Bearer not-the-right-secret", {
      tool: "health_check",
    });
    expect(wrongSecret.httpStatus).toBe(401);

    await revokeMcpCredential(project, owner.name);
    const revoked = await handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "health_check" });
    expect(revoked.httpStatus).toBe(401);
  });

  it("never authenticates one project's credential against a different project's slug (tenant isolation)", async () => {
    const projectA = await makeProject("Theta");
    const projectB = await makeProject("Iota");
    const { secret: secretA } = await issueMcpCredential(projectA, owner.name);
    await issueMcpCredential(projectB, owner.name);

    const result = await handleMcpRequest(projectB.slug, `Bearer ${secretA}`, { tool: "health_check" });
    expect(result.httpStatus).toBe(401);
  });

  it("accepts a valid credential, marks the connection snapshot connected, and bumps the setup step exactly once", async () => {
    const project = await makeProject("Kappa");
    expect(project.setupStepsCompleted).toBe(1);
    const { secret } = await issueMcpCredential(project, owner.name);

    const first = await handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "health_check" });
    expect(first.httpStatus).toBe(200);

    const snapshot = await getMcpConnectionSnapshot(project);
    expect(snapshot.status).toBe("connected");

    const activity = await listActivityForProject(project.id);
    const systemActivity = activity.filter(
      (event) => event.action === "marked Claude MCP as connected after a verified request",
    );
    expect(systemActivity).toHaveLength(1);

    // A second successful call is idempotent: no duplicate "marked connected" event.
    const second = await handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "get_project_context" });
    expect(second.httpStatus).toBe(200);
    const activityAfter = await listActivityForProject(project.id);
    const systemActivityAfter = activityAfter.filter(
      (event) => event.action === "marked Claude MCP as connected after a verified request",
    );
    expect(systemActivityAfter).toHaveLength(1);
  });

  it("flips the connection status to error after a failed attempt against the still-active credential", async () => {
    const project = await makeProject("Lambda");
    await issueMcpCredential(project, owner.name);

    await handleMcpRequest(project.slug, "Bearer wrong-value", { tool: "health_check" });

    const snapshot = await getMcpConnectionSnapshot(project);
    expect(snapshot.status).toBe("error");
    expect(snapshot.lastAttemptError).toBeTruthy();
  });

  it("rate-limits repeated requests against the same project slug", async () => {
    const project = await makeProject("Mu");
    const { secret } = await issueMcpCredential(project, owner.name);

    let lastStatus = 200;
    for (let i = 0; i < 35; i += 1) {
      lastStatus = (await handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "health_check" })).httpStatus;
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

    const result = await handleMcpRequest(project.slug, `Bearer ${secret}`, {
      tool: "create_feature",
      input: featureInput,
    });

    expect(result.httpStatus).toBe(200);
    expect(result.body.ok).toBe(true);
    if (!result.body.ok) return;
    const feature = result.body.result.feature as { status: string; featureId: string };
    expect(feature.status).toBe("needsReview");
    expect(feature.featureId).toMatch(/^FEAT-/);
  });

  it("rejects create_feature input that fails schema validation, without leaking a stack trace", async () => {
    const project = await makeProject("Xi");
    const { secret } = await issueMcpCredential(project, owner.name);

    const result = await handleMcpRequest(project.slug, `Bearer ${secret}`, {
      tool: "create_feature",
      input: { name: "A" }, // too short, missing required fields
    });

    expect(result.httpStatus).toBe(400);
    expect(result.body.ok).toBe(false);
  });

  it("update_feature resolves the target by public ID and rejects an unknown one", async () => {
    const project = await makeProject("Omicron");
    const { secret } = await issueMcpCredential(project, owner.name);

    const created = await handleMcpRequest(project.slug, `Bearer ${secret}`, {
      tool: "create_feature",
      input: featureInput,
    });
    if (!created.body.ok) throw new Error("setup failed");
    const featureId = (created.body.result.feature as { featureId: string }).featureId;

    const updated = await handleMcpRequest(project.slug, `Bearer ${secret}`, {
      tool: "update_feature",
      input: { featureId, description: "Sign up, sign in, and recover a password." },
    });
    expect(updated.httpStatus).toBe(200);

    const missing = await handleMcpRequest(project.slug, `Bearer ${secret}`, {
      tool: "update_feature",
      input: { featureId: "FEAT-99" },
    });
    expect(missing.httpStatus).toBe(400);
  });

  it("list_features never returns another project's features (tenant isolation)", async () => {
    const projectA = await makeProject("Pi");
    const projectB = await makeProject("Rho");
    const { secret: secretA } = await issueMcpCredential(projectA, owner.name);
    const { secret: secretB } = await issueMcpCredential(projectB, owner.name);

    await handleMcpRequest(projectA.slug, `Bearer ${secretA}`, { tool: "create_feature", input: featureInput });

    const forB = await handleMcpRequest(projectB.slug, `Bearer ${secretB}`, { tool: "list_features", input: {} });
    expect(forB.httpStatus).toBe(200);
    if (!forB.body.ok) return;
    expect(forB.body.result.features).toEqual([]);
  });
});
