import "server-only";

import { hashPassword } from "@/lib/auth/password";
import { linkVaultSeed } from "@/lib/mock/linkvault";
import { store } from "@/server/repositories/store";
import type { McpConnectionState, McpCredential, Project } from "@/types/domain";
import type { Invite, User } from "@/types/auth";

/**
 * Deterministic demo accounts + projects, seeded once per process. Three
 * accounts exist specifically so the empty/one/many-project and
 * archived-project states (02-BUILD-PHASES.md, Phase 1) are reachable by
 * signing in, not just assembled in isolation — see the phase report for
 * credentials.
 *
 * A fixed (not random) password hash keeps `npm run dev` restarts and the
 * production build reproducible; this is demo-only seed data; a real
 * database would never store a hash this way "in code".
 */
const DEMO_PASSWORD_HASH = hashPassword("Password123");

function seedUser(overrides: Pick<User, "id" | "name" | "email"> & { createdAt: string }): User {
  return {
    ...overrides,
    passwordHash: DEMO_PASSWORD_HASH,
    emailVerified: true,
  };
}

export function ensureSeeded(): void {
  if (store.seeded) return;
  store.seeded = true;

  const priya = seedUser({
    id: "user-priya",
    name: "Priya Nair",
    email: "priya@veriqo.test",
    createdAt: "2026-07-01T08:45:00.000Z",
  });
  const jordan = seedUser({
    id: "user-jordan",
    name: "Jordan Blake",
    email: "jordan@veriqo.test",
    createdAt: "2026-08-05T13:00:00.000Z",
  });
  const sam = seedUser({
    id: "user-sam",
    name: "Sam Okafor",
    email: "sam@veriqo.test",
    createdAt: "2026-08-10T10:00:00.000Z",
  });

  for (const user of [priya, jordan, sam]) {
    store.users.set(user.id, user);
    store.usersByEmail.set(user.email, user.id);
  }

  // Priya: the fully set-up LinkVault demo project, plus two more at
  // different setup/archive states — this account demonstrates the
  // many-project and archived-project-view states.
  const linkVault: Project = linkVaultSeed.project;

  const beaconCrm: Project = {
    id: "proj-beacon-crm",
    publicId: "BECR",
    slug: "beacon-crm",
    ownerId: priya.id,
    name: "Beacon CRM",
    description: "Internal CRM for a five-person sales team — pipeline, contacts, and reminders.",
    appUrl: "https://beacon-crm.example.com",
    environment: "staging",
    repository: "github.com/priyanair/beacon-crm",
    archived: false,
    setupStepsCompleted: 3,
    createdAt: "2026-07-20T11:00:00.000Z",
  };

  const northwindStorefront: Project = {
    id: "proj-northwind-storefront",
    publicId: "NWST",
    slug: "northwind-storefront",
    ownerId: priya.id,
    name: "Northwind Storefront",
    description: "A seasonal storefront that shipped and is no longer under active QA.",
    appUrl: "https://northwind-storefront.example.com",
    environment: "production",
    repository: "github.com/priyanair/northwind-storefront",
    archived: true,
    setupStepsCompleted: 5,
    createdAt: "2026-05-02T09:15:00.000Z",
  };

  // Sam: exactly one project, early in setup — the one-project state.
  const harborlineOps: Project = {
    id: "proj-harborline-ops",
    publicId: "HRBL",
    slug: "harborline-ops",
    ownerId: sam.id,
    name: "Harborline Ops",
    description: "An internal logistics tracker for a small shipping operation.",
    appUrl: "https://harborline-ops.example.com",
    environment: "development",
    archived: false,
    setupStepsCompleted: 1,
    createdAt: "2026-08-10T10:05:00.000Z",
  };

  // Jordan owns nothing — the empty-workspace state.

  for (const project of [linkVault, beaconCrm, northwindStorefront, harborlineOps]) {
    store.projects.set(project.id, project);
  }

  // Seed domain entities for LinkVault
  for (const feature of linkVaultSeed.features) {
    store.features.set(feature.id, feature);
  }
  for (const testCase of linkVaultSeed.testCases) {
    store.testCases.set(testCase.id, testCase);
  }
  for (const testRun of linkVaultSeed.testRuns) {
    store.testRuns.set(testRun.id, testRun);
  }
  for (const testResult of linkVaultSeed.testResults) {
    store.testResults.set(testResult.id, testResult);
  }
  for (const issue of linkVaultSeed.issues) {
    store.issues.set(issue.id, issue);
  }

  // LinkVault's full PV-07 → ISS-14 → fix → rerun → verified activity story.
  store.activity.push(...linkVaultSeed.activity);

  store.activity.push(
    {
      id: "activity-beacon-01",
      projectId: beaconCrm.id,
      actorType: "human",
      actorName: priya.name,
      action: "created the project",
      entityType: "project",
      entityId: beaconCrm.id,
      createdAt: beaconCrm.createdAt,
    },
    {
      id: "activity-beacon-02",
      projectId: beaconCrm.id,
      actorType: "claude",
      actorName: "Claude",
      action: "discovered 6 features from the codebase",
      entityType: "feature",
      entityId: beaconCrm.id,
      createdAt: "2026-07-20T11:40:00.000Z",
    },
    {
      id: "activity-northwind-01",
      projectId: northwindStorefront.id,
      actorType: "human",
      actorName: priya.name,
      action: "archived the project after the seasonal launch",
      entityType: "project",
      entityId: northwindStorefront.id,
      createdAt: "2026-06-15T16:00:00.000Z",
    },
    {
      id: "activity-harborline-01",
      projectId: harborlineOps.id,
      actorType: "human",
      actorName: sam.name,
      action: "created the project",
      entityType: "project",
      entityId: harborlineOps.id,
      createdAt: harborlineOps.createdAt,
    },
  );

  // Claude MCP credentials + connection state (Phase 3) — one seeded example
  // per reachable status so the connected/pending/error/not-configured
  // states are all visible without manually reproducing them by hand:
  // LinkVault is connected, Beacon CRM shows a failed attempt against a
  // still-active credential (the "error" state), Northwind's credential was
  // revoked when the project was archived (back to "not configured" but
  // with audit history), and Harborline has never generated one at all.
  const linkVaultCredential: McpCredential = {
    id: "cred-linkvault",
    projectId: linkVault.id,
    status: "active",
    secretHash: hashPassword("seed-only-not-a-real-secret-linkvault"),
    displayPrefix: "vrq_live_9f2a",
    displaySuffix: "c3d1",
    createdAt: "2026-07-01T09:05:00.000Z",
    createdByName: priya.name,
  };
  store.mcpCredentials.set(linkVaultCredential.id, linkVaultCredential);
  store.mcpConnectionStates.set(linkVault.id, {
    projectId: linkVault.id,
    lastAttemptAt: "2026-08-18T07:12:00.000Z",
    lastAttemptStatus: "success",
    lastAttemptCredentialId: linkVaultCredential.id,
    lastAttemptTool: "health_check",
    lastSuccessAt: "2026-08-18T07:12:00.000Z",
    lastSuccessCredentialId: linkVaultCredential.id,
  } satisfies McpConnectionState);

  const beaconCredential: McpCredential = {
    id: "cred-beacon",
    projectId: beaconCrm.id,
    status: "active",
    secretHash: hashPassword("seed-only-not-a-real-secret-beacon"),
    displayPrefix: "vrq_live_4b7e",
    displaySuffix: "a802",
    createdAt: "2026-07-20T11:35:00.000Z",
    createdByName: priya.name,
  };
  store.mcpCredentials.set(beaconCredential.id, beaconCredential);
  store.mcpConnectionStates.set(beaconCrm.id, {
    projectId: beaconCrm.id,
    lastAttemptAt: "2026-08-17T15:48:00.000Z",
    lastAttemptStatus: "error",
    lastAttemptCredentialId: beaconCredential.id,
    lastAttemptTool: "health_check",
    lastAttemptError: "Invalid or revoked credential.",
  } satisfies McpConnectionState);

  const northwindRevokedCredential: McpCredential = {
    id: "cred-northwind",
    projectId: northwindStorefront.id,
    status: "revoked",
    secretHash: hashPassword("seed-only-not-a-real-secret-northwind"),
    displayPrefix: "vrq_live_2c91",
    displaySuffix: "77fe",
    createdAt: "2026-05-02T09:20:00.000Z",
    createdByName: priya.name,
    revokedAt: "2026-06-15T16:00:00.000Z",
    revokedByName: priya.name,
  };
  store.mcpCredentials.set(northwindRevokedCredential.id, northwindRevokedCredential);

  // Harborline Ops (Sam) intentionally has no credential and no MCP
  // activity — the "not configured", empty-activity state.

  store.activity.push(
    {
      id: "activity-linkvault-mcp-01",
      projectId: linkVault.id,
      actorType: "human",
      actorName: priya.name,
      action: "issued a new Claude MCP credential",
      entityType: "mcpConnection",
      entityId: linkVaultCredential.id,
      createdAt: linkVaultCredential.createdAt,
    },
    {
      id: "activity-linkvault-mcp-02",
      projectId: linkVault.id,
      actorType: "claude",
      actorName: "Claude",
      action: "ran a health check over MCP",
      entityType: "mcpConnection",
      entityId: linkVaultCredential.id,
      createdAt: "2026-07-01T09:08:00.000Z",
    },
    {
      id: "activity-linkvault-mcp-03",
      projectId: linkVault.id,
      actorType: "system",
      actorName: "Veriqo",
      action: "marked Claude MCP as connected after a verified request",
      entityType: "mcpConnection",
      entityId: linkVaultCredential.id,
      createdAt: "2026-07-01T09:08:01.000Z",
    },
    {
      id: "activity-linkvault-mcp-04",
      projectId: linkVault.id,
      actorType: "claude",
      actorName: "Claude",
      action: "ran a health check over MCP",
      entityType: "mcpConnection",
      entityId: linkVaultCredential.id,
      createdAt: "2026-08-18T07:12:00.000Z",
    },
    {
      id: "activity-beacon-mcp-01",
      projectId: beaconCrm.id,
      actorType: "human",
      actorName: priya.name,
      action: "issued a new Claude MCP credential",
      entityType: "mcpConnection",
      entityId: beaconCredential.id,
      createdAt: beaconCredential.createdAt,
    },
    {
      id: "activity-beacon-mcp-02",
      projectId: beaconCrm.id,
      actorType: "system",
      actorName: "Veriqo",
      action: "rejected an MCP connection attempt (invalid or revoked credential)",
      entityType: "mcpConnection",
      entityId: beaconCredential.id,
      createdAt: "2026-08-17T15:48:00.000Z",
    },
    {
      id: "activity-northwind-mcp-01",
      projectId: northwindStorefront.id,
      actorType: "human",
      actorName: priya.name,
      action: "issued a new Claude MCP credential",
      entityType: "mcpConnection",
      entityId: northwindRevokedCredential.id,
      createdAt: northwindRevokedCredential.createdAt,
    },
    {
      id: "activity-northwind-mcp-02",
      projectId: northwindStorefront.id,
      actorType: "human",
      actorName: priya.name,
      action: "revoked the Claude MCP credential",
      entityType: "mcpConnection",
      entityId: northwindRevokedCredential.id,
      createdAt: "2026-06-15T16:00:00.000Z",
    },
  );

  // One standing invite for the invite-acceptance auth state.
  const invite: Invite = {
    token: "inv_9f3a2c7b8e1d4f60",
    email: "morgan@veriqo.test",
    inviterName: priya.name,
    projectName: linkVault.name,
    role: "QA reviewer",
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  store.invites.set(invite.token, invite);
}
