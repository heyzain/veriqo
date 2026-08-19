import { beforeEach, describe, expect, it } from "vitest";

import { ActivityModel } from "@/server/db/models/activity.model";
import { FeatureModel } from "@/server/db/models/feature.model";
import { ProjectModel } from "@/server/db/models/project.model";
import { TestCaseModel } from "@/server/db/models/test-case.model";
import { TestResultModel } from "@/server/db/models/test-result.model";
import { TestRunModel } from "@/server/db/models/test-run.model";
import { UserModel } from "@/server/db/models/user.model";
import { resetTestDb } from "@/test/db";
import { __resetCookieJarForTests } from "@/test/mocks/next-headers";
import { createFeatureFromDiscovery } from "@/server/services/feature-service";
import { createProjectForOwner } from "@/server/services/project-service";
import { createTestCaseFromGeneration } from "@/server/services/test-case-service";
import { createTestRun } from "@/server/services/test-run-service";
import { signUp } from "@/server/services/auth-service";
import type { PublicUser } from "@/types/auth";

import { deleteAccount, exportAccountData } from "./account-service";

beforeEach(async () => {
  await resetTestDb();
  __resetCookieJarForTests();
});

async function makeOwnerWithData(email: string) {
  const signedUp = await signUp({ name: "Owner", email, password: "Password123" });
  if (!signedUp.ok) throw new Error("setup failed");
  const owner: PublicUser = signedUp.data.user;

  const project = await createProjectForOwner(
    { name: "Owned Project", description: "Has real data.", appUrl: "https://example.com", environment: "staging" },
    owner,
  );
  const feature = await createFeatureFromDiscovery(project, {
    name: "Feature",
    description: "Does something.",
    risk: "high",
    acceptanceCriteria: ["Works."],
    roles: [],
    dependencies: [],
    sourceReferences: [],
  });
  if (!feature.ok) throw new Error("setup failed");

  const testCase = await createTestCaseFromGeneration(feature.data.project, {
    featureId: feature.data.feature.publicId,
    title: "Case",
    priority: "high",
    steps: ["Do it."],
    expectedResult: "Works.",
    roles: [],
    environments: [],
  });
  if (!testCase.ok) throw new Error("setup failed");

  const run = await createTestRun(
    testCase.data.project,
    { name: "Run", build: "1.0", environment: "Staging", browser: "Chrome", testCaseIds: [testCase.data.testCase.publicId] },
    owner.name,
  );
  if (!run.ok) throw new Error("setup failed");

  return { owner, project, feature: feature.data.feature, testCase: testCase.data.testCase, run: run.data.testRun };
}

describe("account-service — export", () => {
  it("includes every owned project and its records, and nothing else", async () => {
    const { owner, project } = await makeOwnerWithData("exporter@example.com");
    const otherSignup = await signUp({ name: "Other", email: "other@example.com", password: "Password123" });
    if (!otherSignup.ok) throw new Error("setup failed");
    await createProjectForOwner(
      { name: "Someone Else's Project", description: "Not exported.", appUrl: "https://other.example.com", environment: "staging" },
      otherSignup.data.user,
    );

    const exported = await exportAccountData(owner);
    expect(exported.account.email).toBe("exporter@example.com");
    expect(exported.projects).toHaveLength(1);
    expect((exported.projects[0]!.project as { id: string }).id).toBe(project.id);
    expect(exported.projects[0]!.features).toHaveLength(1);
    expect(exported.projects[0]!.testCases).toHaveLength(1);
    expect(exported.projects[0]!.testRuns).toHaveLength(1);
  });
});

describe("account-service — deletion", () => {
  it("cascades: removes the account, its projects, and every record under them", async () => {
    const { owner, project, run } = await makeOwnerWithData("deleter@example.com");

    expect(await ProjectModel.findOne({ id: project.id }).lean()).not.toBeNull();
    expect(await TestRunModel.findOne({ id: run.id }).lean()).not.toBeNull();
    expect(await TestResultModel.findOne({ testRunId: run.id }).lean()).not.toBeNull();

    await deleteAccount(owner);

    expect(await UserModel.findOne({ id: owner.id }).lean()).toBeNull();
    expect(await UserModel.findOne({ email: owner.email.toLowerCase() }).lean()).toBeNull();
    expect(await ProjectModel.findOne({ id: project.id }).lean()).toBeNull();
    expect(await FeatureModel.findOne({ projectId: project.id }).lean()).toBeNull();
    expect(await TestCaseModel.findOne({ projectId: project.id }).lean()).toBeNull();
    expect(await TestRunModel.findOne({ id: run.id }).lean()).toBeNull();
    expect(await TestResultModel.findOne({ testRunId: run.id }).lean()).toBeNull();
    expect(await ActivityModel.findOne({ projectId: project.id }).lean()).toBeNull();
  });

  it("never touches another owner's project", async () => {
    const { owner } = await makeOwnerWithData("deleter2@example.com");
    const otherSignup = await signUp({ name: "Untouched", email: "untouched@example.com", password: "Password123" });
    if (!otherSignup.ok) throw new Error("setup failed");
    const untouchedProject = await createProjectForOwner(
      { name: "Untouched Project", description: "Should survive.", appUrl: "https://untouched.example.com", environment: "staging" },
      otherSignup.data.user,
    );

    await deleteAccount(owner);

    expect(await ProjectModel.findOne({ id: untouchedProject.id }).lean()).not.toBeNull();
    expect(await UserModel.findOne({ id: otherSignup.data.user.id }).lean()).not.toBeNull();
  });
});
