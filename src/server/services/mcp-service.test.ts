import { beforeEach, describe, expect, it } from "vitest";

import { store } from "@/server/repositories/store";
import { listActivityForProject } from "@/server/repositories/activity-repository";
import { createProjectForOwner } from "@/server/services/project-service";
import type { PublicUser } from "@/types/auth";

import {
  getMcpConnectionSnapshot,
  handleMcpRequest,
  issueMcpCredential,
  revokeMcpCredential,
} from "./mcp-service";

function resetStore() {
  store.users.clear();
  store.usersByEmail.clear();
  store.tokens.clear();
  store.invites.clear();
  store.projects.clear();
  store.mcpCredentials.clear();
  store.mcpConnectionStates.clear();
  store.activity.length = 0;
  store.seeded = true; // Skip demo seeding — these tests own their own fixtures.
}

const owner: PublicUser = {
  id: "user-owner",
  name: "Owner",
  email: "owner@example.com",
  emailVerified: true,
  createdAt: new Date().toISOString(),
};

beforeEach(resetStore);

function makeProject(name: string) {
  return createProjectForOwner(
    { name, description: `Test project ${name}.`, appUrl: "https://example.com", environment: "development" },
    owner,
  );
}

describe("mcp-service — credential lifecycle", () => {
  it("issues exactly one active credential, revoking any previous one on regenerate", () => {
    const project = makeProject("Alpha");

    const first = issueMcpCredential(project, owner.name);
    expect(store.mcpCredentials.get(first.credential.id)?.status).toBe("active");

    const second = issueMcpCredential(project, owner.name);
    expect(second.secret).not.toBe(first.secret);
    expect(store.mcpCredentials.get(first.credential.id)?.status).toBe("revoked");
    expect(store.mcpCredentials.get(second.credential.id)?.status).toBe("active");

    const activeCount = Array.from(store.mcpCredentials.values()).filter(
      (c) => c.projectId === project.id && c.status === "active",
    ).length;
    expect(activeCount).toBe(1);
  });

  it("never returns the secret hash to a caller — only masked fragments", () => {
    const project = makeProject("Beta");
    const { credential } = issueMcpCredential(project, owner.name);
    expect(credential).not.toHaveProperty("secretHash");
    expect(credential.displayPrefix.length).toBeGreaterThan(0);
    expect(credential.displaySuffix).toHaveLength(4);
  });

  it("revoking clears the active credential and is a no-op when none exists", () => {
    const project = makeProject("Gamma");
    issueMcpCredential(project, owner.name);

    revokeMcpCredential(project, owner.name);
    expect(getMcpConnectionSnapshot(project).credential).toBeNull();

    // Calling again with nothing active must not throw.
    expect(() => revokeMcpCredential(project, owner.name)).not.toThrow();
  });
});

describe("mcp-service — inbound request authorization", () => {
  it("rejects an unknown project slug", () => {
    const result = handleMcpRequest("does-not-exist", "Bearer whatever", { tool: "health_check" });
    expect(result.httpStatus).toBe(404);
  });

  it("rejects a missing Authorization header", () => {
    const project = makeProject("Delta");
    issueMcpCredential(project, owner.name);

    const result = handleMcpRequest(project.slug, null, { tool: "health_check" });
    expect(result.httpStatus).toBe(401);
  });

  it("rejects an unknown tool name", () => {
    const project = makeProject("Epsilon");
    const { secret } = issueMcpCredential(project, owner.name);

    const result = handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "delete_everything" });
    expect(result.httpStatus).toBe(400);
  });

  it("rejects a wrong secret and a revoked credential", () => {
    const project = makeProject("Zeta");
    const { secret } = issueMcpCredential(project, owner.name);

    const wrongSecret = handleMcpRequest(project.slug, "Bearer not-the-right-secret", {
      tool: "health_check",
    });
    expect(wrongSecret.httpStatus).toBe(401);

    revokeMcpCredential(project, owner.name);
    const revoked = handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "health_check" });
    expect(revoked.httpStatus).toBe(401);
  });

  it("never authenticates one project's credential against a different project's slug (tenant isolation)", () => {
    const projectA = makeProject("Theta");
    const projectB = makeProject("Iota");
    const { secret: secretA } = issueMcpCredential(projectA, owner.name);
    issueMcpCredential(projectB, owner.name);

    const result = handleMcpRequest(projectB.slug, `Bearer ${secretA}`, { tool: "health_check" });
    expect(result.httpStatus).toBe(401);
  });

  it("accepts a valid credential, marks the connection snapshot connected, and bumps the setup step exactly once", () => {
    const project = makeProject("Kappa");
    expect(project.setupStepsCompleted).toBe(1);
    const { secret } = issueMcpCredential(project, owner.name);

    const first = handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "health_check" });
    expect(first.httpStatus).toBe(200);

    const snapshot = getMcpConnectionSnapshot(project);
    expect(snapshot.status).toBe("connected");

    const systemActivity = listActivityForProject(project.id).filter(
      (event) => event.action === "marked Claude MCP as connected after a verified request",
    );
    expect(systemActivity).toHaveLength(1);

    // A second successful call is idempotent: no duplicate "marked connected" event.
    const second = handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "get_project_context" });
    expect(second.httpStatus).toBe(200);
    const systemActivityAfter = listActivityForProject(project.id).filter(
      (event) => event.action === "marked Claude MCP as connected after a verified request",
    );
    expect(systemActivityAfter).toHaveLength(1);
  });

  it("flips the connection status to error after a failed attempt against the still-active credential", () => {
    const project = makeProject("Lambda");
    issueMcpCredential(project, owner.name);

    handleMcpRequest(project.slug, "Bearer wrong-value", { tool: "health_check" });

    const snapshot = getMcpConnectionSnapshot(project);
    expect(snapshot.status).toBe("error");
    expect(snapshot.lastAttemptError).toBeTruthy();
  });

  it("rate-limits repeated requests against the same project slug", () => {
    const project = makeProject("Mu");
    const { secret } = issueMcpCredential(project, owner.name);

    let lastStatus = 200;
    for (let i = 0; i < 35; i += 1) {
      lastStatus = handleMcpRequest(project.slug, `Bearer ${secret}`, { tool: "health_check" }).httpStatus;
    }
    expect(lastStatus).toBe(429);
  });
});
