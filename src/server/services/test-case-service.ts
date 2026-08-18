import "server-only";

import { randomUUID } from "node:crypto";

import { testGenerationPrompt } from "@/prompts/test-generation/prompt";
import { nextTestCasePublicId, testCaseModulePrefix } from "@/lib/ids/test-case-identifiers";
import { listActivityForProject, recordActivity } from "@/server/repositories/activity-repository";
import {
  findFeatureByPublicId,
  findTestCaseByPublicId,
  listTestCasesForProject as repoListTestCasesForProject,
  saveTestCase,
  testCasePublicIdsWithPrefix,
} from "@/server/repositories/project-repository";
import { advanceSetupStep } from "@/server/services/project-service";
import type { TestCasePriority, TestCaseStatus } from "@/config/status.config";
import type { ActivityEvent, Project, TestCase } from "@/types/domain";

/**
 * Business rules for the test-case inventory (Phase 5) — the same shape
 * `feature-service.ts` established for Phase 4: every mutation records
 * activity and stays project-scoped by only ever operating on a `Project`
 * the caller has already verified ownership/credential for.
 */

export type TestCaseServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

function ok<T>(data: T): TestCaseServiceResult<T> {
  return { ok: true, data };
}
function fail<T>(error: string): TestCaseServiceResult<T> {
  return { ok: false, error };
}

function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A test case is flagged as a possible duplicate — never silently merged or
 * silently created twice — when its normalized title matches or contains an
 * existing, non-archived case's normalized title on the *same feature*
 * (Phase 5 Build: "Duplicate/conflict detection"). Scoped to one feature,
 * unlike a feature's project-wide check, since short case titles like
 * "shows an error" legitimately repeat across unrelated features.
 */
function findPossibleDuplicate(
  projectId: string,
  featureId: string,
  title: string,
  excludeTestCaseId?: string,
): TestCase | null {
  const normalized = normalizeTitle(title);
  if (!normalized) return null;

  return (
    repoListTestCasesForProject(projectId).find((tc) => {
      if (tc.id === excludeTestCaseId || tc.featureId !== featureId || tc.status === "archived") return false;
      const candidate = normalizeTitle(tc.title);
      return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
    }) ?? null
  );
}

function testCaseActivity(
  projectId: string,
  actorType: ActivityEvent["actorType"],
  actorName: string,
  action: string,
  entityId: string,
  extra?: Partial<Pick<ActivityEvent, "relatedEntities" | "metadata">>,
): void {
  recordActivity({
    id: randomUUID(),
    projectId,
    actorType,
    actorName,
    action,
    entityType: "testCase",
    entityId,
    createdAt: new Date().toISOString(),
    ...extra,
  });
}

export function listTestCasesForProject(project: Project): TestCase[] {
  return repoListTestCasesForProject(project.id);
}

// ---- Claude-facing mutations (via MCP tools) ----

export type TestCaseGenerationInput = {
  featureId: string; // the parent feature's public ID
  title: string;
  priority: TestCasePriority;
  preconditions?: string;
  steps: string[];
  expectedResult: string;
  roles: string[];
  environments: string[];
  idempotencyKey?: string;
};

export function createTestCaseFromGeneration(
  project: Project,
  input: TestCaseGenerationInput,
): TestCaseServiceResult<{ testCase: TestCase; project: Project }> {
  if (input.idempotencyKey) {
    const replay = repoListTestCasesForProject(project.id).find(
      (tc) => tc.idempotencyKey === input.idempotencyKey,
    );
    if (replay) return ok({ testCase: replay, project });
  }

  const feature = findFeatureByPublicId(project.id, input.featureId);
  if (!feature) return fail(`Unknown feature "${input.featureId}" — featureId must be an existing feature's public ID.`);
  if (feature.status === "archived") return fail(`${feature.publicId} is archived. Test cases can't be added to it.`);

  const duplicate = findPossibleDuplicate(project.id, feature.id, input.title);
  const prefix = testCaseModulePrefix(feature.name);
  const now = new Date().toISOString();

  const testCase: TestCase = {
    id: randomUUID(),
    publicId: nextTestCasePublicId(prefix, testCasePublicIdsWithPrefix(project.id, prefix)),
    projectId: project.id,
    featureId: feature.id,
    title: input.title.trim(),
    status: "inReview",
    priority: input.priority,
    preconditions: input.preconditions?.trim() || undefined,
    steps: input.steps,
    expectedResult: input.expectedResult.trim(),
    roles: input.roles,
    environments: input.environments,
    possibleDuplicateOfId: duplicate?.id,
    createdBySource: "claude",
    idempotencyKey: input.idempotencyKey,
    promptId: testGenerationPrompt.id,
    promptVersion: testGenerationPrompt.version,
    createdAt: now,
    updatedAt: now,
  };
  saveTestCase(testCase);

  const updatedProject = advanceSetupStep(project, 5);

  testCaseActivity(
    project.id,
    "claude",
    "Claude",
    duplicate
      ? `generated "${testCase.title}" (${testCase.publicId}) for ${feature.publicId} — possible duplicate of ${duplicate.publicId}`
      : `generated "${testCase.title}" (${testCase.publicId}) for ${feature.publicId}`,
    testCase.id,
    {
      relatedEntities: [
        { type: "feature", id: feature.id },
        ...(duplicate ? [{ type: "testCase", id: duplicate.id }] : []),
      ],
      metadata: { promptId: testCase.promptId, promptVersion: testCase.promptVersion },
    },
  );

  if (updatedProject !== project) {
    testCaseActivity(
      project.id,
      "system",
      "Veriqo",
      "marked test-case generation in progress after the first generated case",
      testCase.id,
    );
  }

  return ok({ testCase, project: updatedProject });
}

export type TestCaseUpdateInput = Partial<{
  title: string;
  priority: TestCasePriority;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  roles: string[];
  environments: string[];
}>;

export function updateTestCaseFromGeneration(
  project: Project,
  publicId: string,
  input: TestCaseUpdateInput,
): TestCaseServiceResult<{ testCase: TestCase; project: Project }> {
  const existing = findTestCaseByPublicId(project.id, publicId);
  if (!existing) return fail(`No test case with public ID "${publicId}" in this project.`);
  if (existing.status === "archived") return fail(`${publicId} is archived. Restore it before updating.`);

  const now = new Date().toISOString();
  const wasReady = existing.status === "ready";
  const staysInReview = wasReady || existing.status === "needsUpdate";

  const updated: TestCase = {
    ...existing,
    title: input.title?.trim() ?? existing.title,
    priority: input.priority ?? existing.priority,
    preconditions: input.preconditions !== undefined ? input.preconditions.trim() || undefined : existing.preconditions,
    steps: input.steps ?? existing.steps,
    expectedResult: input.expectedResult?.trim() ?? existing.expectedResult,
    roles: input.roles ?? existing.roles,
    environments: input.environments ?? existing.environments,
    status: staysInReview ? "needsUpdate" : "inReview",
    // Diff against the last human-approved snapshot, mirroring
    // `feature-service.updateFeatureFromDiscovery`.
    previousSnapshot: wasReady
      ? { title: existing.title, steps: existing.steps, expectedResult: existing.expectedResult, priority: existing.priority }
      : existing.previousSnapshot,
    createdBySource: "claude",
    promptId: testGenerationPrompt.id,
    promptVersion: testGenerationPrompt.version,
    updatedAt: now,
  };
  saveTestCase(updated);

  const updatedProject = advanceSetupStep(project, 5);

  testCaseActivity(
    project.id,
    "claude",
    "Claude",
    staysInReview
      ? `proposed an update to ${updated.publicId} — now awaiting review`
      : `updated ${updated.publicId} from re-analysis`,
    updated.id,
    { metadata: { promptId: updated.promptId, promptVersion: updated.promptVersion } },
  );

  return ok({ testCase: updated, project: updatedProject });
}

export function listTestCasesForMcp(
  project: Project,
  status?: TestCaseStatus,
  featurePublicId?: string,
): TestCase[] {
  let all = repoListTestCasesForProject(project.id);
  if (status) all = all.filter((tc) => tc.status === status);
  if (featurePublicId) {
    const feature = findFeatureByPublicId(project.id, featurePublicId);
    all = feature ? all.filter((tc) => tc.featureId === feature.id) : [];
  }
  return all;
}

/**
 * Moves every `ready` test case on `featureId` to `needsUpdate` when its
 * parent feature is re-analyzed and moves to `changed` (Phase 5 Build:
 * "`Needs update` behavior for changed features"). Called from
 * `feature-service.updateFeatureFromDiscovery` — a case already `needsUpdate`
 * or earlier in review doesn't need a second nudge.
 */
export function markTestCasesNeedsUpdateForFeatureChange(
  project: Project,
  featureId: string,
  featurePublicId: string,
): number {
  const now = new Date().toISOString();
  const affected = repoListTestCasesForProject(project.id).filter(
    (tc) => tc.featureId === featureId && tc.status === "ready",
  );
  for (const testCase of affected) {
    saveTestCase({ ...testCase, status: "needsUpdate", updatedAt: now });
  }
  if (affected.length > 0) {
    testCaseActivity(
      project.id,
      "system",
      "Veriqo",
      `marked ${affected.length} test case${affected.length === 1 ? "" : "s"} as needing update after ${featurePublicId} changed`,
      featureId,
      { relatedEntities: affected.map((tc) => ({ type: "testCase", id: tc.id })) },
    );
  }
  return affected.length;
}

// ---- Human review actions ----

export function approveTestCase(
  project: Project,
  publicId: string,
  actorName: string,
): TestCaseServiceResult<{ testCase: TestCase }> {
  const existing = findTestCaseByPublicId(project.id, publicId);
  if (!existing) return fail("Test case not found.");
  if (existing.status === "ready") return ok({ testCase: existing });
  if (existing.status === "archived") return fail(`${publicId} is archived. Restore it before approving.`);

  const now = new Date().toISOString();
  const updated: TestCase = {
    ...existing,
    status: "ready",
    previousSnapshot: undefined,
    possibleDuplicateOfId: undefined,
    updatedAt: now,
  };
  saveTestCase(updated);

  testCaseActivity(project.id, "human", actorName, `approved ${updated.publicId} — ${updated.title}`, updated.id);

  return ok({ testCase: updated });
}

export function bulkApproveTestCases(
  project: Project,
  publicIds: readonly string[],
  actorName: string,
): TestCaseServiceResult<{ approvedCount: number }> {
  const now = new Date().toISOString();
  const approved: TestCase[] = [];

  for (const publicId of publicIds) {
    const existing = findTestCaseByPublicId(project.id, publicId);
    if (!existing || existing.status === "ready" || existing.status === "archived") continue;
    const updated: TestCase = {
      ...existing,
      status: "ready",
      previousSnapshot: undefined,
      possibleDuplicateOfId: undefined,
      updatedAt: now,
    };
    saveTestCase(updated);
    approved.push(updated);
  }

  if (approved.length === 0) return ok({ approvedCount: 0 });

  testCaseActivity(
    project.id,
    "human",
    actorName,
    `approved ${approved.length} test case${approved.length === 1 ? "" : "s"} (${approved.map((tc) => tc.publicId).join(", ")})`,
    project.id,
  );

  return ok({ approvedCount: approved.length });
}

export type TestCaseEditInput = {
  title: string;
  priority: TestCasePriority;
  preconditions?: string;
  steps: string[];
  expectedResult: string;
  roles: string[];
  environments: string[];
};

export function editTestCase(
  project: Project,
  publicId: string,
  input: TestCaseEditInput,
  actorName: string,
): TestCaseServiceResult<{ testCase: TestCase }> {
  const existing = findTestCaseByPublicId(project.id, publicId);
  if (!existing) return fail("Test case not found.");
  if (existing.status === "archived") return fail(`${publicId} is archived. Restore it before editing.`);

  const now = new Date().toISOString();
  const updated: TestCase = {
    ...existing,
    title: input.title.trim(),
    priority: input.priority,
    preconditions: input.preconditions?.trim() || undefined,
    steps: input.steps,
    expectedResult: input.expectedResult.trim(),
    roles: input.roles,
    environments: input.environments,
    // A human edit resolves whatever Claude diff was pending, and any
    // possible-duplicate flag — mirrors `feature-service.editFeature`.
    previousSnapshot: undefined,
    possibleDuplicateOfId: undefined,
    updatedAt: now,
  };
  saveTestCase(updated);

  testCaseActivity(project.id, "human", actorName, `edited ${updated.publicId} — ${updated.title}`, updated.id);

  return ok({ testCase: updated });
}

export function archiveTestCase(
  project: Project,
  publicId: string,
  actorName: string,
): TestCaseServiceResult<{ testCase: TestCase }> {
  const existing = findTestCaseByPublicId(project.id, publicId);
  if (!existing) return fail("Test case not found.");
  if (existing.status === "archived") return ok({ testCase: existing });

  const now = new Date().toISOString();
  const updated: TestCase = { ...existing, status: "archived", updatedAt: now };
  saveTestCase(updated);

  testCaseActivity(project.id, "human", actorName, `archived ${updated.publicId} — ${updated.title}`, updated.id);

  return ok({ testCase: updated });
}

export function bulkArchiveTestCases(
  project: Project,
  publicIds: readonly string[],
  actorName: string,
): TestCaseServiceResult<{ archivedCount: number }> {
  const now = new Date().toISOString();
  const archived: TestCase[] = [];

  for (const publicId of publicIds) {
    const existing = findTestCaseByPublicId(project.id, publicId);
    if (!existing || existing.status === "archived") continue;
    const updated: TestCase = { ...existing, status: "archived", updatedAt: now };
    saveTestCase(updated);
    archived.push(updated);
  }

  if (archived.length === 0) return ok({ archivedCount: 0 });

  testCaseActivity(
    project.id,
    "human",
    actorName,
    `archived ${archived.length} test case${archived.length === 1 ? "" : "s"} (${archived.map((tc) => tc.publicId).join(", ")})`,
    project.id,
  );

  return ok({ archivedCount: archived.length });
}

export function restoreTestCase(
  project: Project,
  publicId: string,
  actorName: string,
): TestCaseServiceResult<{ testCase: TestCase }> {
  const existing = findTestCaseByPublicId(project.id, publicId);
  if (!existing) return fail("Test case not found.");
  if (existing.status !== "archived") return ok({ testCase: existing });

  const now = new Date().toISOString();
  const updated: TestCase = { ...existing, status: "draft", updatedAt: now };
  saveTestCase(updated);

  testCaseActivity(project.id, "human", actorName, `restored ${updated.publicId} from archive`, updated.id);

  return ok({ testCase: updated });
}

/**
 * Clones a test case onto the same feature as a fresh `draft` record — the
 * "duplicate" action from Phase 5's "Review, edit, approve, duplicate,
 * archive" set. Flags the clone as a possible duplicate of its source so the
 * existing duplicate-flag UI treatment surfaces it without new UI.
 */
export function duplicateTestCase(
  project: Project,
  publicId: string,
  actorName: string,
): TestCaseServiceResult<{ testCase: TestCase }> {
  const existing = findTestCaseByPublicId(project.id, publicId);
  if (!existing) return fail("Test case not found.");

  const prefix = existing.publicId.split("-")[0] ?? "TC";
  const now = new Date().toISOString();
  const clone: TestCase = {
    ...existing,
    id: randomUUID(),
    publicId: nextTestCasePublicId(prefix, testCasePublicIdsWithPrefix(project.id, prefix)),
    title: `${existing.title} (copy)`,
    status: "draft",
    createdBySource: "human",
    possibleDuplicateOfId: existing.id,
    previousSnapshot: undefined,
    idempotencyKey: undefined,
    promptId: undefined,
    promptVersion: undefined,
    createdAt: now,
    updatedAt: now,
  };
  saveTestCase(clone);

  testCaseActivity(project.id, "human", actorName, `duplicated ${existing.publicId} as ${clone.publicId}`, clone.id, {
    relatedEntities: [{ type: "testCase", id: existing.id }],
  });

  return ok({ testCase: clone });
}

// ---- Polling support for the "waiting for Claude" generation panel ----

export type TestCaseGenerationActivitySince = {
  events: ActivityEvent[];
  newTestCaseCount: number;
};

export function getTestCaseGenerationActivitySince(
  project: Project,
  sinceIso: string,
): TestCaseGenerationActivitySince {
  const since = new Date(sinceIso).getTime();
  const events = listActivityForProject(project.id)
    .filter((event) => event.entityType === "testCase" && new Date(event.createdAt).getTime() > since)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-30);

  const newTestCaseCount = events.filter(
    (event) => event.actorType === "claude" && event.action.startsWith("generated "),
  ).length;

  return { events, newTestCaseCount };
}
