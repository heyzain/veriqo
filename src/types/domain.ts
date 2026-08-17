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

export type Project = {
  id: string;
  publicId: string;
  name: string;
  description: string;
  appUrl: string;
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
