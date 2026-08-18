import { beforeEach, describe, expect, it } from "vitest";

import { store } from "@/server/repositories/store";
import { listActivityForProject } from "@/server/repositories/activity-repository";
import {
  archiveFeature,
  createFeatureFromDiscovery,
  updateFeatureFromDiscovery,
  approveFeature,
} from "@/server/services/feature-service";
import { createProjectForOwner } from "@/server/services/project-service";
import type { PublicUser } from "@/types/auth";
import type { RiskLevel } from "@/types/domain";

import {
  approveTestCase,
  archiveTestCase,
  bulkApproveTestCases,
  createTestCaseFromGeneration,
  duplicateTestCase,
  editTestCase,
  listTestCasesForProject,
  restoreTestCase,
  updateTestCaseFromGeneration,
  type TestCaseGenerationInput,
} from "./test-case-service";

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

function makeApprovedFeature(projectName: string, featureName = "Authentication") {
  const project = makeProject(projectName);
  const created = createFeatureFromDiscovery(project, {
    name: featureName,
    description: "Sign in and sign up.",
    risk: "high" as RiskLevel,
    acceptanceCriteria: ["A user can sign in with valid credentials."],
    roles: ["Any user"],
    dependencies: [],
    sourceReferences: [{ path: "src/auth.ts" }],
  });
  if (!created.ok) throw new Error("setup failed");
  const approved = approveFeature(created.data.project, created.data.feature.publicId, owner.name);
  if (!approved.ok) throw new Error("setup failed");
  return { project: approved.data.project, feature: approved.data.feature };
}

function generationInput(featureId: string, overrides: Partial<TestCaseGenerationInput> = {}): TestCaseGenerationInput {
  return {
    featureId,
    title: "Sign in with valid credentials starts a session",
    priority: "high",
    steps: ["Open the sign-in form.", "Enter valid credentials.", "Submit."],
    expectedResult: "The user is signed in.",
    roles: ["Any user"],
    environments: ["Chrome"],
    ...overrides,
  };
}

describe("test-case-service — Claude-facing creation", () => {
  it("defaults every generated test case to inReview — nothing Claude generates is auto-approved", () => {
    const { project, feature } = makeApprovedFeature("Alpha");
    const result = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.testCase.status).toBe("inReview");
    expect(result.data.testCase.createdBySource).toBe("claude");
  });

  it("advances the project to setup step 5 on first generated test case, and no further on later ones", () => {
    const { project, feature } = makeApprovedFeature("Beta");
    expect(project.setupStepsCompleted).toBeLessThan(5);

    const first = createTestCaseFromGeneration(project, generationInput(feature.publicId, { idempotencyKey: "a" }));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.project.setupStepsCompleted).toBe(5);

    const second = createTestCaseFromGeneration(
      first.data.project,
      generationInput(feature.publicId, { title: "Second case", idempotencyKey: "b" }),
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.project.setupStepsCompleted).toBe(5);
  });

  it("is idempotent: retrying create_test_case with the same idempotencyKey never creates a duplicate", () => {
    const { project, feature } = makeApprovedFeature("Gamma");
    const input = generationInput(feature.publicId, { idempotencyKey: "signin-session" });

    const first = createTestCaseFromGeneration(project, input);
    const second = createTestCaseFromGeneration(project, input);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.data.testCase.id).toBe(first.data.testCase.id);
    expect(listTestCasesForProject(project)).toHaveLength(1);
  });

  it("rejects an unknown parent feature", () => {
    const project = makeProject("Delta");
    const result = createTestCaseFromGeneration(project, generationInput("FEAT-99"));
    expect(result.ok).toBe(false);
  });

  it("refuses to add a test case to an archived feature", () => {
    const { project, feature } = makeApprovedFeature("Epsilon");
    archiveFeature(project, feature.publicId, owner.name);

    const result = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    expect(result.ok).toBe(false);
  });

  it("surfaces a possible duplicate scoped to the same feature, not project-wide", () => {
    const { project, feature } = makeApprovedFeature("Zeta");
    const other = createFeatureFromDiscovery(project, {
      name: "Search",
      description: "Full-text search.",
      risk: "medium",
      acceptanceCriteria: ["Matches titles."],
      roles: [],
      dependencies: [],
      sourceReferences: [],
    });
    if (!other.ok) throw new Error("setup failed");
    const approvedOther = approveFeature(other.data.project, other.data.feature.publicId, owner.name);
    if (!approvedOther.ok) throw new Error("setup failed");

    const original = createTestCaseFromGeneration(
      approvedOther.data.project,
      generationInput(feature.publicId, { title: "Session starts on valid login" }),
    );
    if (!original.ok) throw new Error("setup failed");

    // Same wording on a *different* feature must not be flagged.
    const onOtherFeature = createTestCaseFromGeneration(
      original.data.project,
      generationInput(approvedOther.data.feature.publicId, { title: "Session starts on valid login" }),
    );
    expect(onOtherFeature.ok).toBe(true);
    if (!onOtherFeature.ok) return;
    expect(onOtherFeature.data.testCase.possibleDuplicateOfId).toBeUndefined();

    // Near-duplicate wording on the *same* feature must be flagged.
    const nearDuplicate = createTestCaseFromGeneration(
      onOtherFeature.data.project,
      generationInput(feature.publicId, { title: "Session starts on valid login for returning users" }),
    );
    expect(nearDuplicate.ok).toBe(true);
    if (!nearDuplicate.ok) return;
    expect(nearDuplicate.data.testCase.possibleDuplicateOfId).toBe(original.data.testCase.id);
  });

  it("never leaks a test case across projects", () => {
    const { project: projectA, feature: featureA } = makeApprovedFeature("Eta");
    const projectB = makeProject("Theta");
    createTestCaseFromGeneration(projectA, generationInput(featureA.publicId));

    expect(listTestCasesForProject(projectA)).toHaveLength(1);
    expect(listTestCasesForProject(projectB)).toHaveLength(0);
  });
});

describe("test-case-service — Claude-facing updates", () => {
  it("moves a ready case to needsUpdate and snapshots the prior content for the diff view", () => {
    const { project, feature } = makeApprovedFeature("Iota");
    const created = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    if (!created.ok) throw new Error("setup failed");
    approveTestCase(created.data.project, created.data.testCase.publicId, owner.name);

    const updated = updateTestCaseFromGeneration(created.data.project, created.data.testCase.publicId, {
      expectedResult: "The user is signed in and redirected to their dashboard.",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.testCase.status).toBe("needsUpdate");
    expect(updated.data.testCase.previousSnapshot?.expectedResult).toBe(generationInput(feature.publicId).expectedResult);
  });

  it("refuses to update an archived test case", () => {
    const { project, feature } = makeApprovedFeature("Kappa");
    const created = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    if (!created.ok) throw new Error("setup failed");
    archiveTestCase(project, created.data.testCase.publicId, owner.name);

    const result = updateTestCaseFromGeneration(project, created.data.testCase.publicId, { title: "x" });
    expect(result.ok).toBe(false);
  });
});

describe("test-case-service — needs-update cascade from a changed feature", () => {
  it("moves a feature's ready test cases to needsUpdate when the feature is re-analyzed and becomes changed", () => {
    const { project, feature } = makeApprovedFeature("Lambda");
    const created = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    if (!created.ok) throw new Error("setup failed");
    approveTestCase(created.data.project, created.data.testCase.publicId, owner.name);

    const featureUpdate = updateFeatureFromDiscovery(created.data.project, feature.publicId, {
      description: "Sign in, sign up, and password reset.",
    });
    expect(featureUpdate.ok).toBe(true);
    if (!featureUpdate.ok) return;
    expect(featureUpdate.data.feature.status).toBe("changed");

    const cascaded = listTestCasesForProject(featureUpdate.data.project).find(
      (tc) => tc.publicId === created.data.testCase.publicId,
    );
    expect(cascaded?.status).toBe("needsUpdate");
    // The cascade doesn't rewrite the case's own content — nothing to diff there.
    expect(cascaded?.previousSnapshot).toBeUndefined();

    const activity = listActivityForProject(project.id);
    expect(activity.some((event) => event.action.includes("needing update"))).toBe(true);
  });

  it("doesn't touch a test case that isn't ready yet", () => {
    const { project, feature } = makeApprovedFeature("Mu");
    const created = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    if (!created.ok) throw new Error("setup failed");
    // Left `inReview` — never approved.

    const featureUpdate = updateFeatureFromDiscovery(created.data.project, feature.publicId, {
      description: "Revised.",
    });
    if (!featureUpdate.ok) throw new Error("setup failed");

    const stillInReview = listTestCasesForProject(featureUpdate.data.project).find(
      (tc) => tc.publicId === created.data.testCase.publicId,
    );
    expect(stillInReview?.status).toBe("inReview");
  });
});

describe("test-case-service — human review actions", () => {
  it("bulk-approves only the test cases that can legally move, and reports the real count", () => {
    const { project, feature } = makeApprovedFeature("Nu");
    const a = createTestCaseFromGeneration(project, generationInput(feature.publicId, { idempotencyKey: "a" }));
    if (!a.ok) throw new Error("setup failed");
    const b = createTestCaseFromGeneration(
      a.data.project,
      generationInput(feature.publicId, { title: "Second case", idempotencyKey: "b" }),
    );
    if (!b.ok) throw new Error("setup failed");
    archiveTestCase(b.data.project, b.data.testCase.publicId, owner.name);

    const result = bulkApproveTestCases(
      b.data.project,
      [a.data.testCase.publicId, b.data.testCase.publicId, "TC-99"],
      owner.name,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.approvedCount).toBe(1);
  });

  it("edit resolves a pending diff and a possible-duplicate flag", () => {
    const { project, feature } = makeApprovedFeature("Xi");
    const created = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    if (!created.ok) throw new Error("setup failed");
    approveTestCase(created.data.project, created.data.testCase.publicId, owner.name);
    updateTestCaseFromGeneration(created.data.project, created.data.testCase.publicId, { title: "Revised title" });

    const edited = editTestCase(
      created.data.project,
      created.data.testCase.publicId,
      {
        title: "Session starts on valid login",
        priority: "high",
        steps: ["Open sign-in.", "Enter valid credentials.", "Submit."],
        expectedResult: "The user is signed in.",
        roles: [],
        environments: [],
      },
      owner.name,
    );
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.data.testCase.previousSnapshot).toBeUndefined();
    expect(edited.data.testCase.title).toBe("Session starts on valid login");
  });

  it("restoring an archived test case returns it to draft, not silently back to its previous state", () => {
    const { project, feature } = makeApprovedFeature("Omicron");
    const created = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    if (!created.ok) throw new Error("setup failed");
    approveTestCase(created.data.project, created.data.testCase.publicId, owner.name);
    archiveTestCase(created.data.project, created.data.testCase.publicId, owner.name);

    const restored = restoreTestCase(created.data.project, created.data.testCase.publicId, owner.name);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.data.testCase.status).toBe("draft");
  });

  it("duplicate clones the case as a draft flagged against its source", () => {
    const { project, feature } = makeApprovedFeature("Pi");
    const created = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    if (!created.ok) throw new Error("setup failed");

    const cloned = duplicateTestCase(created.data.project, created.data.testCase.publicId, owner.name);
    expect(cloned.ok).toBe(true);
    if (!cloned.ok) return;
    expect(cloned.data.testCase.status).toBe("draft");
    expect(cloned.data.testCase.possibleDuplicateOfId).toBe(created.data.testCase.id);
    expect(cloned.data.testCase.publicId).not.toBe(created.data.testCase.publicId);
    expect(listTestCasesForProject(created.data.project)).toHaveLength(2);
  });

  it("every mutation records an activity event scoped to the project", () => {
    const { project, feature } = makeApprovedFeature("Rho");
    const created = createTestCaseFromGeneration(project, generationInput(feature.publicId));
    if (!created.ok) throw new Error("setup failed");
    approveTestCase(created.data.project, created.data.testCase.publicId, owner.name);

    const activity = listActivityForProject(project.id);
    expect(activity.some((event) => event.action.includes("generated"))).toBe(true);
    expect(activity.some((event) => event.action.includes("approved"))).toBe(true);
  });
});
