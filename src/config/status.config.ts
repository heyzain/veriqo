import type { IconName } from "@/components/ui/icon";

/**
 * Every status badge in the product maps to one of these tones. Tones are
 * the only way status is communicated visually — they always pair with a
 * label and usually an icon, never color alone (01-DESIGN-SYSTEM.md,
 * "Status design").
 */
export type StatusTone =
  | "pass"
  | "fail"
  | "partial"
  | "blocked"
  | "progress"
  | "ai"
  | "neutral";

type StatusDefinition<Key extends string> = {
  label: string;
  tone: StatusTone;
  icon: IconName;
  /** Allowed next states. Enforced by state-transition services, not this config. */
  transitions: readonly Key[];
};

type StatusMap<Key extends string> = Record<Key, StatusDefinition<Key>>;

/**
 * One typed source of truth per domain status map: label, tone, icon, and
 * allowed transitions. The server transition service — not this file —
 * enforces business rules such as "verification requires a passed rerun";
 * this config only drives presentation and the set of legal next states.
 */

export type FeatureStatus =
  | "draft"
  | "needsReview"
  | "approved"
  | "changed"
  | "archived";

export const featureStatuses: StatusMap<FeatureStatus> = {
  draft: { label: "Draft", tone: "neutral", icon: "draft", transitions: ["needsReview"] },
  needsReview: {
    label: "Needs review",
    tone: "ai",
    icon: "needsReview",
    transitions: ["approved", "draft"],
  },
  approved: {
    label: "Approved",
    tone: "pass",
    icon: "approved",
    transitions: ["changed", "archived"],
  },
  changed: {
    label: "Changed",
    tone: "partial",
    icon: "changed",
    transitions: ["approved", "needsReview"],
  },
  archived: {
    label: "Archived",
    tone: "blocked",
    icon: "archived",
    transitions: ["draft"],
  },
};

export type TestCaseStatus =
  | "draft"
  | "inReview"
  | "ready"
  | "needsUpdate"
  | "archived";

export const testCaseStatuses: StatusMap<TestCaseStatus> = {
  draft: { label: "Draft", tone: "neutral", icon: "draft", transitions: ["inReview"] },
  inReview: {
    label: "In review",
    tone: "ai",
    icon: "needsReview",
    transitions: ["ready", "draft"],
  },
  ready: {
    label: "Ready",
    tone: "pass",
    icon: "approved",
    transitions: ["needsUpdate", "archived"],
  },
  needsUpdate: {
    label: "Needs update",
    tone: "partial",
    icon: "changed",
    transitions: ["inReview"],
  },
  archived: {
    label: "Archived",
    tone: "blocked",
    icon: "archived",
    transitions: ["draft"],
  },
};

export type TestRunStatus =
  | "planned"
  | "inProgress"
  | "paused"
  | "completed"
  | "needsAttention";

export const testRunStatuses: StatusMap<TestRunStatus> = {
  planned: { label: "Planned", tone: "neutral", icon: "planned", transitions: ["inProgress"] },
  inProgress: {
    label: "In progress",
    tone: "progress",
    icon: "inProgress",
    transitions: ["paused", "completed", "needsAttention"],
  },
  paused: {
    label: "Paused",
    tone: "partial",
    icon: "paused",
    transitions: ["inProgress"],
  },
  completed: {
    label: "Completed",
    tone: "pass",
    icon: "approved",
    transitions: ["needsAttention"],
  },
  needsAttention: {
    label: "Needs attention",
    tone: "fail",
    icon: "alert",
    transitions: ["inProgress", "completed"],
  },
};

export type ResultStatus = "notRun" | "pass" | "fail" | "partial" | "blocked";

export const resultStatuses: StatusMap<ResultStatus> = {
  notRun: {
    label: "Not run",
    tone: "neutral",
    icon: "notRun",
    transitions: ["pass", "fail", "partial", "blocked"],
  },
  pass: { label: "Pass", tone: "pass", icon: "approved", transitions: [] },
  fail: { label: "Fail", tone: "fail", icon: "fail", transitions: [] },
  partial: { label: "Partial", tone: "partial", icon: "partial", transitions: [] },
  blocked: { label: "Blocked", tone: "blocked", icon: "blocked", transitions: [] },
};

export type IssueStatus =
  | "open"
  | "investigating"
  | "fixInProgress"
  | "readyForRetest"
  | "verified"
  | "reopened";

export const issueStatuses: StatusMap<IssueStatus> = {
  open: { label: "Open", tone: "fail", icon: "fail", transitions: ["investigating"] },
  investigating: {
    label: "Investigating",
    tone: "progress",
    icon: "inProgress",
    transitions: ["fixInProgress", "open"],
  },
  fixInProgress: {
    label: "Fix in progress",
    tone: "progress",
    icon: "inProgress",
    transitions: ["readyForRetest", "open"],
  },
  readyForRetest: {
    label: "Ready for retest",
    tone: "partial",
    icon: "partial",
    transitions: ["verified", "reopened"],
  },
  verified: {
    label: "Verified",
    tone: "pass",
    icon: "approved",
    transitions: [],
  },
  reopened: {
    label: "Reopened",
    tone: "fail",
    icon: "fail",
    transitions: ["investigating", "fixInProgress"],
  },
};

/**
 * Actor types, shared by the activity event contract (04-CONFIG-BLUEPRINT.md)
 * and any record-provenance UI (e.g. the future `SourceBadge`).
 */
export type ActorType = "human" | "claude" | "system" | "import";

export const actorTypes: Record<
  ActorType,
  { label: string; tone: StatusTone; icon: IconName }
> = {
  human: { label: "Manual", tone: "neutral", icon: "human" },
  claude: { label: "Claude", tone: "ai", icon: "claude" },
  system: { label: "System", tone: "blocked", icon: "system" },
  import: { label: "Imported", tone: "blocked", icon: "import" },
};
