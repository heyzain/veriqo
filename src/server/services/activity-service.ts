import "server-only";

import {
  findFeatureById,
  findIssueById,
  findTestCaseById,
  findTestResultById,
  findTestRunById,
} from "@/server/repositories/project-repository";
import type { Project } from "@/types/domain";

/**
 * Resolves one activity event's `entityId` (an internal ID — never shown
 * directly, per 04-CONFIG-BLUEPRINT.md, "Public IDs") to a public label and
 * a route, so the Activity ledger can render a real deep link instead of
 * plain text (Phase 9 Build: "Chronological activity ledger with filters
 * and deep links"). Returns `null` when the record no longer exists (e.g.
 * merged away) or the entity type has no detail route — the ledger still
 * shows the sentence, just without a link.
 */
export type ActivityEntityRef = {
  label: string;
  href: string;
};

export async function resolveActivityEntity(
  project: Project,
  entityType: string,
  entityId: string,
): Promise<ActivityEntityRef | null> {
  switch (entityType) {
    case "feature": {
      const feature = await findFeatureById(project.id, entityId);
      return feature ? { label: feature.publicId, href: `/projects/${project.slug}/features/${feature.publicId}` } : null;
    }
    case "testCase": {
      const testCase = await findTestCaseById(project.id, entityId);
      return testCase ? { label: testCase.publicId, href: `/projects/${project.slug}/test-cases` } : null;
    }
    case "testRun": {
      const testRun = await findTestRunById(project.id, entityId);
      return testRun ? { label: testRun.publicId, href: `/projects/${project.slug}/test-runs/${testRun.publicId}` } : null;
    }
    case "testResult": {
      // No standalone result page — link to the run it belongs to.
      const result = await findTestResultById(project.id, entityId);
      if (!result) return null;
      const testRun = await findTestRunById(project.id, result.testRunId);
      return testRun ? { label: testRun.publicId, href: `/projects/${project.slug}/test-runs/${testRun.publicId}` } : null;
    }
    case "issue": {
      const issue = await findIssueById(project.id, entityId);
      return issue ? { label: issue.publicId, href: `/projects/${project.slug}/issues/${issue.publicId}` } : null;
    }
    case "project":
      return { label: project.publicId, href: `/projects/${project.slug}` };
    case "mcpConnection":
      return { label: "Claude MCP", href: `/projects/${project.slug}/mcp` };
    default:
      return null;
  }
}
