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
function findPossibleDuplicate(projectId: string, name: string, excludeFeatureId?: string): Feature | null {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  return (
    repoListFeaturesForProject(projectId).find((f) => {
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

function featureActivity(
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
    entityType: "feature",
    entityId,
    createdAt: new Date().toISOString(),
    ...extra,
  });
}

export function listFeaturesForProject(project: Project): Feature[] {
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

export function getFeatureDetail(project: Project, publicId: string): FeatureDetail | null {
  const feature = findFeatureByPublicId(project.id, publicId);
  if (!feature) return null;

  const allFeatures = repoListFeaturesForProject(project.id);
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
    testCases: listTestCasesForProject(project.id).filter((tc) => tc.featureId === feature.id),
    issues: listIssuesForProject(project.id).filter((issue) => issue.featureId === feature.id),
    activity: listActivityForProject(project.id).filter(
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

export function createFeatureFromDiscovery(
  project: Project,
  input: FeatureDiscoveryInput,
): FeatureServiceResult<{ feature: Feature; project: Project }> {
  if (input.idempotencyKey) {
    const replay = repoListFeaturesForProject(project.id).find(
      (f) => f.idempotencyKey === input.idempotencyKey,
    );
    if (replay) return ok({ feature: replay, project });
  }

  const allFeatures = repoListFeaturesForProject(project.id);
  const invalidDependency = input.dependencies.find(
    (dep) => !allFeatures.some((f) => f.publicId === dep),
  );
  if (invalidDependency) {
    return fail(`Unknown dependency "${invalidDependency}" — it must be an existing feature's public ID.`);
  }

  const duplicate = findPossibleDuplicate(project.id, input.name);
  const now = new Date().toISOString();

  const feature: Feature = {
    id: randomUUID(),
    publicId: formatPublicId("FEAT", nextFeatureSequence(project.id)),
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
  saveFeature(feature);

  const updatedProject = advanceSetupStep(project, 3);

  featureActivity(
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
    featureActivity(
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

export function updateFeatureFromDiscovery(
  project: Project,
  publicId: string,
  input: FeatureUpdateInput,
): FeatureServiceResult<{ feature: Feature; project: Project }> {
  const existing = findFeatureByPublicId(project.id, publicId);
  if (!existing) return fail(`No feature with public ID "${publicId}" in this project.`);
  if (existing.status === "archived") {
    return fail(`${publicId} is archived. Restore it before updating.`);
  }

  if (input.dependencies) {
    const allFeatures = repoListFeaturesForProject(project.id);
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
  saveFeature(updated);

  const updatedProject = advanceSetupStep(project, 3);

  featureActivity(
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
    markTestCasesNeedsUpdateForFeatureChange(updatedProject, updated.id, updated.publicId);
  }

  return ok({ feature: updated, project: updatedProject });
}

export function listFeaturesForMcp(project: Project, status?: FeatureStatus): Feature[] {
  const all = repoListFeaturesForProject(project.id);
  return status ? all.filter((f) => f.status === status) : all;
}

// ---- Human review actions ----

function recomputeReviewStep(project: Project): Project {
  const features = repoListFeaturesForProject(project.id);
  const allReviewed =
    features.length > 0 && features.every((f) => f.status === "approved" || f.status === "archived");
  return allReviewed ? advanceSetupStep(project, 4) : project;
}

function maybeLogReviewComplete(project: Project, updatedProject: Project): void {
  if (updatedProject === project) return;
  featureActivity(
    project.id,
    "system",
    "Veriqo",
    "marked feature review complete — every discovered feature has been reviewed",
    project.id,
  );
}

export function approveFeature(
  project: Project,
  publicId: string,
  actorName: string,
): FeatureServiceResult<{ feature: Feature; project: Project }> {
  const existing = findFeatureByPublicId(project.id, publicId);
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
  saveFeature(updated);

  featureActivity(project.id, "human", actorName, `approved ${updated.publicId} — ${updated.name}`, updated.id);

  const updatedProject = recomputeReviewStep(project);
  maybeLogReviewComplete(project, updatedProject);

  return ok({ feature: updated, project: updatedProject });
}

export function bulkApproveFeatures(
  project: Project,
  publicIds: readonly string[],
  actorName: string,
): FeatureServiceResult<{ project: Project; approvedCount: number }> {
  const now = new Date().toISOString();
  const approved: Feature[] = [];

  for (const publicId of publicIds) {
    const existing = findFeatureByPublicId(project.id, publicId);
    if (!existing || existing.status === "approved" || existing.status === "archived") continue;
    const updated: Feature = {
      ...existing,
      status: "approved",
      previousSnapshot: undefined,
      possibleDuplicateOfId: undefined,
      updatedAt: now,
    };
    saveFeature(updated);
    approved.push(updated);
  }

  if (approved.length === 0) return ok({ project, approvedCount: 0 });

  featureActivity(
    project.id,
    "human",
    actorName,
    `approved ${approved.length} feature${approved.length === 1 ? "" : "s"} (${approved.map((f) => f.publicId).join(", ")})`,
    project.id,
  );

  const updatedProject = recomputeReviewStep(project);
  maybeLogReviewComplete(project, updatedProject);

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

export function editFeature(
  project: Project,
  publicId: string,
  input: FeatureEditInput,
  actorName: string,
): FeatureServiceResult<{ feature: Feature }> {
  const existing = findFeatureByPublicId(project.id, publicId);
  if (!existing) return fail("Feature not found.");
  if (existing.status === "archived") return fail(`${publicId} is archived. Restore it before editing.`);

  const allFeatures = repoListFeaturesForProject(project.id);
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
  saveFeature(updated);

  featureActivity(project.id, "human", actorName, `edited ${updated.publicId} — ${updated.name}`, updated.id);

  return ok({ feature: updated });
}

export function archiveFeature(
  project: Project,
  publicId: string,
  actorName: string,
): FeatureServiceResult<{ feature: Feature; project: Project }> {
  const existing = findFeatureByPublicId(project.id, publicId);
  if (!existing) return fail("Feature not found.");
  if (existing.status === "archived") return ok({ feature: existing, project });

  const now = new Date().toISOString();
  const updated: Feature = { ...existing, status: "archived", updatedAt: now };
  saveFeature(updated);

  featureActivity(project.id, "human", actorName, `archived ${updated.publicId} — ${updated.name}`, updated.id);

  const updatedProject = recomputeReviewStep(project);
  maybeLogReviewComplete(project, updatedProject);

  return ok({ feature: updated, project: updatedProject });
}

export function bulkArchiveFeatures(
  project: Project,
  publicIds: readonly string[],
  actorName: string,
): FeatureServiceResult<{ project: Project; archivedCount: number }> {
  const now = new Date().toISOString();
  const archived: Feature[] = [];

  for (const publicId of publicIds) {
    const existing = findFeatureByPublicId(project.id, publicId);
    if (!existing || existing.status === "archived") continue;
    const updated: Feature = { ...existing, status: "archived", updatedAt: now };
    saveFeature(updated);
    archived.push(updated);
  }

  if (archived.length === 0) return ok({ project, archivedCount: 0 });

  featureActivity(
    project.id,
    "human",
    actorName,
    `archived ${archived.length} feature${archived.length === 1 ? "" : "s"} (${archived.map((f) => f.publicId).join(", ")})`,
    project.id,
  );

  const updatedProject = recomputeReviewStep(project);
  maybeLogReviewComplete(project, updatedProject);

  return ok({ project: updatedProject, archivedCount: archived.length });
}

export function restoreFeature(
  project: Project,
  publicId: string,
  actorName: string,
): FeatureServiceResult<{ feature: Feature }> {
  const existing = findFeatureByPublicId(project.id, publicId);
  if (!existing) return fail("Feature not found.");
  if (existing.status !== "archived") return ok({ feature: existing });

  const now = new Date().toISOString();
  const updated: Feature = { ...existing, status: "draft", updatedAt: now };
  saveFeature(updated);

  featureActivity(project.id, "human", actorName, `restored ${updated.publicId} from archive`, updated.id);

  return ok({ feature: updated });
}

export type MergeFeaturesResult = { survivor: Feature; archived: Feature };

/**
 * Folds `mergedPublicId` into `survivorPublicId`: unions their reviewable
 * content, re-points any test cases/issues that referenced the merged
 * feature (so nothing dangles), and archives the merged feature with a note
 * pointing at its survivor.
 */
export function mergeFeatures(
  project: Project,
  survivorPublicId: string,
  mergedPublicId: string,
  actorName: string,
): FeatureServiceResult<MergeFeaturesResult> {
  if (survivorPublicId === mergedPublicId) {
    return fail("Choose two different features to merge.");
  }

  const survivor = findFeatureByPublicId(project.id, survivorPublicId);
  const merged = findFeatureByPublicId(project.id, mergedPublicId);
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
  saveFeature(mergedSurvivor);

  const archivedMerged: Feature = {
    ...merged,
    status: "archived",
    possibleDuplicateOfId: undefined,
    updatedAt: now,
  };
  saveFeature(archivedMerged);

  reassignFeatureReferences(merged.id, survivor.id);

  featureActivity(
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
export function logFeatureRegenerationRequested(project: Project, publicId: string, actorName: string): void {
  const feature = findFeatureByPublicId(project.id, publicId);
  if (!feature) return;
  featureActivity(
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

export function getFeatureDiscoveryActivitySince(
  project: Project,
  sinceIso: string,
): FeatureDiscoveryActivitySince {
  const since = new Date(sinceIso).getTime();
  const events = listActivityForProject(project.id)
    .filter((event) => event.entityType === "feature" && new Date(event.createdAt).getTime() > since)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-20);

  const newFeatureCount = events.filter(
    (event) => event.actorType === "claude" && event.action.startsWith("discovered "),
  ).length;

  return { events, newFeatureCount };
}
