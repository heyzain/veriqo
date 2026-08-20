# Veriqo — Native Automation Architecture (Phase 0)

## Status

Architectural boundary only. No execution engine exists yet — nothing in
`server/automation/` launches a browser, and no UI exposes a working "Run
automatically" action. See "Not yet implemented" below.

## Key principle

Execution method may differ, but `TestRun`, `TestResult`, `Issue`, Rerun,
and Verification remain the canonical Veriqo lifecycle:

```text
Project → Feature → Test case → Test run → Result → Issue → Fix → Rerun → Verification
```

Only the actor performing the test changes. Veriqo now formally understands
three execution modes for a `TestRun` (`config/status.config.ts`,
`TestExecutionMode`):

| Mode | Who drives it | Introduced |
| --- | --- | --- |
| `manual` | A human, in the focused runner | Phase 6 |
| `claudeAssisted` | Claude, over MCP (`submit_test_result`, ...) | Phase 8 |
| `veriqoAutomated` | Veriqo's own native execution engine | Phase 0 (boundary only) |

There is no second `TestRun`/`TestResult` system for automated execution.
A `veriqoAutomated` run is a normal `TestRun`, using the same
`test-run-service.ts`, `test-result` records, `issue-service.ts`, and
activity ledger every other execution mode uses.

Playwright is an implementation detail of a future automation executor, not
a replacement for Veriqo's domain model. The `e2e/` directory holds
Playwright specs that test Veriqo *itself*; the native automation engine
(future phases) is Veriqo testing *other* applications. These stay separate.

## The boundary

```text
AI / Playwright (future)
      ↓
AutomationExecutor        (server/automation/types.ts, executor.ts)
      ↓
AutomationOrchestrator     (server/automation/orchestrator.ts)
      ↓
Existing Veriqo services   (test-run-service.ts, issue-service.ts)
      ↓
Repositories                (project-repository.ts)
      ↓
MongoDB
```

Never:

```text
AI / Playwright → MongoDB
```

### `server/automation/types.ts`

- `AutomationExecutionContext` — the typed handle an executor receives:
  `projectId`, `featureId?`, `testCaseId`, `testRunId`. Real domain IDs, not
  full `Project`/`TestCase` objects — an executor resolves whatever else it
  needs itself, scoped to these IDs.
- `AutomationExecutionOutcome` — what an executor reports back: reuses
  `ResultStatus` (minus `notRun`) rather than a second pass/fail vocabulary.
- `AutomationExecutor` — the contract a future execution engine implements.
  No knowledge of browsers, the DOM, or `@playwright/test`.

### `server/automation/executor.ts`

`NotImplementedAutomationExecutor` — Phase 0's only executor. Refuses
outright rather than fabricating a result ("Never claim execution evidence
that was not actually received," 03-CLAUDE-RULES.md). Server-internal only;
nothing under `app/**` imports it.

### `server/automation/orchestrator.ts`

`buildAutomationExecutionContext` resolves one test case within a
`veriqoAutomated` run into its `AutomationExecutionContext` — both lookups
are scoped to `project.id`, and the test case must belong to the run's
`selectedTestCaseIds`, so a context can never straddle two projects.

`startAutomationExecution` runs the (injectable) executor and, on a real
outcome, records it through the exact same `submitTestResult` path the
manual runner and Claude's MCP tool use, then calls
`applyRerunResultToIssuesForCase` — the one place that verifies or reopens
an issue from a passed/failed rerun. Every invariant those services already
enforce (project scoping, idempotency, legal `TestRun`/`Issue` transitions,
rerun-gated verification) applies to a `veriqoAutomated` result unchanged,
because nothing in the automation domain writes to a repository or MongoDB
directly.

## Execution-source safety

A native automation executor can never, by construction:

- verify its own issue directly — only `issue-service.applyRerunResultToIssues`
  does that, and only from a real passed-rerun `TestResult`
- skip the rerun requirement — `verifyIssueFromPassedRerun` is unreachable
  any other way
- mutate another project — every repository lookup this domain uses is
  scoped by `project.id`
- write an arbitrary result status — `submitTestResult` validates it
- bypass a `TestRun`/`Issue`'s legal status transitions — those live in
  `test-run-service.ts`/`issue-service.ts`, not in the automation domain

## Activity and attribution

A new `ActorType`, `automation` (`config/status.config.ts`), is distinct
from `claude` — an automated run's activity/results are attributed to
"Veriqo Automation," never mislabeled as Claude-assisted. `SourceBadge` and
the activity ledger pick this up automatically through the same
config-driven pattern every other actor type uses.

## UI

`ExecutionModeBadge` (`components/shared/execution-mode-badge.tsx`) renders
a run's execution mode from the shared `executionModes` config — the same
config-driven convention `StatusBadge`/`SourceBadge` use. No dedicated
automation dashboard exists. The create-run form does not offer
`veriqoAutomated` as a selectable option yet, since choosing it would create
a run nothing can execute — there is no "Run automatically" button anywhere
in the product.

## Not yet implemented (deliberately out of scope for Phase 0)

Browser launching, navigation, clicks, form filling, assertions,
screenshots/traces/video, network/console capture, environment/credential
management, AI browser agents, self-healing locators, regression suites,
CI/CD or GitHub integration, visual regression, cross-browser execution, and
any queue/worker infrastructure. These belong to the phase that implements a
real `AutomationExecutor`.

## Data model impact

- `TestRun.executionMode` widened from `"manual" | "claudeAssisted"` to
  `TestExecutionMode` (`"manual" | "claudeAssisted" | "veriqoAutomated"`).
  Stored as a plain string in MongoDB (`test-run.model.ts`) — no schema or
  migration change.
- `ActorType` gained `"automation"`. Same storage shape as every other actor
  type — no migration.
- `issue-service.createFocusedRerun` accepts an optional `executionMode`
  (defaults to `manual`, unchanged), so a focused retest can itself be a
  `veriqoAutomated` run once an executor exists.
- No new collections, models, or duplicate run/result system.

Existing manual and Claude-assisted runs are read, written, and rendered
exactly as before.
