import { beforeEach, describe, expect, it } from "vitest";

import { listActivityForProject } from "@/server/repositories/activity-repository";
import { store } from "@/server/repositories/store";
import { approveFeature, createFeatureFromDiscovery } from "@/server/services/feature-service";
import { createProjectForOwner } from "@/server/services/project-service";
import {
  archiveTestCase,
  createTestCaseFromGeneration,
  type TestCaseGenerationInput,
} from "@/server/services/test-case-service";
import type { PublicUser } from "@/types/auth";

import {
  createTestRun,
  getTestRunDetail,
  listTestRunsForProject,
  pauseTestRun,
  startTestRun,
  submitTestResult,
  type CreateTestRunInput,
} from "./test-run-service";

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

/** A project with one approved feature and two ready test cases — enough to build a run. */
function makeProjectWithReadyCases(projectName: string) {
  const project = makeProject(projectName);
  const featureResult = createFeatureFromDiscovery(project, {
    name: "Authentication",
    description: "Sign in and sign up.",
    risk: "high",
    acceptanceCriteria: ["A user can sign in with valid credentials."],
    roles: ["Any user"],
    dependencies: [],
    sourceReferences: [{ path: "src/auth.ts" }],
  });
  if (!featureResult.ok) throw new Error("setup failed");
  const approvedFeature = approveFeature(featureResult.data.project, featureResult.data.feature.publicId, owner.name);
  if (!approvedFeature.ok) throw new Error("setup failed");

  const caseOne = createTestCaseFromGeneration(approvedFeature.data.project, generationInput(approvedFeature.data.feature.publicId));
  if (!caseOne.ok) throw new Error("setup failed");
  const caseTwo = createTestCaseFromGeneration(
    caseOne.data.project,
    generationInput(approvedFeature.data.feature.publicId, { title: "Sign in with an invalid password fails", idempotencyKey: "b" }),
  );
  if (!caseTwo.ok) throw new Error("setup failed");

  return { project: caseTwo.data.project, feature: approvedFeature.data.feature, caseOne: caseOne.data.testCase, caseTwo: caseTwo.data.testCase };
}

function createRunInput(overrides: Partial<CreateTestRunInput> = {}): CreateTestRunInput {
  return {
    name: "Release Candidate 1",
    build: "1.0.0-rc.1",
    environment: "Staging",
    browser: "Chrome",
    testCaseIds: [],
    ...overrides,
  };
}

describe("test-run-service — creating a run", () => {
  it("creates a planned run with a notRun result pre-created for every selected case", () => {
    const { project, caseOne, caseTwo } = makeProjectWithReadyCases("Alpha");

    const result = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId, caseTwo.publicId] }), owner.name);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.testRun.status).toBe("planned");
    expect(result.data.testRun.selectedTestCaseIds).toEqual([caseOne.id, caseTwo.id]);

    const detail = getTestRunDetail(result.data.project, result.data.testRun.publicId);
    expect(detail?.items).toHaveLength(2);
    expect(detail?.items.every((item) => item.result.status === "notRun")).toBe(true);
    expect(detail?.progress.total).toBe(2);
    expect(detail?.progress.notRun).toBe(2);
  });

  it("advances the project to setup step 6 on the first created run, and no further on later ones", () => {
    const { project, caseOne } = makeProjectWithReadyCases("Beta");
    expect(project.setupStepsCompleted).toBeLessThan(6);

    const first = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.project.setupStepsCompleted).toBe(6);

    const second = createTestRun(first.data.project, createRunInput({ name: "Run 2", testCaseIds: [caseOne.publicId] }), owner.name);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.project.setupStepsCompleted).toBe(6);
  });

  it("rejects an unknown test case", () => {
    const { project } = makeProjectWithReadyCases("Gamma");
    const result = createTestRun(project, createRunInput({ testCaseIds: ["TC-99"] }), owner.name);
    expect(result.ok).toBe(false);
  });

  it("refuses to add an archived test case to a run", () => {
    const { project, caseOne } = makeProjectWithReadyCases("Delta");
    archiveTestCase(project, caseOne.publicId, owner.name);

    const result = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    expect(result.ok).toBe(false);
  });

  it("requires at least one test case", () => {
    const { project } = makeProjectWithReadyCases("Epsilon");
    const result = createTestRun(project, createRunInput({ testCaseIds: [] }), owner.name);
    expect(result.ok).toBe(false);
  });

  it("never leaks a run across projects", () => {
    const { project: projectA, caseOne } = makeProjectWithReadyCases("Zeta");
    const projectB = makeProject("Eta");
    createTestRun(projectA, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);

    expect(listTestRunsForProject(projectA)).toHaveLength(1);
    expect(listTestRunsForProject(projectB)).toHaveLength(0);
  });

  it("records activity scoped to the project", () => {
    const { project, caseOne } = makeProjectWithReadyCases("Theta");
    createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);

    const activity = listActivityForProject(project.id);
    expect(activity.some((event) => event.action.includes("created") && event.action.includes("test case"))).toBe(true);
  });
});

describe("test-run-service — recording results", () => {
  it("refuses a fail/partial/blocked result with no explanation", () => {
    const { project, caseOne } = makeProjectWithReadyCases("Iota");
    const run = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const result = submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "fail" }, owner.name);
    expect(result.ok).toBe(false);
  });

  it("accepts a pass with no notes", () => {
    const { project, caseOne } = makeProjectWithReadyCases("Kappa");
    const run = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const result = submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name);
    expect(result.ok).toBe(true);
  });

  it("starts a planned run on the first recorded result", () => {
    const { project, caseOne, caseTwo } = makeProjectWithReadyCases("Lambda");
    const run = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId, caseTwo.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");
    expect(run.data.testRun.status).toBe("planned");

    const result = submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.testRun.status).toBe("inProgress");
    expect(result.data.testRun.startedAt).toBeDefined();
  });

  it("auto-completes the run once every case has a result — completed when every result passes", () => {
    const { project, caseOne, caseTwo } = makeProjectWithReadyCases("Mu");
    const run = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId, caseTwo.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name);
    const final = submitTestResult(run.data.project, run.data.testRun.publicId, caseTwo.publicId, { status: "pass" }, owner.name);
    expect(final.ok).toBe(true);
    if (!final.ok) return;
    expect(final.data.testRun.status).toBe("completed");
    expect(final.data.testRun.completedAt).toBeDefined();
  });

  it("auto-completes to needsAttention when any result fails", () => {
    const { project, caseOne, caseTwo } = makeProjectWithReadyCases("Nu");
    const run = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId, caseTwo.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name);
    const final = submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseTwo.publicId,
      { status: "fail", actualResult: "Unexpected error shown." },
      owner.name,
    );
    expect(final.ok).toBe(true);
    if (!final.ok) return;
    expect(final.data.testRun.status).toBe("needsAttention");
  });

  it("rejects a result for a test case that isn't part of the run", () => {
    const { project, caseOne, caseTwo } = makeProjectWithReadyCases("Xi");
    const run = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const result = submitTestResult(run.data.project, run.data.testRun.publicId, caseTwo.publicId, { status: "pass" }, owner.name);
    expect(result.ok).toBe(false);
  });
});

describe("test-run-service — lifecycle", () => {
  it("pauses an in-progress run and resumes it back to inProgress", () => {
    const { project, caseOne } = makeProjectWithReadyCases("Omicron");
    const run = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");
    const started = startTestRun(run.data.project, run.data.testRun.publicId, owner.name);
    expect(started.ok).toBe(true);

    const paused = pauseTestRun(project, run.data.testRun.publicId, owner.name);
    expect(paused.ok).toBe(true);
    if (!paused.ok) return;
    expect(paused.data.testRun.status).toBe("paused");

    const resumed = startTestRun(project, run.data.testRun.publicId, owner.name);
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.data.testRun.status).toBe("inProgress");
  });

  it("refuses to pause a run that isn't in progress", () => {
    const { project, caseOne } = makeProjectWithReadyCases("Pi");
    const run = createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const result = pauseTestRun(project, run.data.testRun.publicId, owner.name);
    expect(result.ok).toBe(false);
  });

  it("never operates on a run from another project", () => {
    const { project: projectA, caseOne } = makeProjectWithReadyCases("Rho");
    const projectB = makeProject("Sigma");
    const run = createTestRun(projectA, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    expect(startTestRun(projectB, run.data.testRun.publicId, owner.name).ok).toBe(false);
    expect(pauseTestRun(projectB, run.data.testRun.publicId, owner.name).ok).toBe(false);
    expect(submitTestResult(projectB, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name).ok).toBe(false);
    expect(getTestRunDetail(projectB, run.data.testRun.publicId)).toBeNull();
  });
});
