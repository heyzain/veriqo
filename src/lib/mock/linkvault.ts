import { formatPublicId } from "@/lib/mock/ids";
import type {
  ActivityEvent,
  Feature,
  Issue,
  Project,
  TestCase,
  TestResult,
  TestRun,
} from "@/types/domain";

/**
 * Deterministic demonstration dataset (00-PRODUCT.md, "Demonstration
 * dataset"). Every value is fixed — no `Math.random()`, no `Date.now()` —
 * so the seed is stable across runs and safe to assert on in tests.
 *
 * Carries the required story end-to-end: `PV-07` fails in `Release
 * Candidate 1`, becomes `ISS-14`, gets a recorded fix, and is verified by a
 * focused rerun that passes.
 */

const project: Project = {
  id: "proj-linkvault",
  publicId: "LNKV",
  slug: "linkvault",
  ownerId: "user-priya",
  name: "LinkVault",
  description: "A personal link-management app with a private, lockable vault.",
  appUrl: "https://linkvault.example.com",
  environment: "staging",
  repository: "github.com/priyanair/linkvault",
  archived: false,
  setupStepsCompleted: 7,
  createdAt: "2026-07-01T09:00:00.000Z",
};

const features: Feature[] = [
  {
    id: "feat-authentication",
    publicId: formatPublicId("FEAT", 1),
    projectId: project.id,
    name: "Authentication",
    description: "Sign up, sign in, and session recovery for a LinkVault account.",
    status: "approved",
    risk: "high",
  },
  {
    id: "feat-link-management",
    publicId: formatPublicId("FEAT", 2),
    projectId: project.id,
    name: "Link Management",
    description: "Save, edit, and remove links, with metadata fetched automatically.",
    status: "approved",
    risk: "medium",
  },
  {
    id: "feat-categories",
    publicId: formatPublicId("FEAT", 3),
    projectId: project.id,
    name: "Categories",
    description: "Group links into user-defined categories.",
    status: "approved",
    risk: "low",
  },
  {
    id: "feat-tags",
    publicId: formatPublicId("FEAT", 4),
    projectId: project.id,
    name: "Tags",
    description: "Free-form tagging with autocomplete from existing tags.",
    status: "needsReview",
    risk: "low",
  },
  {
    id: "feat-favorites",
    publicId: formatPublicId("FEAT", 5),
    projectId: project.id,
    name: "Favorites",
    description: "Star links for quick access from the home view.",
    status: "approved",
    risk: "low",
  },
  {
    id: "feat-search",
    publicId: formatPublicId("FEAT", 6),
    projectId: project.id,
    name: "Search",
    description: "Full-text search across link titles, notes, and tags.",
    status: "approved",
    risk: "medium",
  },
  {
    id: "feat-private-vault",
    publicId: formatPublicId("FEAT", 7),
    projectId: project.id,
    name: "Private Vault",
    description: "A PIN-locked space for sensitive links that re-locks after the session ends.",
    status: "approved",
    risk: "high",
  },
  {
    id: "feat-import-export",
    publicId: formatPublicId("FEAT", 8),
    projectId: project.id,
    name: "Import/Export",
    description: "Bulk import from bookmark files and export the full library as JSON.",
    status: "changed",
    risk: "medium",
  },
  {
    id: "feat-pwa-installation",
    publicId: formatPublicId("FEAT", 9),
    projectId: project.id,
    name: "PWA Installation",
    description: "Install LinkVault as a standalone app on desktop and mobile.",
    status: "draft",
    risk: "low",
  },
  {
    id: "feat-sessions",
    publicId: formatPublicId("FEAT", 10),
    projectId: project.id,
    name: "Sessions",
    description: "Active-session visibility and remote sign-out from other devices.",
    status: "needsReview",
    risk: "medium",
  },
];

const privateVaultCase: TestCase = {
  id: "tc-pv-07",
  publicId: "PV-07",
  projectId: project.id,
  featureId: "feat-private-vault",
  title: "Vault locks after session end",
  status: "ready",
  steps: [
    "Unlock the Private Vault with the correct PIN.",
    "Confirm at least one vault-only link is visible.",
    "End the session (sign out, or let the session expire).",
    "Start a new session and open Private Vault.",
  ],
  expectedResult: "The vault requires the PIN again; no vault-only link is visible before it is entered.",
};

const releaseCandidate1: TestRun = {
  id: "run-rc1",
  publicId: formatPublicId("RUN", 24),
  projectId: project.id,
  name: "Release Candidate 1",
  status: "needsAttention",
  build: "1.4.0-rc.1",
  environment: "Staging",
  browser: "Chrome 128",
};

const focusedRerun: TestRun = {
  id: "run-rc1-rerun",
  publicId: formatPublicId("RERUN", 3),
  projectId: project.id,
  name: "Release Candidate 1 — Focused rerun",
  status: "completed",
  build: "1.4.0-rc.2",
  environment: "Staging",
  browser: "Chrome 128",
};

const failingResult: TestResult = {
  id: "result-pv07-fail",
  testRunId: releaseCandidate1.id,
  testCaseId: privateVaultCase.id,
  status: "fail",
  actualResult:
    "After a new session started, the previously unlocked vault links were still visible without re-entering the PIN.",
  recordedAt: "2026-08-10T14:32:00.000Z",
};

const passingResult: TestResult = {
  id: "result-pv07-pass",
  testRunId: focusedRerun.id,
  testCaseId: privateVaultCase.id,
  status: "pass",
  actualResult: "Vault correctly required the PIN again after the new session started.",
  recordedAt: "2026-08-12T10:05:00.000Z",
};

const privateVaultIssue: Issue = {
  id: "issue-iss-14",
  publicId: formatPublicId("ISS", 14),
  projectId: project.id,
  featureId: "feat-private-vault",
  testCaseId: privateVaultCase.id,
  originResultId: failingResult.id,
  title: "Private Vault stays unlocked across a new session",
  status: "verified",
  severity: "high",
  fixNote:
    "The vault-unlocked flag was stored in localStorage instead of the session store, so it survived sign-out. Moved the flag to sessionStorage and cleared it explicitly on sign-out.",
  rerunResultId: passingResult.id,
};

const activity: ActivityEvent[] = [
  {
    id: "activity-01",
    projectId: project.id,
    actorType: "human",
    actorName: "Priya Nair",
    action: "created the project",
    entityType: "project",
    entityId: project.id,
    createdAt: "2026-07-01T09:00:00.000Z",
  },
  {
    id: "activity-02",
    projectId: project.id,
    actorType: "claude",
    actorName: "Claude",
    action: "discovered 10 features from the codebase",
    entityType: "feature",
    entityId: "feat-private-vault",
    createdAt: "2026-07-01T09:22:00.000Z",
  },
  {
    id: "activity-03",
    projectId: project.id,
    actorType: "human",
    actorName: "Priya Nair",
    action: "approved Private Vault as high risk",
    entityType: "feature",
    entityId: "feat-private-vault",
    createdAt: "2026-07-02T11:10:00.000Z",
  },
  {
    id: "activity-04",
    projectId: project.id,
    actorType: "human",
    actorName: "Priya Nair",
    action: "recorded a failing result for PV-07 in Release Candidate 1",
    entityType: "testResult",
    entityId: failingResult.id,
    relatedEntities: [
      { type: "testCase", id: privateVaultCase.id },
      { type: "testRun", id: releaseCandidate1.id },
    ],
    createdAt: failingResult.recordedAt,
  },
  {
    id: "activity-05",
    projectId: project.id,
    actorType: "human",
    actorName: "Priya Nair",
    action: "opened ISS-14 from the failed result",
    entityType: "issue",
    entityId: privateVaultIssue.id,
    relatedEntities: [{ type: "testCase", id: privateVaultCase.id }],
    createdAt: "2026-08-10T14:40:00.000Z",
  },
  {
    id: "activity-06",
    projectId: project.id,
    actorType: "claude",
    actorName: "Claude",
    action: "investigated ISS-14 and recorded a fix",
    entityType: "issue",
    entityId: privateVaultIssue.id,
    metadata: { fixNote: privateVaultIssue.fixNote },
    createdAt: "2026-08-11T16:05:00.000Z",
  },
  {
    id: "activity-07",
    projectId: project.id,
    actorType: "human",
    actorName: "Priya Nair",
    action: "marked ISS-14 ready for retest",
    entityType: "issue",
    entityId: privateVaultIssue.id,
    createdAt: "2026-08-11T16:20:00.000Z",
  },
  {
    id: "activity-08",
    projectId: project.id,
    actorType: "human",
    actorName: "Priya Nair",
    action: "created a focused rerun for PV-07",
    entityType: "testRun",
    entityId: focusedRerun.id,
    createdAt: "2026-08-12T09:50:00.000Z",
  },
  {
    id: "activity-09",
    projectId: project.id,
    actorType: "human",
    actorName: "Priya Nair",
    action: "recorded a passing result for PV-07 in the focused rerun",
    entityType: "testResult",
    entityId: passingResult.id,
    relatedEntities: [
      { type: "testCase", id: privateVaultCase.id },
      { type: "testRun", id: focusedRerun.id },
    ],
    createdAt: passingResult.recordedAt,
  },
  {
    id: "activity-10",
    projectId: project.id,
    actorType: "system",
    actorName: "Veriqo",
    action: "verified ISS-14 from the passed rerun",
    entityType: "issue",
    entityId: privateVaultIssue.id,
    relatedEntities: [{ type: "testResult", id: passingResult.id }],
    createdAt: "2026-08-12T10:05:30.000Z",
  },
];

export const linkVaultSeed = {
  project,
  features,
  testCases: [privateVaultCase],
  testRuns: [releaseCandidate1, focusedRerun],
  testResults: [failingResult, passingResult],
  issues: [privateVaultIssue],
  activity,
} as const;
