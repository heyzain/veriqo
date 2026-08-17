import type {
  ActorType,
  FeatureStatus,
  IssueStatus,
  ResultStatus,
  TestCaseStatus,
  TestRunStatus,
} from "@/config/status.config";

/**
 * Core domain types, foundational to the
 * `Project → Feature → Test case → Test run → Result → Issue → Fix → Rerun → Verification`
 * chain (00-PRODUCT.md). Later phases add persistence and MCP tools around
 * these shapes; Phase 0 only establishes them so mock data and components
 * have something real to agree on.
 */

export type RiskLevel = "low" | "medium" | "high";

export type ProjectEnvironment = "development" | "staging" | "production";

export type Project = {
  id: string;
  /** Short display code, e.g. "LNKV" — never the internal `id`. */
  publicId: string;
  /** URL-safe identifier used in routes instead of the internal `id`. */
  slug: string;
  ownerId: string;
  name: string;
  description: string;
  appUrl: string;
  environment: ProjectEnvironment;
  /** Repository URL or local-path context, per the core journey in 00-PRODUCT.md. */
  repository?: string;
  archived: boolean;
  /** Count of completed onboarding steps (0-7) — see setup-steps.config.ts. */
  setupStepsCompleted: number;
  createdAt: string;
};

export type Feature = {
  id: string;
  publicId: string;
  projectId: string;
  name: string;
  description: string;
  status: FeatureStatus;
  risk: RiskLevel;
};

export type TestCase = {
  id: string;
  publicId: string;
  projectId: string;
  featureId: string;
  title: string;
  status: TestCaseStatus;
  steps: readonly string[];
  expectedResult: string;
};

export type TestRun = {
  id: string;
  publicId: string;
  projectId: string;
  name: string;
  status: TestRunStatus;
  build: string;
  environment: string;
  browser: string;
};

export type TestResult = {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: ResultStatus;
  actualResult?: string;
  recordedAt: string;
};

export type Issue = {
  id: string;
  publicId: string;
  projectId: string;
  featureId: string;
  testCaseId: string;
  originResultId: string;
  title: string;
  status: IssueStatus;
  severity: RiskLevel;
  fixNote?: string;
  rerunResultId?: string;
};

export type ActivityEvent = {
  id: string;
  projectId: string;
  actorType: ActorType;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  relatedEntities?: readonly { type: string; id: string }[];
  metadata?: Record<string, unknown>;
  createdAt: string;
};
