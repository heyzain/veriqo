import { beforeEach, describe, expect, it } from "vitest";

import { store } from "@/server/repositories/store";
import { listActivityForProject } from "@/server/repositories/activity-repository";
import { createProjectForOwner } from "@/server/services/project-service";
import type { PublicUser } from "@/types/auth";
import type { RiskLevel } from "@/types/domain";

import {
  approveFeature,
  archiveFeature,
  bulkApproveFeatures,
  createFeatureFromDiscovery,
  editFeature,
  getFeatureDetail,
  listFeaturesForProject,
  mergeFeatures,
  restoreFeature,
  updateFeatureFromDiscovery,
  type FeatureDiscoveryInput,
} from "./feature-service";

function resetStore() {
  store.users.clear();
  store.usersByEmail.clear();
  store.tokens.clear();
  store.invites.clear();
  store.projects.clear();
  store.features.clear();
  store.testCases.clear();
  store.testRuns.clear();
  store.testResults.clear();
  store.issues.clear();
  store.mcpCredentials.clear();
  store.mcpConnectionStates.clear();
  store.activity.length = 0;
  store.seeded = true; // Skip demo seeding — these tests own their own fixtures.
}

const owner: PublicUser = {
  id: "user-owner",
  name: "Priya",
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

function discoveryInput(overrides: Partial<FeatureDiscoveryInput> = {}): FeatureDiscoveryInput {
  return {
    name: "Authentication",
    description: "Sign in and sign up.",
    risk: "high" as RiskLevel,
    acceptanceCriteria: ["A user can sign in with valid credentials."],
    roles: ["Any user"],
    dependencies: [],
    sourceReferences: [{ path: "src/auth.ts" }],
    ...overrides,
  };
}

describe("feature-service — Claude-facing creation", () => {
  it("defaults every created feature to needsReview — nothing Claude generates is auto-approved", () => {
    const project = makeProject("Alpha");
    const result = createFeatureFromDiscovery(project, discoveryInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.feature.status).toBe("needsReview");
    expect(result.data.feature.createdBySource).toBe("claude");
  });

  it("advances the project to setup step 3 on first discovered feature, and no further on later ones", () => {
    const project = makeProject("Beta");
    expect(project.setupStepsCompleted).toBe(1);

    const first = createFeatureFromDiscovery(project, discoveryInput());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.project.setupStepsCompleted).toBe(3);

    const second = createFeatureFromDiscovery(first.data.project, discoveryInput({ name: "Search" }));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.project.setupStepsCompleted).toBe(3);
  });

  it("is idempotent: retrying create_feature with the same idempotencyKey never creates a duplicate", () => {
    const project = makeProject("Gamma");
    const input = discoveryInput({ idempotencyKey: "discover-authentication" });

    const first = createFeatureFromDiscovery(project, input);
    const second = createFeatureFromDiscovery(project, input);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.data.feature.id).toBe(first.data.feature.id);
    expect(listFeaturesForProject(project)).toHaveLength(1);
  });

  it("surfaces a possible duplicate instead of silently creating or silently merging", () => {
    const project = makeProject("Delta");
    const original = createFeatureFromDiscovery(project, discoveryInput({ name: "Search" }));
    expect(original.ok).toBe(true);
    if (!original.ok) return;

    const near = createFeatureFromDiscovery(project, discoveryInput({ name: "Full-text Search" }));
    expect(near.ok).toBe(true);
    if (!near.ok) return;

    expect(near.data.feature.possibleDuplicateOfId).toBe(original.data.feature.id);
    expect(listFeaturesForProject(project)).toHaveLength(2);
  });

  it("clears a possible-duplicate flag once a human approves or edits the feature", () => {
    const project = makeProject("Upsilon");
    const original = createFeatureFromDiscovery(project, discoveryInput({ name: "Authentication" }));
    if (!original.ok) throw new Error("setup failed");
    const flagged = createFeatureFromDiscovery(
      original.data.project,
      discoveryInput({ name: "Two-Factor Authentication", dependencies: ["FEAT-01"] }),
    );
    if (!flagged.ok) throw new Error("setup failed");
    expect(flagged.data.feature.possibleDuplicateOfId).toBe(original.data.feature.id);

    const approved = approveFeature(flagged.data.project, flagged.data.feature.publicId, owner.name);
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.data.feature.possibleDuplicateOfId).toBeUndefined();
  });

  it("rejects a dependency that doesn't exist in the project", () => {
    const project = makeProject("Epsilon");
    const result = createFeatureFromDiscovery(project, discoveryInput({ dependencies: ["FEAT-99"] }));
    expect(result.ok).toBe(false);
  });

  it("never leaks a feature across projects", () => {
    const projectA = makeProject("Zeta");
    const projectB = makeProject("Eta");
    createFeatureFromDiscovery(projectA, discoveryInput());

    expect(listFeaturesForProject(projectA)).toHaveLength(1);
    expect(listFeaturesForProject(projectB)).toHaveLength(0);
    expect(getFeatureDetail(projectB, "FEAT-01")).toBeNull();
  });
});

describe("feature-service — Claude-facing updates", () => {
  it("moves an approved feature to `changed` and snapshots the prior content for the diff view", () => {
    const project = makeProject("Theta");
    const created = createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    approveFeature(created.data.project, created.data.feature.publicId, owner.name);

    const updated = updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, {
      description: "Sign in, sign up, and password reset.",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.feature.status).toBe("changed");
    expect(updated.data.feature.previousSnapshot?.description).toBe(discoveryInput().description);
  });

  it("keeps comparing against the last human-approved snapshot across repeated Claude updates", () => {
    const project = makeProject("Iota");
    const created = createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    approveFeature(created.data.project, created.data.feature.publicId, owner.name);

    const firstUpdate = updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, {
      description: "First revision.",
    });
    if (!firstUpdate.ok) throw new Error("update failed");

    const secondUpdate = updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, {
      description: "Second revision.",
    });
    expect(secondUpdate.ok).toBe(true);
    if (!secondUpdate.ok) return;

    // Still the originally-approved description, not "First revision."
    expect(secondUpdate.data.feature.previousSnapshot?.description).toBe(discoveryInput().description);
  });

  it("refuses to update an archived feature", () => {
    const project = makeProject("Kappa");
    const created = createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    archiveFeature(project, created.data.feature.publicId, owner.name);

    const result = updateFeatureFromDiscovery(project, created.data.feature.publicId, { description: "x" });
    expect(result.ok).toBe(false);
  });
});

describe("feature-service — human review actions", () => {
  it("clears the pending diff snapshot on approval", () => {
    const project = makeProject("Lambda");
    const created = createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    approveFeature(created.data.project, created.data.feature.publicId, owner.name);
    updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, { description: "revised" });

    const reapproved = approveFeature(created.data.project, created.data.feature.publicId, owner.name);
    expect(reapproved.ok).toBe(true);
    if (!reapproved.ok) return;
    expect(reapproved.data.feature.status).toBe("approved");
    expect(reapproved.data.feature.previousSnapshot).toBeUndefined();
  });

  it("advances to setup step 4 only once every discovered feature is approved or archived", () => {
    const project = makeProject("Mu");
    const a = createFeatureFromDiscovery(project, discoveryInput({ name: "Auth" }));
    if (!a.ok) throw new Error("setup failed");
    const b = createFeatureFromDiscovery(a.data.project, discoveryInput({ name: "Search" }));
    if (!b.ok) throw new Error("setup failed");

    const afterFirstApproval = approveFeature(b.data.project, a.data.feature.publicId, owner.name);
    expect(afterFirstApproval.ok).toBe(true);
    if (!afterFirstApproval.ok) return;
    expect(afterFirstApproval.data.project.setupStepsCompleted).toBe(3); // one still pending

    const afterSecond = archiveFeature(afterFirstApproval.data.project, b.data.feature.publicId, owner.name);
    expect(afterSecond.ok).toBe(true);
    if (!afterSecond.ok) return;
    expect(afterSecond.data.project.setupStepsCompleted).toBe(4);
  });

  it("bulk-approves only the features that can legally move, and reports the real count", () => {
    const project = makeProject("Nu");
    const a = createFeatureFromDiscovery(project, discoveryInput({ name: "Auth" }));
    if (!a.ok) throw new Error("setup failed");
    const b = createFeatureFromDiscovery(a.data.project, discoveryInput({ name: "Search" }));
    if (!b.ok) throw new Error("setup failed");
    archiveFeature(b.data.project, b.data.feature.publicId, owner.name);

    const result = bulkApproveFeatures(
      b.data.project,
      [a.data.feature.publicId, b.data.feature.publicId, "FEAT-99"],
      owner.name,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.approvedCount).toBe(1);
  });

  it("edit resolves a pending Claude diff and validates dependencies", () => {
    const project = makeProject("Xi");
    const created = createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    approveFeature(created.data.project, created.data.feature.publicId, owner.name);
    updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, { description: "revised" });

    const badEdit = editFeature(
      created.data.project,
      created.data.feature.publicId,
      {
        name: "Authentication",
        description: "Edited.",
        risk: "high",
        acceptanceCriteria: ["x"],
        roles: [],
        dependencies: ["FEAT-99"],
      },
      owner.name,
    );
    expect(badEdit.ok).toBe(false);

    const goodEdit = editFeature(
      created.data.project,
      created.data.feature.publicId,
      {
        name: "Authentication",
        description: "Edited by a human.",
        risk: "high",
        acceptanceCriteria: ["x"],
        roles: [],
        dependencies: [],
      },
      owner.name,
    );
    expect(goodEdit.ok).toBe(true);
    if (!goodEdit.ok) return;
    expect(goodEdit.data.feature.previousSnapshot).toBeUndefined();
    expect(goodEdit.data.feature.description).toBe("Edited by a human.");
  });
});

describe("feature-service — merge", () => {
  it("archives the merged feature, unions content onto the survivor, and re-points its test cases/issues", () => {
    const project = makeProject("Omicron");
    const survivor = createFeatureFromDiscovery(project, discoveryInput({ name: "Search" }));
    if (!survivor.ok) throw new Error("setup failed");
    const duplicate = createFeatureFromDiscovery(
      survivor.data.project,
      discoveryInput({ name: "Full-text Search", acceptanceCriteria: ["Ranks by relevance."] }),
    );
    if (!duplicate.ok) throw new Error("setup failed");

    store.testCases.set("tc-1", {
      id: "tc-1",
      publicId: "TC-01",
      projectId: project.id,
      featureId: duplicate.data.feature.id,
      title: "Search returns ranked results",
      status: "ready",
      priority: "medium",
      steps: [],
      expectedResult: "Ranked results.",
      roles: [],
      environments: [],
      createdBySource: "claude",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = mergeFeatures(project, survivor.data.feature.publicId, duplicate.data.feature.publicId, owner.name);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.archived.status).toBe("archived");
    expect(result.data.survivor.acceptanceCriteria).toContain("Ranks by relevance.");
    expect(store.testCases.get("tc-1")?.featureId).toBe(survivor.data.feature.id);
  });

  it("refuses to merge a feature into itself or an archived feature", () => {
    const project = makeProject("Pi");
    const created = createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");

    expect(
      mergeFeatures(project, created.data.feature.publicId, created.data.feature.publicId, owner.name).ok,
    ).toBe(false);

    archiveFeature(project, created.data.feature.publicId, owner.name);
    const other = createFeatureFromDiscovery(project, discoveryInput({ name: "Search" }));
    if (!other.ok) throw new Error("setup failed");
    expect(mergeFeatures(project, other.data.feature.publicId, created.data.feature.publicId, owner.name).ok).toBe(
      false,
    );
  });
});

describe("feature-service — restore and activity", () => {
  it("restoring an archived feature returns it to draft, not silently back to its previous state", () => {
    const project = makeProject("Rho");
    const created = createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    approveFeature(created.data.project, created.data.feature.publicId, owner.name);
    archiveFeature(created.data.project, created.data.feature.publicId, owner.name);

    const restored = restoreFeature(created.data.project, created.data.feature.publicId, owner.name);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.data.feature.status).toBe("draft");
  });

  it("every mutation records an activity event scoped to the project", () => {
    const project = makeProject("Sigma");
    const created = createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    approveFeature(created.data.project, created.data.feature.publicId, owner.name);

    const activity = listActivityForProject(project.id);
    expect(activity.some((event) => event.action.includes("discovered"))).toBe(true);
    expect(activity.some((event) => event.action.includes("approved"))).toBe(true);
  });
});
