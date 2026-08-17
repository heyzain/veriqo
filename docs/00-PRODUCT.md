# Veriqo — Product Definition

> Working name. All product naming is configuration-driven and can be replaced later without rewriting components.

## One-line definition

Veriqo is a Claude-connected QA workspace that turns product features into traceable tests, connects failures to fixes and reruns, and shows whether a product is ready to release.

## Product promise

Claude can generate and assist with the work. Veriqo keeps the work structured, reviewable, connected, and trustworthy.

The product preserves this chain:

`Project → Feature → Test case → Test run → Result → Issue → Fix → Rerun → Verification`

No record should become an isolated page or dead end.

## The problem

AI coding agents can inspect code, suggest tests, identify bugs, and make fixes, but the work is usually scattered across chats, terminal output, markdown files, screenshots, and memory. Teams lose answers to important questions:

- Which product behavior has been understood?
- Which features have adequate test coverage?
- What was tested, in which environment, and against which build?
- Which failure created an issue?
- Was a fix actually retested or merely marked done?
- What is blocking a release now?

Veriqo creates a calm system of record for that entire lifecycle.

## Primary user

The first user is a developer or small product team using Claude Code to build and test a web application. They may not have a dedicated QA team, but they need a disciplined and visible QA process.

Secondary users:

- Manual QA engineers who want Claude-assisted test design
- Technical founders preparing releases
- Agencies testing several client projects
- Small teams that need evidence and accountability without enterprise QA complexity

## Product principles

1. **Context before automation.** AI actions must always show their project, feature, test, run, and environment context.
2. **Verification before closure.** A code change does not close an issue; a passing rerun verifies it.
3. **Relationships before pages.** Every entity exposes its connected records and next actions.
4. **Human control by default.** Claude-generated records are labeled and reviewable.
5. **Calm over spectacle.** The interface reduces anxiety and helps the user decide what to do next.
6. **Progressive disclosure.** Simple at first glance, detailed when the user asks.
7. **Evidence over confidence theater.** Scores must be explainable and link to underlying records.

## Core journey

### 1. Enter and create a project

The user signs up, creates a workspace, and adds a project with its application URL, project description, environment, and repository/local-path context.

The first project screen is a guided setup path rather than an empty dashboard:

1. Project created
2. Connect Claude
3. Discover features
4. Review features
5. Generate test cases
6. Create first run
7. Review release readiness

### 2. Connect Claude through MCP

Veriqo creates a project-specific credential and shows a guided MCP setup with copyable commands/configuration, operating-system tabs, connection testing, connection state, and recent MCP activity.

Initial MCP capabilities:

- Read project QA context
- Create/update features
- Create/update test cases
- Create test runs and submit results
- Create/update issues
- Mark an issue ready for retest
- Request or update a rerun
- Read release blockers and coverage gaps

### 3. Discover product features

Veriqo prepares a context-aware prompt. The user copies it to Claude. Claude analyzes the codebase and saves structured features through MCP. Veriqo shows meaningful incoming activity rather than a generic spinner.

Generated features start as `Needs review`. The user can approve, edit, merge, archive, or regenerate them.

### 4. Generate test cases

The user chooses either:

- **Full product:** all approved features
- **Selected features:** a focused scope

Veriqo prepares a prompt containing scope, risks, existing coverage, environments, roles, and output requirements. Claude saves structured test cases through MCP. Generated cases begin in review, never silently in an approved state.

### 5. Create and execute a test run

A run records build/release, environment, device/browser, selected tests, and execution mode.

Execution modes:

- **Manual:** a focused step-by-step runner
- **Claude-assisted:** prompt-based assistance with incoming results and human-review flags

Result states are `Pass`, `Fail`, `Partial`, `Blocked`, and `Not run`.

### 6. Turn failure into a verified resolution

A failed result can create an issue while preserving feature, test, run, build, environment, expected behavior, actual behavior, and evidence.

Issue lifecycle:

`Open → Investigating → Fix in progress → Ready for retest → Verified`

If the rerun fails, the issue becomes `Reopened` and retains its full history.

### 7. Decide whether to release

The overview answers:

> Is this release ready, what is blocking it, and what is the best next action?

Release confidence is explainable and affected by:

- Feature risk
- Approved feature coverage
- Latest applicable results
- Critical/high-severity failures
- Blocked tests
- Changed features with stale tests
- Fixes awaiting verification
- Human review still required

## Information architecture

### Workspace level

- Projects
- Workspace activity (later)
- Members (later)
- Account settings

### Project level

- Overview
- Features
- Test Cases
- Test Runs
- Issues
- Activity
- Analytics
- Claude MCP
- Project Settings

## Domain relationships

| Entity | Must link to |
| --- | --- |
| Project | features, cases, runs, issues, environments, connection |
| Feature | source references, cases, coverage, results, issues, activity |
| Test case | parent feature, run history, latest result, issues, evidence |
| Test run | build, environment, selected cases, results, issues, reruns |
| Result | test case, run, environment, evidence, issue |
| Issue | feature, failed result, test case, fix activity, rerun, verification |
| Activity | actor, action, affected record, project, timestamp |

## Essential record states

### Feature

`Draft`, `Needs review`, `Approved`, `Changed`, `Archived`

### Test case

`Draft`, `In review`, `Ready`, `Needs update`, `Archived`

### Test run

`Planned`, `In progress`, `Paused`, `Completed`, `Needs attention`

### Result

`Not run`, `Pass`, `Fail`, `Partial`, `Blocked`

### Issue

`Open`, `Investigating`, `Fix in progress`, `Ready for retest`, `Verified`, `Reopened`

## MVP boundaries

The first production version supports Claude Code only. It does not need to promise fully autonomous browser testing.

MVP includes:

- Real authentication and project isolation
- Project onboarding
- Project-scoped MCP connection
- Feature generation/review
- Test-case generation/review
- Manual test runs
- Claude-assisted result submission
- Issue/fix/rerun lifecycle
- Activity timeline
- Actionable overview and basic analytics

Not in the initial MVP:

- Billing
- Enterprise roles and permissions
- CI/CD integrations
- Multiple AI agents
- Full browser automation platform
- Mobile application
- Public API marketplace
- Complex custom reports

## Demonstration dataset

Use a sample project named `LinkVault` with realistic features including Authentication, Link Management, Categories, Tags, Favorites, Search, Private Vault, Import/Export, PWA Installation, and Sessions.

The seed must include this complete story:

1. `Private Vault` is an approved high-risk feature.
2. `PV-07` checks whether the vault locks after session end.
3. `PV-07` fails in Chrome during `Release Candidate 1`.
4. `ISS-14` is created from that result.
5. Claude investigates and records a fix.
6. The issue becomes `Ready for retest`.
7. A focused rerun is created.
8. `PV-07` passes.
9. `ISS-14` becomes `Verified`.
10. Activity, coverage, and release confidence update.

## Success criteria

The product succeeds when a new user can connect Claude, create structured feature coverage, run tests, understand a failure, verify a fix, and confidently identify the next release blocker without needing instructions outside the interface.
