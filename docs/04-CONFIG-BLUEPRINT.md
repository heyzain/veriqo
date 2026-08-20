# Veriqo — Configuration and Project Structure Blueprint

## Purpose

The working name, brand, navigation, AI provider, status wording, prompts, and release-scoring rules will evolve. Centralize them so rebranding or iteration does not require editing dozens of components.

## Suggested structure

```text
src/
  app/
    (auth)/
    (workspace)/
    (project)/projects/[projectId]/
    api/
  components/
    ui/
    shared/
  features/
    auth/
    projects/
    mcp/
    features/
    test-cases/
    test-runs/
    issues/
    activity/
    analytics/
  config/
    product.config.ts
    navigation.config.ts
    status.config.ts
    feature-flags.config.ts
    release-confidence.config.ts
  design-system/
    tokens.css
    themes.css
    typography.css
    motion.css
  lib/
    auth/
    db/
    env/
    permissions/
    activity/
    ids/
  prompts/
    feature-discovery/
    test-generation/
    execution/
    issue-investigation/
  server/
    services/
    repositories/
    mcp/
    automation/   # native automation domain boundary — see 05-NATIVE-AUTOMATION.md
  types/
  test/
```

## Product configuration example

```ts
export const productConfig = {
  name: "Veriqo",
  shortName: "VQ",
  description:
    "A connected QA workspace for features, tests, failures, fixes, and verification.",
  tagline: "Make every failure legible.",
  supportEmail: "support@example.com",
  urls: {
    app: "http://localhost:3000",
    docs: "/docs",
    privacy: "/privacy",
    terms: "/terms",
  },
  assets: {
    logo: "/brand/logo.svg",
    logoMark: "/brand/mark.svg",
    favicon: "/brand/favicon.svg",
  },
  agent: {
    primary: "claude",
    displayName: "Claude Code",
  },
} as const;
```

Components consume this object. They must not repeat `Veriqo`, `VQ`, or `Claude Code` as raw strings unless the text is historical record data.

## Navigation configuration example

```ts
export const projectNavigation = [
  { key: "overview", label: "Overview", href: "" },
  { key: "features", label: "Features", href: "/features" },
  { key: "testCases", label: "Test Cases", href: "/test-cases" },
  { key: "testRuns", label: "Test Runs", href: "/test-runs" },
  { key: "issues", label: "Issues", href: "/issues" },
  { key: "activity", label: "Activity", href: "/activity" },
  { key: "analytics", label: "Analytics", href: "/analytics" },
  { key: "mcp", label: "Claude MCP", href: "/mcp" },
  { key: "settings", label: "Settings", href: "/settings" },
] as const;
```

Resolve project-relative URLs through one helper. Do not concatenate route strings in individual components.

## Status configuration

Maintain one typed source of truth for label, semantic tone, icon key, allowed transitions, and terminal-state behavior.

```ts
export const issueStates = {
  open: { label: "Open", tone: "fail", transitions: ["investigating"] },
  investigating: {
    label: "Investigating",
    tone: "progress",
    transitions: ["fixInProgress", "open"],
  },
  fixInProgress: {
    label: "Fix in progress",
    tone: "progress",
    transitions: ["readyForRetest", "open"],
  },
  readyForRetest: {
    label: "Ready for retest",
    tone: "partial",
    transitions: ["verified", "reopened"],
  },
  verified: { label: "Verified", tone: "pass", transitions: [] },
  reopened: {
    label: "Reopened",
    tone: "fail",
    transitions: ["investigating", "fixInProgress"],
  },
} as const;
```

The server transition service, not the UI configuration alone, enforces verification requirements.

## Feature flags

Initial flags may include:

```ts
export const featureFlags = {
  darkMode: false,
  claudeAssistedRuns: false,
  teamWorkspaces: false,
  billing: false,
  ciIntegrations: false,
  browserAutomation: false,
} as const;
```

Do not use flags to keep abandoned code paths indefinitely. Remove flags after a rollout is stable.

## Environment validation

Create typed server/client environment modules. Example categories:

- Database URL
- Auth secret and provider credentials
- App URL
- Evidence storage configuration
- Email configuration
- Encryption/hashing secret where required
- Monitoring DSN

Only explicitly prefixed public values can enter the browser bundle. Fail startup with a clear message when required server configuration is missing.

## Prompt versioning

Prompts are product assets, not strings embedded in buttons.

Each prompt family should contain:

- Stable identifier
- Version
- Purpose
- Required context schema
- Renderer
- Expected MCP tool/output contract
- Changelog or migration note

Example:

```ts
export const featureDiscoveryPrompt = {
  id: "feature-discovery",
  version: 1,
  render(context: FeatureDiscoveryContext) {
    // Return deterministic prompt text from validated context.
  },
} as const;
```

Store `promptId` and `promptVersion` on generated records/activity where useful.

## Public IDs

Use stable readable identifiers in the UI:

- Features: `FEAT-12`
- Test cases: module-aware IDs such as `AUTH-07` or stable `TEST-107`
- Runs: `RUN-24`
- Issues: `ISS-14`
- Reruns: `RERUN-03`

Keep internal database identifiers private from ordinary UI and MCP output.

## Activity event contract

Use structured events rather than pre-rendered sentences only.

```ts
type ActivityEvent = {
  id: string;
  projectId: string;
  actorType: "human" | "claude" | "system" | "import";
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  relatedEntities?: Array<{ type: string; id: string }>;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
```

Render human-readable sentences in the presentation layer so wording can evolve without rewriting history.

## State-transition services

Do not allow arbitrary status mutation from route handlers.

Use domain services such as:

- `approveFeature`
- `markFeatureChanged`
- `approveTestCase`
- `startTestRun`
- `submitTestResult`
- `createIssueFromFailure`
- `markIssueReadyForRetest`
- `createFocusedRerun`
- `verifyIssueFromPassedRerun`
- `reopenIssueFromFailedRerun`

Each service validates permissions and invariants, writes records transactionally, and emits activity.

## Release-confidence configuration

Keep weights in typed config, but calculate confidence in a tested server-side service.

Inputs should include:

- Approved feature coverage weighted by risk
- Applicable latest pass rate
- Critical/high open failures
- Blocked high-risk tests
- Changed features with stale coverage
- Fixes awaiting retest
- Results requiring human review

The UI must display the contributing reasons. Never show a score as objective truth without explanation.

## Naming migration checklist

When replacing the working name:

1. Update `product.config.ts`.
2. Replace brand assets in `/public/brand`.
3. Update metadata/manifest generation.
4. Update email sender configuration.
5. Review legal pages and external URLs.
6. Search for historical hard-coded name leaks.

If the architecture is followed, feature components should require no edits.
