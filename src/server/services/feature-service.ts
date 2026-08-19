import "server-only";

import { randomUUID } from "node:crypto";

import { featureDiscoveryPrompt } from "@/prompts/feature-discovery/prompt";
import { formatPublicId } from "@/lib/mock/ids";
import { listActivityForProject, recordActivity } from "@/server/repositories/activity-repository";
import {
  findFeatureByPublicId,
  listFeaturesForProject as repoListFeaturesForProject,
  listIssuesForProject,
  listTestCasesForProject,
  nextFeatureSequence,
  reassignFeatureReferences,
  saveFeature,
} from "@/server/repositories/project-repository";
import { advanceSetupStep } from "@/server/services/project-service";
import { markTestCasesNeedsUpdateForFeatureChange } from "@/server/services/test-case-service";
import type { FeatureStatus } from "@/config/status.config";
import type {
  ActivityEvent,
  Feature,
  FeatureSourceReference,
  Issue,
  Project,
  RiskLevel,
  TestCase,
} from "@/types/domain";

/**
 * Business rules for the feature inventory (Phase 4). Every mutation here
 * records activity and stays project-scoped by only ever operating on a
 * `Project` the caller (route, action, or MCP request handler) has already
 * verified ownership/credential for — this file trusts that boundary the
 * same way `mcp-service.ts` and `project-service.ts` do.
 */

export type FeatureServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

function ok<T>(data: T): FeatureServiceResult<T> {
  return { ok: true, data };
}
function fail<T>(error: string): FeatureServiceResult<T> {
  return { ok: false, error };
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A feature is flagged as a possible duplicate — never silently merged or
 * silently created twice — when its normalized name matches or contains an
 * existing, non-archived feature's normalized name (Phase 4 acceptance:
 * "Duplicate/conflicting features are surfaced").
 */
async function findPossibleDuplicate(
  projectId: string,
  name: string,
  excludeFeatureId?: string,
): Promise<Feature | null> {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  const features = await repoListFeaturesForProject(projectId);
  return (
    features.find((f) => {
      if (f.id === excludeFeatureId || f.status === "archived") return false;
      const candidate = normalizeName(f.name);
      return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
    }) ?? null
  );
}

function dedupeStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value.trim());
  }
  return result;
}

function dedupeSourceReferences(
  values: readonly FeatureSourceReference[],
): FeatureSourceReference[] {
  const seen = new Set<string>();
  const result: FeatureSourceReference[] = [];
  for (const value of values) {
    const key = value.path.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

async function featureActivity(
  projectId: string,
  actorType: ActivityEvent["actorType"],
  actorName: string,
  action: string,
  entityId: string,
  extra?: Partial<Pick<ActivityEvent, "relatedEntities" | "metadata">>,
): Promise<void> {
  await recordActivity({
    id: randomUUID(),
    projectId,
    actorType,
    actorName,
    action,
    entityType: "feature",
    entityId,
    createdAt: new Date().toISOString(),
    ...extra,
  });
}

export async function listFeaturesForProject(project: Project): Promise<Feature[]> {
  return repoListFeaturesForProject(project.id);
}

export type FeatureDetail = {
  feature: Feature;
  duplicateOf: Feature | null;
  dependencyFeatures: Feature[];
  dependents: Feature[];
  testCases: TestCase[];
  issues: Issue[];
  activity: ActivityEvent[];
};

export async function getFeatureDetail(project: Project, publicId: string): Promise<FeatureDetail | null> {
  const feature = await findFeatureByPublicId(project.id, publicId);
  if (!feature) return null;

  const [allFeatures, testCases, issues, activity] = await Promise.all([
    repoListFeaturesForProject(project.id),
    listTestCasesForProject(project.id),
    listIssuesForProject(project.id),
    listActivityForProject(project.id),
  ]);

  const duplicateOf = feature.possibleDuplicateOfId
    ? (allFeatures.find((f) => f.id === feature.possibleDuplicateOfId) ?? null)
    : null;
  const dependencyFeatures = feature.dependencies
    .map((dep) => allFeatures.find((f) => f.publicId === dep))
    .filter((f): f is Feature => Boolean(f));
  const dependents = allFeatures.filter((f) => f.dependencies.includes(feature.publicId));

  return {
    feature,
    duplicateOf,
    dependencyFeatures,
    dependents,
    testCases: testCases.filter((tc) => tc.featureId === feature.id),
    issues: issues.filter((issue) => issue.featureId === feature.id),
    activity: activity.filter(
      (event) =>
        event.entityType === "feature" &&
        (event.entityId === feature.id ||
          event.relatedEntities?.some((related) => related.type === "feature" && related.id === feature.id)),
    ),
  };
}

// ---- Claude-facing mutations (via MCP tools) ----

export type FeatureDiscoveryInput = {
  name: string;
  description: string;
  risk: RiskLevel;
  acceptanceCriteria: string[];
  roles: string[];
  dependencies: string[];
  sourceReferences: FeatureSourceReference[];
  idempotencyKey?: string;
};

export async function createFeatureFromDiscovery(
  project: Project,
  input: FeatureDiscoveryInput,
): Promise<FeatureServiceResult<{ feature: Feature; project: Project }>> {
  const allFeatures = await repoListFeaturesForProject(project.id);

  if (input.idempotencyKey) {
    const replay = allFeatures.find((f) => f.idempotencyKey === input.idempotencyKey);
    if (replay) return ok({ feature: replay, project });
  }

  const invalidDependency = input.dependencies.find(
    (dep) => !allFeatures.some((f) => f.publicId === dep),
  );
  if (invalidDependency) {
    return fail(`Unknown dependency "${invalidDependency}" — it must be an existing feature's public ID.`);
  }

  const duplicate = await findPossibleDuplicate(project.id, input.name);
  const now = new Date().toISOString();

  const feature: Feature = {
    id: randomUUID(),
    publicId: formatPublicId("FEAT", await nextFeatureSequence(project.id)),
    projectId: project.id,
    name: input.name.trim(),
    description: input.description.trim(),
    status: "needsReview",
    risk: input.risk,
    acceptanceCriteria: input.acceptanceCriteria,
    roles: input.roles,
    dependencies: input.dependencies,
    sourceReferences: input.sourceReferences,
    possibleDuplicateOfId: duplicate?.id,
    createdBySource: "claude",
    idempotencyKey: input.idempotencyKey,
    promptId: featureDiscoveryPrompt.id,
    promptVersion: featureDiscoveryPrompt.version,
    createdAt: now,
    updatedAt: now,
  };
  await saveFeature(feature);

  const updatedProject = await advanceSetupStep(project, 3);

  await featureActivity(
    project.id,
    "claude",
    "Claude",
    duplicate
      ? `discovered "${feature.name}" (${feature.publicId}) — possible duplicate of ${duplicate.publicId}`
      : `discovered "${feature.name}" (${feature.publicId}) from the codebase`,
    feature.id,
    {
      relatedEntities: duplicate ? [{ type: "feature", id: duplicate.id }] : undefined,
      metadata: { promptId: feature.promptId, promptVersion: feature.promptVersion },
    },
  );

  if (updatedProject !== project) {
    await featureActivity(
      project.id,
      "system",
      "Veriqo",
      "marked feature discovery in progress after the first discovered feature",
      feature.id,
    );
  }

  return ok({ feature, project: updatedProject });
}

export type FeatureUpdateInput = Partial<{
  name: string;
  description: string;
  risk: RiskLevel;
  acceptanceCriteria: string[];
  roles: string[];
  dependencies: string[];
  sourceReferences: FeatureSourceReference[];
}>;

export async function updateFeatureFromDiscovery(
  project: Project,
  publicId: string,
  input: FeatureUpdateInput,
): Promise<FeatureServiceResult<{ feature: Feature; project: Project }>> {
  const existing = await findFeatureByPublicId(project.id, publicId);
  if (!existing) return fail(`No feature with public ID "${publicId}" in this project.`);
  if (existing.status === "archived") {
    return fail(`${publicId} is archived. Restore it before updating.`);
  }

  if (input.dependencies) {
    const allFeatures = await repoListFeaturesForProject(project.id);
    const invalidDependency = input.dependencies.find(
      (dep) => dep !== publicId && !allFeatures.some((f) => f.publicId === dep),
    );
    if (invalidDependency) {
      return fail(`Unknown dependency "${invalidDependency}" — it must be an existing feature's public ID.`);
    }
  }

  const now = new Date().toISOString();
  const wasApproved = existing.status === "approved";
  const staysInReview = wasApproved || existing.status === "changed";

  const updated: Feature = {
    ...existing,
    name: input.name?.trim() ?? existing.name,
    description: input.description?.trim() ?? existing.description,
    risk: input.risk ?? existing.risk,
    acceptanceCriteria: input.acceptanceCriteria ?? existing.acceptanceCriteria,
    roles: input.roles ?? existing.roles,
    dependencies: input.dependencies ?? existing.dependencies,
    sourceReferences: input.sourceReferences ?? existing.sourceReferences,
    status: staysInReview ? "changed" : "needsReview",
    // Diff against the last human-approved snapshot, not an intermediate
    // unreviewed Claude draft — so a second Claude update before human
    // review doesn't move the comparison point.
    previousSnapshot: wasApproved
      ? {
          name: existing.name,
          description: existing.description,
          risk: existing.risk,
          acceptanceCriteria: existing.acceptanceCriteria,
        }
      : existing.previousSnapshot,
    createdBySource: "claude",
    promptId: featureDiscoveryPrompt.id,
    promptVersion: featureDiscoveryPrompt.version,
    updatedAt: now,
  };
  await saveFeature(updated);

  const updatedProject = await advanceSetupStep(project, 3);

  await featureActivity(
    project.id,
    "claude",
    "Claude",
    staysInReview
      ? `proposed an update to ${updated.publicId} — now awaiting review`
      : `updated ${updated.publicId} from re-analysis`,
    updated.id,
    { metadata: { promptId: updated.promptId, promptVersion: updated.promptVersion } },
  );

  // Phase 5, "`Needs update` behavior for changed features": an approved
  // feature moving to `changed` cascades its already-`ready` test cases to
  // `needsUpdate` rather than leaving stale coverage silently marked ready.
  if (wasApproved) {
    await markTestCasesNeedsUpdateForFeatureChange(updatedProject, updated.id, updated.publicId);
  }

  return ok({ feature: updated, project: updatedProject });
}

export async function listFeaturesForMcp(project: Project, status?: FeatureStatus): Promise<Feature[]> {
  const all = await repoListFeaturesForProject(project.id);
  return status ? all.filter((f) => f.status === status) : all;
}

// ---- Human review actions ----

async function recomputeReviewStep(project: Project): Promise<Project> {
  const features = await repoListFeaturesForProject(project.id);
  const allReviewed =
    features.length > 0 && features.every((f) => f.status === "approved" || f.status === "archived");
  return allReviewed ? advanceSetupStep(project, 4) : project;
}

async function maybeLogReviewComplete(project: Project, updatedProject: Project): Promise<void> {
  if (updatedProject === project) return;
  await featureActivity(
    project.id,
    "system",
    "Veriqo",
    "marked feature review complete — every discovered feature has been reviewed",
    project.id,
  );
}

export async function approveFeature(
  project: Project,
  publicId: string,
  actorName: string,
): Promise<FeatureServiceResult<{ feature: Feature; project: Project }>> {
  const existing = await findFeatureByPublicId(project.id, publicId);
  if (!existing) return fail("Feature not found.");
  if (existing.status === "approved") return ok({ feature: existing, project });
  if (existing.status === "archived") return fail(`${publicId} is archived. Restore it before approving.`);

  const now = new Date().toISOString();
  // Approving is the human's explicit "this is a real, distinct feature"
  // signal — it resolves both a pending Claude diff and a possible-duplicate
  // flag, the same way `editFeature` does. Merge the two into one record
  // instead if they really are the same feature.
  const updated: Feature = {
    ...existing,
    status: "approved",
    previousSnapshot: undefined,
    possibleDuplicateOfId: undefined,
    updatedAt: now,
  };
  await saveFeature(updated);

  await featureActivity(project.id, "human", actorName, `approved ${updated.publicId} — ${updated.name}`, updated.id);

  const updatedProject = await recomputeReviewStep(project);
  await maybeLogReviewComplete(project, updatedProject);

  return ok({ feature: updated, project: updatedProject });
}

export async function bulkApproveFeatures(
  project: Project,
  publicIds: readonly string[],
  actorName: string,
): Promise<FeatureServiceResult<{ project: Project; approvedCount: number }>> {
  const now = new Date().toISOString();
  const approved: Feature[] = [];

  for (const publicId of publicIds) {
    const existing = await findFeatureByPublicId(project.id, publicId);
    if (!existing || existing.status === "approved" || existing.status === "archived") continue;
    const updated: Feature = {
      ...existing,
      status: "approved",
      previousSnapshot: undefined,
      possibleDuplicateOfId: undefined,
      updatedAt: now,
    };
    await saveFeature(updated);
    approved.push(updated);
  }

  if (approved.length === 0) return ok({ project, approvedCount: 0 });

  await featureActivity(
    project.id,
    "human",
    actorName,
    `approved ${approved.length} feature${approved.length === 1 ? "" : "s"} (${approved.map((f) => f.publicId).join(", ")})`,
    project.id,
  );

  const updatedProject = await recomputeReviewStep(project);
  await maybeLogReviewComplete(project, updatedProject);

  return ok({ project: updatedProject, approvedCount: approved.length });
}

export type FeatureEditInput = {
  name: string;
  description: string;
  risk: RiskLevel;
  acceptanceCriteria: string[];
  roles: string[];
  dependencies: string[];
};

export async function editFeature(
  project: Project,
  publicId: string,
  input: FeatureEditInput,
  actorName: string,
): Promise<FeatureServiceResult<{ feature: Feature }>> {
  const existing = await findFeatureByPublicId(project.id, publicId);
  if (!existing) return fail("Feature not found.");
  if (existing.status === "archived") return fail(`${publicId} is archived. Restore it before editing.`);

  const allFeatures = await repoListFeaturesForProject(project.id);
  const invalidDependency = input.dependencies.find(
    (dep) => dep !== publicId && !allFeatures.some((f) => f.publicId === dep),
  );
  if (invalidDependency) {
    return fail(`Unknown dependency "${invalidDependency}" — it must be an existing feature's public ID.`);
  }

  const now = new Date().toISOString();
  const updated: Feature = {
    ...existing,
    name: input.name.trim(),
    description: input.description.trim(),
    risk: input.risk,
    acceptanceCriteria: input.acceptanceCriteria,
    roles: input.roles,
    dependencies: input.dependencies,
    // A human edit resolves whatever Claude diff was pending, and — since a
    // reviewed edit is the human confirming this is a real, distinct record
    // — any possible-duplicate flag too. Merge instead if it really is a
    // duplicate.
    previousSnapshot: undefined,
    possibleDuplicateOfId: undefined,
    updatedAt: now,
  };
  await saveFeature(updated);

  await featureActivity(project.id, "human", actorName, `edited ${updated.publicId} — ${updated.name}`, updated.id);

  return ok({ feature: updated });
}

export async function archiveFeature(
  project: Project,
  publicId: string,
  actorName: string,
): Promise<FeatureServiceResult<{ feature: Feature; project: Project }>> {
  const existing = await findFeatureByPublicId(project.id, publicId);
  if (!existing) return fail("Feature not found.");
  if (existing.status === "archived") return ok({ feature: existing, project });

  const now = new Date().toISOString();
  const updated: Feature = { ...existing, status: "archived", updatedAt: now };
  await saveFeature(updated);

  await featureActivity(project.id, "human", actorName, `archived ${updated.publicId} — ${updated.name}`, updated.id);

  const updatedProject = await recomputeReviewStep(project);
  await maybeLogReviewComplete(project, updatedProject);

  return ok({ feature: updated, project: updatedProject });
}

export async function bulkArchiveFeatures(
  project: Project,
  publicIds: readonly string[],
  actorName: string,
): Promise<FeatureServiceResult<{ project: Project; archivedCount: number }>> {
  const now = new Date().toISOString();
  const archived: Feature[] = [];

  for (const publicId of publicIds) {
    const existing = await findFeatureByPublicId(project.id, publicId);
    if (!existing || existing.status === "archived") continue;
    const updated: Feature = { ...existing, status: "archived", updatedAt: now };
    await saveFeature(updated);
    archived.push(updated);
  }

  if (archived.length === 0) return ok({ project, archivedCount: 0 });

  await featureActivity(
    project.id,
    "human",
    actorName,
    `archived ${archived.length} feature${archived.length === 1 ? "" : "s"} (${archived.map((f) => f.publicId).join(", ")})`,
    project.id,
  );

  const updatedProject = await recomputeReviewStep(project);
  await maybeLogReviewComplete(project, updatedProject);

  return ok({ project: updatedProject, archivedCount: archived.length });
}

export async function restoreFeature(
  project: Project,
  publicId: string,
  actorName: string,
): Promise<FeatureServiceResult<{ feature: Feature }>> {
  const existing = await findFeatureByPublicId(project.id, publicId);
  if (!existing) return fail("Feature not found.");
  if (existing.status !== "archived") return ok({ feature: existing });

  const now = new Date().toISOString();
  const updated: Feature = { ...existing, status: "draft", updatedAt: now };
  await saveFeature(updated);

  await featureActivity(project.id, "human", actorName, `restored ${updated.publicId} from archive`, updated.id);

  return ok({ feature: updated });
}

export type MergeFeaturesResult = { survivor: Feature; archived: Feature };

/**
 * Folds `mergedPublicId` into `survivorPublicId`: unions their reviewable
 * content, re-points any test cases/issues that referenced the merged
 * feature (so nothing dangles), and archives the merged feature with a note
 * pointing at its survivor.
 */
export async function mergeFeatures(
  project: Project,
  survivorPublicId: string,
  mergedPublicId: string,
  actorName: string,
): Promise<FeatureServiceResult<MergeFeaturesResult>> {
  if (survivorPublicId === mergedPublicId) {
    return fail("Choose two different features to merge.");
  }

  const survivor = await findFeatureByPublicId(project.id, survivorPublicId);
  const merged = await findFeatureByPublicId(project.id, mergedPublicId);
  if (!survivor || !merged) return fail("One of the selected features could not be found.");
  if (survivor.status === "archived" || merged.status === "archived") {
    return fail("Archived features can't be merged.");
  }

  const now = new Date().toISOString();

  const mergedSurvivor: Feature = {
    ...survivor,
    acceptanceCriteria: dedupeStrings([...survivor.acceptanceCriteria, ...merged.acceptanceCriteria]),
    roles: dedupeStrings([...survivor.roles, ...merged.roles]),
    dependencies: dedupeStrings([...survivor.dependencies, ...merged.dependencies]).filter(
      (dep) => dep !== survivor.publicId,
    ),
    sourceReferences: dedupeSourceReferences([...survivor.sourceReferences, ...merged.sourceReferences]),
    possibleDuplicateOfId: undefined,
    updatedAt: now,
  };
  await saveFeature(mergedSurvivor);

  const archivedMerged: Feature = {
    ...merged,
    status: "archived",
    possibleDuplicateOfId: undefined,
    updatedAt: now,
  };
  await saveFeature(archivedMerged);

  await reassignFeatureReferences(merged.id, survivor.id);

  await featureActivity(
    project.id,
    "human",
    actorName,
    `merged ${merged.publicId} (${merged.name}) into ${survivor.publicId}`,
    survivor.id,
    { relatedEntities: [{ type: "feature", id: merged.id }] },
  );

  return ok({ survivor: mergedSurvivor, archived: archivedMerged });
}

/** Just an audit trail entry — the actual regeneration happens when Claude calls `update_feature`. */
export async function logFeatureRegenerationRequested(
  project: Project,
  publicId: string,
  actorName: string,
): Promise<void> {
  const feature = await findFeatureByPublicId(project.id, publicId);
  if (!feature) return;
  await featureActivity(
    project.id,
    "human",
    actorName,
    `asked Claude to regenerate ${feature.publicId} — ${feature.name}`,
    feature.id,
  );
}

// ---- Polling support for the "waiting for Claude" discovery panel ----

export type FeatureDiscoveryActivitySince = {
  events: ActivityEvent[];
  newFeatureCount: number;
};

export async function getFeatureDiscoveryActivitySince(
  project: Project,
  sinceIso: string,
): Promise<FeatureDiscoveryActivitySince> {
  const since = new Date(sinceIso).getTime();
  const allActivity = await listActivityForProject(project.id);
  const events = allActivity
    .filter((event) => event.entityType === "feature" && new Date(event.createdAt).getTime() > since)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-20);

  const newFeatureCount = events.filter(
    (event) => event.actorType === "claude" && event.action.startsWith("discovered "),
  ).length;

  return { events, newFeatureCount };
}
