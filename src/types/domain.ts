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

/** A codebase location Claude cited as evidence for a discovered feature. */
export type FeatureSourceReference = {
  path: string;
  note?: string;
};

/**
 * The snapshot of a feature's reviewable content immediately before Claude's
 * latest proposed update overwrote it — kept only while `status === "changed"`
 * so the review UI can render a before/after diff (01-DESIGN-SYSTEM.md,
 * "Diff/review treatment for Claude updates", Phase 4). Cleared once a human
 * approves or edits the feature, since at that point there is nothing left
 * to compare against.
 */
export type FeatureSnapshot = {
  name: string;
  description: string;
  risk: RiskLevel;
  acceptanceCriteria: readonly string[];
};

export type Feature = {
  id: string;
  publicId: string;
  projectId: string;
  name: string;
  description: string;
  status: FeatureStatus;
  risk: RiskLevel;
  acceptanceCriteria: readonly string[];
  /** User roles this feature behaves differently for, e.g. "Vault owner". */
  roles: readonly string[];
  /** Other features this one depends on, referenced by their `publicId`. */
  dependencies: readonly string[];
  sourceReferences: readonly FeatureSourceReference[];
  /**
   * Set when this feature was created alongside an existing one with a
   * confusingly similar name — surfaced for human review rather than
   * silently merged or silently duplicated (Phase 4 acceptance: "Duplicate/
   * conflicting features are surfaced"). References another `Feature.id`.
   */
  possibleDuplicateOfId?: string;
  previousSnapshot?: FeatureSnapshot;
  /** Who produced the current content — labels the record by source (03-CLAUDE-RULES.md). */
  createdBySource: ActorType;
  promptId?: string;
  promptVersion?: number;
  /**
   * Caller-supplied key from the MCP `create_feature` call, if any — a
   * retried call with the same key returns the already-created feature
   * instead of inserting a duplicate (04-CONFIG-BLUEPRINT.md, "Use
   * idempotency keys for MCP writes and retried mutations").
   */
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type TestCasePriority = "critical" | "high" | "medium" | "low";

/**
 * The snapshot of a test case's reviewable content immediately before
 * Claude's latest proposed update overwrote it — the same "diff before
 * approving again" treatment `FeatureSnapshot` gives features (Phase 5
 * mirrors Phase 4's review pattern). Kept only while `status ===
 * "needsUpdate"`.
 */
export type TestCaseSnapshot = {
  title: string;
  steps: readonly string[];
  expectedResult: string;
  priority: TestCasePriority;
};

export type TestCase = {
  id: string;
  /** Module-aware, e.g. "PV-07" — see `lib/ids/test-case-identifiers.ts`. */
  publicId: string;
  projectId: string;
  /** References the parent `Feature.id` (internal) — resolved to/from its `publicId` at the MCP boundary. */
  featureId: string;
  title: string;
  status: TestCaseStatus;
  priority: TestCasePriority;
  preconditions?: string;
  steps: readonly string[];
  expectedResult: string;
  /** User roles this case exercises, if it varies by role (mirrors `Feature.roles`). */
  roles: readonly string[];
  /** Environments/browsers this case targets, e.g. "Chrome", "Mobile Safari". */
  environments: readonly string[];
  /**
   * Set when this test case was generated with a confusingly similar title
   * to an existing, non-archived case on the same feature — surfaced for
   * human review rather than silently created or silently merged (Phase 5,
   * "Duplicate/conflict detection"). References another `TestCase.id`.
   */
  possibleDuplicateOfId?: string;
  previousSnapshot?: TestCaseSnapshot;
  createdBySource: ActorType;
  promptId?: string;
  promptVersion?: number;
  /** Idempotency key from the MCP `create_test_case` call, if any — see `Feature.idempotencyKey`. */
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type TestRun = {
  id: string;
  publicId: string;
  projectId: string;
  name: string;
  status: TestRunStatus;
  /** Build/release identifier under test, e.g. "1.4.0-rc.1". */
  build: string;
  environment: string;
  /** Free-text browser/device, e.g. "Chrome 128", "iPhone 15 — Safari". */
  browser: string;
  assigneeName?: string;
  notes?: string;
  /**
   * Ordered — the sequence the focused runner (Phase 6) steps through.
   * References `TestCase.id`. A `TestResult` exists for every entry from the
   * moment the run is created (`notRun`), so progress is never inferred from
   * a partial results list.
   */
  selectedTestCaseIds: readonly string[];
  createdBySource: ActorType;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  /** Set the first time the run moves out of `planned`. */
  startedAt?: string;
  /** Set when every selected case has a result (`completed` or `needsAttention`). */
  completedAt?: string;
};

/**
 * A piece of evidence attached to a result (Phase 6 Build: "Evidence upload
 * and preview"). `dataUrl` stands in for real object storage in this mock
 * environment — a production backend would swap it for an uploaded file URL
 * while keeping the same shape (03-CLAUDE-RULES.md, "Validate evidence file
 * type, size, and access").
 */
export type TestEvidence = {
  id: string;
  name: string;
  /** MIME type, validated against evidence.config.ts at upload time. */
  type: string;
  /** Bytes. */
  size: number;
  dataUrl: string;
};

export type TestResult = {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: ResultStatus;
  actualResult?: string;
  evidence: readonly TestEvidence[];
  recordedBySource: ActorType;
  recordedByName?: string;
  recordedAt: string;
  updatedAt: string;
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
