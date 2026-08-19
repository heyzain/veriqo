import "server-only";

import { dbConnect } from "@/server/db/connection";
import { FeatureModel, toFeature } from "@/server/db/models/feature.model";
import { IssueModel, toIssue } from "@/server/db/models/issue.model";
import { ProjectModel, toProject } from "@/server/db/models/project.model";
import { TestCaseModel, toTestCase } from "@/server/db/models/test-case.model";
import { TestResultModel, toTestResult } from "@/server/db/models/test-result.model";
import { TestRunModel, toTestRun } from "@/server/db/models/test-run.model";
import type { Feature, Issue, Project, TestCase, TestResult, TestRun } from "@/types/domain";

/**
 * Every read is scoped by `ownerId` at this layer — not just filtered in the
 * UI — so a missing scope check can never leak another user's project
 * (03-CLAUDE-RULES.md, "Project-scoped actions must verify project
 * ownership server-side").
 */
export async function listProjectsForOwner(ownerId: string): Promise<Project[]> {
  await dbConnect();
  const docs = await ProjectModel.find({ ownerId }).lean();
  return docs.map(toProject);
}

export async function findProjectForOwner(slug: string, ownerId: string): Promise<Project | null> {
  await dbConnect();
  const doc = await ProjectModel.findOne({ slug }).lean();
  if (!doc || doc.ownerId !== ownerId) return null;
  return toProject(doc);
}

export async function findProjectByIdForOwner(id: string, ownerId: string): Promise<Project | null> {
  await dbConnect();
  const doc = await ProjectModel.findOne({ id }).lean();
  if (!doc || doc.ownerId !== ownerId) return null;
  return toProject(doc);
}

/**
 * Unscoped slug lookup for the Claude MCP route handler
 * (`app/api/mcp/[slug]/route.ts`), which authenticates a request by its
 * project-scoped credential rather than a signed-in owner session — there is
 * no `PublicUser` to check ownership against. The credential itself is the
 * authorization boundary; see `server/services/mcp-service.ts`.
 */
export async function findProjectBySlug(slug: string): Promise<Project | null> {
  await dbConnect();
  const doc = await ProjectModel.findOne({ slug }).lean();
  return doc ? toProject(doc) : null;
}

export async function allSlugsAndCodes(): Promise<{ slugs: Set<string>; codes: Set<string> }> {
  await dbConnect();
  const docs = await ProjectModel.find({}, { slug: 1, publicId: 1 }).lean();
  const slugs = new Set<string>();
  const codes = new Set<string>();
  for (const doc of docs) {
    slugs.add(doc.slug);
    codes.add(doc.publicId);
  }
  return { slugs, codes };
}

export async function createProject(project: Project): Promise<void> {
  await dbConnect();
  await ProjectModel.create(project);
}

/**
 * Deletes a project and every record that references it — features, test
 * cases, runs, results, issues. Used only by `account-service.deleteAccount`
 * (account deletion cascades through every owned project); nothing else in
 * the product permanently destroys a project — everyday removal is
 * `toggleProjectArchivedForOwner`, which is reversible.
 */
export async function deleteProjectCascade(projectId: string): Promise<void> {
  await dbConnect();
  const runs = await TestRunModel.find({ projectId }, { id: 1 }).lean();
  const runIds = runs.map((run) => run.id);

  await Promise.all([
    FeatureModel.deleteMany({ projectId }),
    TestCaseModel.deleteMany({ projectId }),
    TestRunModel.deleteMany({ projectId }),
    runIds.length ? TestResultModel.deleteMany({ testRunId: { $in: runIds } }) : Promise.resolve(),
    IssueModel.deleteMany({ projectId }),
    ProjectModel.deleteOne({ id: projectId }),
  ]);
}

export async function updateProject(project: Project): Promise<void> {
  await dbConnect();
  await ProjectModel.updateOne({ id: project.id }, { $set: project }, { upsert: true });
}

export async function listFeaturesForProject(projectId: string): Promise<Feature[]> {
  await dbConnect();
  const docs = await FeatureModel.find({ projectId }).lean();
  return docs.map(toFeature);
}

/** Scoped by `projectId` so a public ID from another project can never resolve here. */
export async function findFeatureByPublicId(projectId: string, publicId: string): Promise<Feature | null> {
  await dbConnect();
  const doc = await FeatureModel.findOne({ projectId, publicId }).lean();
  return doc ? toFeature(doc) : null;
}

export async function findFeatureById(projectId: string, id: string): Promise<Feature | null> {
  await dbConnect();
  const doc = await FeatureModel.findOne({ id }).lean();
  if (!doc || doc.projectId !== projectId) return null;
  return toFeature(doc);
}

export async function nextFeatureSequence(projectId: string): Promise<number> {
  await dbConnect();
  const count = await FeatureModel.countDocuments({ projectId });
  return count + 1;
}

export async function saveFeature(feature: Feature): Promise<void> {
  await dbConnect();
  await FeatureModel.updateOne({ id: feature.id }, { $set: feature }, { upsert: true });
}

/**
 * Re-points every test case and issue referencing `fromFeatureId` to
 * `toFeatureId` — used when merging a duplicate feature so its connected
 * records (00-PRODUCT.md domain relationships) survive the merge instead of
 * dangling against an archived feature.
 */
export async function reassignFeatureReferences(fromFeatureId: string, toFeatureId: string): Promise<void> {
  await dbConnect();
  await Promise.all([
    TestCaseModel.updateMany({ featureId: fromFeatureId }, { $set: { featureId: toFeatureId } }),
    IssueModel.updateMany({ featureId: fromFeatureId }, { $set: { featureId: toFeatureId } }),
  ]);
}

export async function listTestCasesForProject(projectId: string): Promise<TestCase[]> {
  await dbConnect();
  const docs = await TestCaseModel.find({ projectId }).lean();
  return docs.map(toTestCase);
}

/** Scoped by `projectId` so a public ID from another project can never resolve here. */
export async function findTestCaseByPublicId(projectId: string, publicId: string): Promise<TestCase | null> {
  await dbConnect();
  const doc = await TestCaseModel.findOne({ projectId, publicId }).lean();
  return doc ? toTestCase(doc) : null;
}

export async function findTestCaseById(projectId: string, id: string): Promise<TestCase | null> {
  await dbConnect();
  const doc = await TestCaseModel.findOne({ id }).lean();
  if (!doc || doc.projectId !== projectId) return null;
  return toTestCase(doc);
}

export async function saveTestCase(testCase: TestCase): Promise<void> {
  await dbConnect();
  await TestCaseModel.updateOne({ id: testCase.id }, { $set: testCase }, { upsert: true });
}

/** Every public ID already used with `prefix` in this project — the set `nextTestCasePublicId` scans for a free sequence number. */
export async function testCasePublicIdsWithPrefix(projectId: string, prefix: string): Promise<Set<string>> {
  await dbConnect();
  const docs = await TestCaseModel.find(
    { projectId, publicId: new RegExp(`^${prefix}-`) },
    { publicId: 1 },
  ).lean();
  return new Set(docs.map((doc) => doc.publicId));
}

export async function listTestRunsForProject(projectId: string): Promise<TestRun[]> {
  await dbConnect();
  const docs = await TestRunModel.find({ projectId }).lean();
  return docs.map(toTestRun);
}

/** Scoped by `projectId` so a public ID from another project can never resolve here. */
export async function findTestRunByPublicId(projectId: string, publicId: string): Promise<TestRun | null> {
  await dbConnect();
  const doc = await TestRunModel.findOne({ projectId, publicId }).lean();
  return doc ? toTestRun(doc) : null;
}

export async function findTestRunById(projectId: string, id: string): Promise<TestRun | null> {
  await dbConnect();
  const doc = await TestRunModel.findOne({ id }).lean();
  if (!doc || doc.projectId !== projectId) return null;
  return toTestRun(doc);
}

export async function saveTestRun(testRun: TestRun): Promise<void> {
  await dbConnect();
  await TestRunModel.updateOne({ id: testRun.id }, { $set: testRun }, { upsert: true });
}

/** Every `RUN-*` public ID already used in this project — the set `nextTestRunPublicId` scans for the next sequence number. */
export async function testRunPublicIds(projectId: string): Promise<Set<string>> {
  await dbConnect();
  const docs = await TestRunModel.find({ projectId }, { publicId: 1 }).lean();
  return new Set(docs.map((doc) => doc.publicId));
}

export async function listTestResultsForRun(testRunId: string): Promise<TestResult[]> {
  await dbConnect();
  const docs = await TestResultModel.find({ testRunId }).lean();
  return docs.map(toTestResult);
}

/** Every result across every run in the project — joins through `testRuns` since `TestResult` only carries a `testRunId`, not its own `projectId`. Backs Phase 9 analytics/release-confidence, which need results at the project level rather than one run at a time. */
export async function listTestResultsForProject(projectId: string): Promise<TestResult[]> {
  await dbConnect();
  const runs = await TestRunModel.find({ projectId }, { id: 1 }).lean();
  const runIds = runs.map((run) => run.id);
  if (!runIds.length) return [];
  const docs = await TestResultModel.find({ testRunId: { $in: runIds } }).lean();
  return docs.map(toTestResult);
}

/** Scoped by `projectId` via the owning run — a result `id` from another project can never resolve here. */
export async function findTestResultById(projectId: string, id: string): Promise<TestResult | null> {
  await dbConnect();
  const doc = await TestResultModel.findOne({ id }).lean();
  if (!doc) return null;
  const run = await TestRunModel.findOne({ id: doc.testRunId }, { projectId: 1 }).lean();
  if (!run || run.projectId !== projectId) return null;
  return toTestResult(doc);
}

export async function findTestResult(testRunId: string, testCaseId: string): Promise<TestResult | null> {
  await dbConnect();
  const doc = await TestResultModel.findOne({ testRunId, testCaseId }).lean();
  return doc ? toTestResult(doc) : null;
}

export async function saveTestResult(result: TestResult): Promise<void> {
  await dbConnect();
  await TestResultModel.updateOne({ id: result.id }, { $set: result }, { upsert: true });
}

export async function listIssuesForProject(projectId: string): Promise<Issue[]> {
  await dbConnect();
  const docs = await IssueModel.find({ projectId }).lean();
  return docs.map(toIssue);
}

/** Scoped by `projectId` so a public ID from another project can never resolve here. */
export async function findIssueByPublicId(projectId: string, publicId: string): Promise<Issue | null> {
  await dbConnect();
  const doc = await IssueModel.findOne({ projectId, publicId }).lean();
  return doc ? toIssue(doc) : null;
}

export async function findIssueById(projectId: string, id: string): Promise<Issue | null> {
  await dbConnect();
  const doc = await IssueModel.findOne({ id }).lean();
  if (!doc || doc.projectId !== projectId) return null;
  return toIssue(doc);
}

/** The issue already tracking a given failed result, if any — used to avoid creating a duplicate issue for the same failure. */
export async function findIssueByOriginResultId(projectId: string, originResultId: string): Promise<Issue | null> {
  await dbConnect();
  const doc = await IssueModel.findOne({ projectId, originResultId }).lean();
  return doc ? toIssue(doc) : null;
}

export async function saveIssue(issue: Issue): Promise<void> {
  await dbConnect();
  await IssueModel.updateOne({ id: issue.id }, { $set: issue }, { upsert: true });
}

/** Every `ISS-*` public ID already used in this project — the set `nextIssuePublicId` scans for the next sequence number. */
export async function issuePublicIds(projectId: string): Promise<Set<string>> {
  await dbConnect();
  const docs = await IssueModel.find({ projectId }, { publicId: 1 }).lean();
  return new Set(docs.map((doc) => doc.publicId));
}
