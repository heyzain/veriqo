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

/**
 * Project-scoped Claude MCP credential (Phase 3). Only one `active`
 * credential exists per project at a time — issuing a new one revokes the
 * previous (03-CLAUDE-RULES.md, "Project-specific, revocable credentials").
 * `secretHash` never leaves the server; `displayPrefix`/`displaySuffix` are
 * the only fragments of the plaintext kept for masked display
 * (04-CONFIG-BLUEPRINT.md security requirement: "Never log or return full
 * secrets after initial issuance").
 */
export type McpCredentialStatus = "active" | "revoked";

export type McpCredential = {
  id: string;
  projectId: string;
  status: McpCredentialStatus;
  secretHash: string;
  displayPrefix: string;
  displaySuffix: string;
  createdAt: string;
  createdByName: string;
  revokedAt?: string;
  revokedByName?: string;
};

/** `McpCredential` with the hash stripped — the only shape allowed to reach a client component. */
export type PublicMcpCredential = Omit<McpCredential, "secretHash">;

export type McpConnectionAttemptStatus = "success" | "error";

/**
 * Latest-attempt state per project, kept separate from `McpCredential` so a
 * revoked/regenerated credential doesn't erase the audit trail of what the
 * last connection attempt looked like (used to render the "error" state
 * with a recovery path even after the offending credential is gone).
 */
export type McpConnectionState = {
  projectId: string;
  lastAttemptAt?: string;
  lastAttemptStatus?: McpConnectionAttemptStatus;
  lastAttemptCredentialId?: string;
  lastAttemptTool?: string;
  lastAttemptError?: string;
  lastSuccessAt?: string;
  lastSuccessCredentialId?: string;
};
