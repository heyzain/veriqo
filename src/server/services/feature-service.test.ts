import { beforeEach, describe, expect, it } from "vitest";

import { TestCaseModel } from "@/server/db/models/test-case.model";
import { listActivityForProject } from "@/server/repositories/activity-repository";
import { resetTestDb } from "@/test/db";
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

const owner: PublicUser = {
  id: "user-owner",
  name: "Priya",
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
  it("defaults every created feature to needsReview — nothing Claude generates is auto-approved", async () => {
    const project = await makeProject("Alpha");
    const result = await createFeatureFromDiscovery(project, discoveryInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.feature.status).toBe("needsReview");
    expect(result.data.feature.createdBySource).toBe("claude");
  });

  it("advances the project to setup step 3 on first discovered feature, and no further on later ones", async () => {
    const project = await makeProject("Beta");
    expect(project.setupStepsCompleted).toBe(1);

    const first = await createFeatureFromDiscovery(project, discoveryInput());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.project.setupStepsCompleted).toBe(3);

    const second = await createFeatureFromDiscovery(first.data.project, discoveryInput({ name: "Search" }));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.project.setupStepsCompleted).toBe(3);
  });

  it("is idempotent: retrying create_feature with the same idempotencyKey never creates a duplicate", async () => {
    const project = await makeProject("Gamma");
    const input = discoveryInput({ idempotencyKey: "discover-authentication" });

    const first = await createFeatureFromDiscovery(project, input);
    const second = await createFeatureFromDiscovery(project, input);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.data.feature.id).toBe(first.data.feature.id);
    expect(await listFeaturesForProject(project)).toHaveLength(1);
  });

  it("surfaces a possible duplicate instead of silently creating or silently merging", async () => {
    const project = await makeProject("Delta");
    const original = await createFeatureFromDiscovery(project, discoveryInput({ name: "Search" }));
    expect(original.ok).toBe(true);
    if (!original.ok) return;

    const near = await createFeatureFromDiscovery(project, discoveryInput({ name: "Full-text Search" }));
    expect(near.ok).toBe(true);
    if (!near.ok) return;

    expect(near.data.feature.possibleDuplicateOfId).toBe(original.data.feature.id);
    expect(await listFeaturesForProject(project)).toHaveLength(2);
  });

  it("clears a possible-duplicate flag once a human approves or edits the feature", async () => {
    const project = await makeProject("Upsilon");
    const original = await createFeatureFromDiscovery(project, discoveryInput({ name: "Authentication" }));
    if (!original.ok) throw new Error("setup failed");
    const flagged = await createFeatureFromDiscovery(
      original.data.project,
      discoveryInput({ name: "Two-Factor Authentication", dependencies: ["FEAT-01"] }),
    );
    if (!flagged.ok) throw new Error("setup failed");
    expect(flagged.data.feature.possibleDuplicateOfId).toBe(original.data.feature.id);

    const approved = await approveFeature(flagged.data.project, flagged.data.feature.publicId, owner.name);
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.data.feature.possibleDuplicateOfId).toBeUndefined();
  });

  it("rejects a dependency that doesn't exist in the project", async () => {
    const project = await makeProject("Epsilon");
    const result = await createFeatureFromDiscovery(project, discoveryInput({ dependencies: ["FEAT-99"] }));
    expect(result.ok).toBe(false);
  });

  it("never leaks a feature across projects", async () => {
    const projectA = await makeProject("Zeta");
    const projectB = await makeProject("Eta");
    await createFeatureFromDiscovery(projectA, discoveryInput());

    expect(await listFeaturesForProject(projectA)).toHaveLength(1);
    expect(await listFeaturesForProject(projectB)).toHaveLength(0);
    expect(await getFeatureDetail(projectB, "FEAT-01")).toBeNull();
  });
});

describe("feature-service — Claude-facing updates", () => {
  it("moves an approved feature to `changed` and snapshots the prior content for the diff view", async () => {
    const project = await makeProject("Theta");
    const created = await createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    await approveFeature(created.data.project, created.data.feature.publicId, owner.name);

    const updated = await updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, {
      description: "Sign in, sign up, and password reset.",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.feature.status).toBe("changed");
    expect(updated.data.feature.previousSnapshot?.description).toBe(discoveryInput().description);
  });

  it("keeps comparing against the last human-approved snapshot across repeated Claude updates", async () => {
    const project = await makeProject("Iota");
    const created = await createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    await approveFeature(created.data.project, created.data.feature.publicId, owner.name);

    const firstUpdate = await updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, {
      description: "First revision.",
    });
    if (!firstUpdate.ok) throw new Error("update failed");

    const secondUpdate = await updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, {
      description: "Second revision.",
    });
    expect(secondUpdate.ok).toBe(true);
    if (!secondUpdate.ok) return;

    // Still the originally-approved description, not "First revision."
    expect(secondUpdate.data.feature.previousSnapshot?.description).toBe(discoveryInput().description);
  });

  it("refuses to update an archived feature", async () => {
    const project = await makeProject("Kappa");
    const created = await createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    await archiveFeature(project, created.data.feature.publicId, owner.name);

    const result = await updateFeatureFromDiscovery(project, created.data.feature.publicId, { description: "x" });
    expect(result.ok).toBe(false);
  });
});

describe("feature-service — human review actions", () => {
  it("clears the pending diff snapshot on approval", async () => {
    const project = await makeProject("Lambda");
    const created = await createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    await approveFeature(created.data.project, created.data.feature.publicId, owner.name);
    await updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, { description: "revised" });

    const reapproved = await approveFeature(created.data.project, created.data.feature.publicId, owner.name);
    expect(reapproved.ok).toBe(true);
    if (!reapproved.ok) return;
    expect(reapproved.data.feature.status).toBe("approved");
    expect(reapproved.data.feature.previousSnapshot).toBeUndefined();
  });

  it("advances to setup step 4 only once every discovered feature is approved or archived", async () => {
    const project = await makeProject("Mu");
    const a = await createFeatureFromDiscovery(project, discoveryInput({ name: "Auth" }));
    if (!a.ok) throw new Error("setup failed");
    const b = await createFeatureFromDiscovery(a.data.project, discoveryInput({ name: "Search" }));
    if (!b.ok) throw new Error("setup failed");

    const afterFirstApproval = await approveFeature(b.data.project, a.data.feature.publicId, owner.name);
    expect(afterFirstApproval.ok).toBe(true);
    if (!afterFirstApproval.ok) return;
    expect(afterFirstApproval.data.project.setupStepsCompleted).toBe(3); // one still pending

    const afterSecond = await archiveFeature(afterFirstApproval.data.project, b.data.feature.publicId, owner.name);
    expect(afterSecond.ok).toBe(true);
    if (!afterSecond.ok) return;
    expect(afterSecond.data.project.setupStepsCompleted).toBe(4);
  });

  it("bulk-approves only the features that can legally move, and reports the real count", async () => {
    const project = await makeProject("Nu");
    const a = await createFeatureFromDiscovery(project, discoveryInput({ name: "Auth" }));
    if (!a.ok) throw new Error("setup failed");
    const b = await createFeatureFromDiscovery(a.data.project, discoveryInput({ name: "Search" }));
    if (!b.ok) throw new Error("setup failed");
    await archiveFeature(b.data.project, b.data.feature.publicId, owner.name);

    const result = await bulkApproveFeatures(
      b.data.project,
      [a.data.feature.publicId, b.data.feature.publicId, "FEAT-99"],
      owner.name,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.approvedCount).toBe(1);
  });

  it("edit resolves a pending Claude diff and validates dependencies", async () => {
    const project = await makeProject("Xi");
    const created = await createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    await approveFeature(created.data.project, created.data.feature.publicId, owner.name);
    await updateFeatureFromDiscovery(created.data.project, created.data.feature.publicId, { description: "revised" });

    const badEdit = await editFeature(
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

    const goodEdit = await editFeature(
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
  it("archives the merged feature, unions content onto the survivor, and re-points its test cases/issues", async () => {
    const project = await makeProject("Omicron");
    const survivor = await createFeatureFromDiscovery(project, discoveryInput({ name: "Search" }));
    if (!survivor.ok) throw new Error("setup failed");
    const duplicate = await createFeatureFromDiscovery(
      survivor.data.project,
      discoveryInput({ name: "Full-text Search", acceptanceCriteria: ["Ranks by relevance."] }),
    );
    if (!duplicate.ok) throw new Error("setup failed");

    await TestCaseModel.create({
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

    const result = await mergeFeatures(project, survivor.data.feature.publicId, duplicate.data.feature.publicId, owner.name);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.archived.status).toBe("archived");
    expect(result.data.survivor.acceptanceCriteria).toContain("Ranks by relevance.");
    const rePointed = await TestCaseModel.findOne({ id: "tc-1" }).lean();
    expect(rePointed?.featureId).toBe(survivor.data.feature.id);
  });

  it("refuses to merge a feature into itself or an archived feature", async () => {
    const project = await makeProject("Pi");
    const created = await createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");

    expect(
      (await mergeFeatures(project, created.data.feature.publicId, created.data.feature.publicId, owner.name)).ok,
    ).toBe(false);

    await archiveFeature(project, created.data.feature.publicId, owner.name);
    const other = await createFeatureFromDiscovery(project, discoveryInput({ name: "Search" }));
    if (!other.ok) throw new Error("setup failed");
    expect(
      (await mergeFeatures(project, other.data.feature.publicId, created.data.feature.publicId, owner.name)).ok,
    ).toBe(false);
  });
});

describe("feature-service — restore and activity", () => {
  it("restoring an archived feature returns it to draft, not silently back to its previous state", async () => {
    const project = await makeProject("Rho");
    const created = await createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    await approveFeature(created.data.project, created.data.feature.publicId, owner.name);
    await archiveFeature(created.data.project, created.data.feature.publicId, owner.name);

    const restored = await restoreFeature(created.data.project, created.data.feature.publicId, owner.name);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.data.feature.status).toBe("draft");
  });

  it("every mutation records an activity event scoped to the project", async () => {
    const project = await makeProject("Sigma");
    const created = await createFeatureFromDiscovery(project, discoveryInput());
    if (!created.ok) throw new Error("setup failed");
    await approveFeature(created.data.project, created.data.feature.publicId, owner.name);

    const activity = await listActivityForProject(project.id);
    expect(activity.some((event) => event.action.includes("discovered"))).toBe(true);
    expect(activity.some((event) => event.action.includes("approved"))).toBe(true);
  });
});
