# Veriqo — Claude Build Phases

## How to use this plan

Build one phase at a time. At the end of every phase:

1. Run lint, type-check, tests, and production build.
2. Test the changed flow at desktop and mobile widths.
3. Capture screenshots of all new pages and important states.
4. Compare them against `01-DESIGN-SYSTEM.md`.
5. Stop and request review before continuing to the next phase.

Do not build later phases early. Do not replace incomplete UX with placeholder cards.

## Recommended foundation

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS using CSS-variable design tokens
- Accessible headless primitives (Radix UI or equivalent)
- Lucide icons behind a local icon wrapper
- React Hook Form + Zod
- TanStack Table for record-heavy views
- TanStack Query only where server state benefits from it
- MongoDB + Mongoose
- Auth.js or a similarly mature authentication solution
- Vitest + Testing Library
- Playwright for critical flows

The exact backend can change, but UI/domain contracts must remain stable.

---

## Phase 0 — Architecture and design foundation

### Goal

Create a disciplined product foundation before feature development.

### Build

- Project structure and route groups
- Strict TypeScript, linting, formatting, environment validation
- `product.config.ts` and navigation config
- Semantic CSS tokens for color, typography, spacing, radii, elevation, motion
- Font setup
- Core primitives and Storybook/component-lab route
- Light theme only, prepared for semantic dark-theme overrides
- App-level error, loading, not-found, and toast handling
- Mock data factories and deterministic seed data
- Accessibility baseline

### Required routes

- `/component-lab`
- `/design-tokens`

### Acceptance

- No raw hex colors inside components
- No hard-coded product name outside config/metadata boundaries
- Primitives support keyboard/focus/error/disabled/loading states
- Component lab displays every primitive and status
- Production build passes

### Stop point

Present the component lab and token page for visual approval.

---

## Phase 1 — Auth and workspace entry

### Goal

Create a memorable, calm first experience using the editorial split-layout direction.

### Build

- Sign in
- Sign up
- Forgot/reset password
- Email verification state
- Invite acceptance state
- Auth validation and error states
- Workspace/project index
- Project search and archived-project view
- Create-project flow
- Empty, one-project, and many-project states

### UX requirements

- Auth uses the brand/story panel on desktop
- Product workspace index feels like a library of QA records, not a dashboard
- Project cards show health, setup state, recent activity, and next action
- Project creation is focused and progressive

### Acceptance

- All auth pages are consistent and responsive
- User reaches project setup after creation
- No generic KPI cards
- Keyboard and form-error flows work

### Stop point

Present auth, project index, project creation, and first-project states.

---

## Phase 2 — Project shell and guided setup

### Goal

Establish navigation and prevent the user from entering an empty, confusing dashboard.

### Build

- Project-scoped shell
- Sidebar and collapsed sidebar
- Project switcher
- Top context bar and breadcrumbs
- Global/project search shell
- Setup path with persistent completion
- Project overview in incomplete and populated states
- Settings shell
- Responsive navigation

### Setup steps

1. Project created
2. Connect Claude
3. Discover features
4. Review features
5. Generate tests
6. Run tests
7. Review readiness

### Acceptance

- Every setup step links to a real destination
- Current project is always visible
- Browser back/forward preserves context
- No dead-end page
- Overview gives one recommended next action

### Stop point

Walk through a newly created project from entry to the MCP step.

---

## Phase 3 — Claude MCP connection

### Goal

Make a technical integration feel safe, understandable, and verifiable.

### Build

- Project-scoped API key creation, masking, copy, regenerate, revoke
- OS/platform setup tabs
- MCP command and configuration blocks
- Environment-variable instructions
- Connection test endpoint and UI
- Connected/disconnected/error states
- Last-seen and recent MCP activity
- MCP authorization boundaries and audit events
- Initial MCP tools for project context and health check

### Security requirements

- Never log or return full secrets after initial issuance
- Store only hashed credentials where applicable
- Project-scope every MCP operation
- Rate-limit sensitive endpoints
- Audit key creation/revocation and connection attempts

### Acceptance

- A user can complete setup without external explanation
- Copy actions have accessible confirmation
- Incorrect configuration gives a recovery path
- Connected state guides user to feature discovery

### Stop point

Demonstrate connection success, failure, revocation, and reconnection.

---

## Phase 4 — Feature discovery and review

### Goal

Turn Claude's codebase analysis into a structured, reviewable feature inventory.

### Build

- Feature schema and persistence
- MCP tools to create/update/list features
- Context-aware feature-generation prompt
- Prompt composer and copy action
- Waiting/incoming/completed generation states
- Agent activity stream
- Feature records table with filters, grouping, search, and bulk actions
- Feature detail with acceptance criteria, roles, dependencies, source references, coverage, issues, and activity
- Approve, edit, merge, archive, regenerate
- Diff/review treatment for Claude updates

### Acceptance

- Generated features default to `Needs review`
- Duplicate/conflicting features are surfaced
- User can trace a feature to source references and MCP activity
- Feature detail links to tests and issues
- LinkVault seed data is realistic

### Stop point

Demonstrate prompt copy → incoming activity → review → approval.

---

## Phase 5 — Test-case generation and management

### Goal

Create useful test coverage at full-product or selected-feature scope.

### Build

- Test-case domain model and MCP tools
- Full-product generation flow
- Selected-feature generation flow
- Prompt composition based on scope, risk, existing coverage, roles, and environments
- Incoming generation activity
- Duplicate/conflict detection
- Test-case records with feature grouping
- Review, edit, approve, duplicate, archive
- Bulk add to run
- Coverage calculation and feature coverage visualization
- `Needs update` behavior for changed features

### Acceptance

- Generated tests are never auto-approved
- Each test has a parent feature, steps, expected result, priority, and role/environment context
- Full-product and selected-feature flows are distinct and understandable
- Coverage updates consistently across overview and feature details

### Stop point

Demonstrate both generation modes and the review workflow.

---

## Phase 6 — Manual test runs

### Goal

Provide a focused, satisfying execution experience for real manual QA work.

### Build

- Create-run flow
- Build/release, environment, browser/device, selection, assignee
- Run list and run detail
- Focused manual runner
- Pass, Fail, Partial, Blocked controls
- Actual-result notes
- Evidence upload and preview
- Save/continue, previous/next, pause/resume
- Run progress and result aggregation
- Autosave/draft protection where practical

### Acceptance

- Runner has no distracting analytics
- Failed/partial/blocked results request appropriate context
- Refreshing does not lose recorded progress
- Run detail connects results to cases/features
- Evidence has accessible labels and safe file constraints

### Stop point

Complete a seeded run manually and review its resulting summary.

---

## Phase 7 — Issues, fixes, and reruns

### Goal

Complete the most important trust loop: failure to verified resolution.

### Build

- Create issue from failed result
- Issue records and filtered views
- Issue detail with feature/test/run/environment/evidence relationships
- Investigation/fix prompt composer
- MCP issue status and fix-note tools
- Lifecycle timeline
- `Ready for retest` action
- Focused rerun creation from affected tests
- Original-versus-rerun comparison
- Verify on pass; reopen on failure
- Cross-screen state updates and activity events

### Hard business rule

An issue cannot become `Verified` without an applicable passed rerun result.

### Acceptance

- Complete `PV-07 → ISS-14 → fix → rerun → verified` seed flow works
- Failed rerun reopens the issue
- Original evidence/history is preserved
- Related feature, case, run, and overview all update

### Stop point

Demonstrate the full lifecycle in one uninterrupted walkthrough.

---

## Phase 8 — Claude-assisted execution

### Goal

Allow Claude to submit structured execution results without removing human oversight.

### Build

- Claude-assisted run mode
- Context-aware execution prompt
- MCP tools for starting/updating/completing runs and submitting results
- Incoming per-test activity
- Source labels and human-review flags
- Conflict/idempotency handling
- Completion summary
- Human approval/rejection/correction of uncertain results

### Acceptance

- Every submitted result has run, case, environment, actor/source, and timestamp
- Duplicate submissions do not corrupt progress
- Human review is clearly distinct from AI submission
- Claude is integrated into the run, not shown as a generic chatbot

### Stop point

Demonstrate a mixed AI/human run with at least one review-required result.

---

## Phase 9 — Overview, activity, and analytics

### Goal

Turn connected QA records into an actionable release decision.

### Build

- Explainable release-confidence calculation
- Blockers and next-action engine
- Coverage gaps and high-risk untested features
- Latest run and reruns awaiting action
- Critical/open issues
- Chronological activity ledger with filters and deep links
- Pass-rate trend
- Failure by module
- Severity distribution
- Fix-to-verification time
- Reopened issue rate
- Human versus Claude-assisted breakdown
- Analytics drill-downs

### Acceptance

- No vanity metric appears without an action or drill-down
- Confidence explanation lists contributing factors
- Filtered navigation lands on the expected records
- Overview updates after the seeded rerun verification

### Stop point

Compare overview before and after verifying `ISS-14`.

---

## Phase 10 — Production hardening and launch readiness

### Goal

Make the MVP reliable, secure, accessible, observable, and deployable.

### Build

- Authorization audit and tenant isolation tests
- Input/file validation and rate limiting
- Error boundaries and recovery states
- Background-job/retry strategy for incoming MCP work
- Idempotency and optimistic-concurrency handling
- Database indexes and query review
- Structured logs and error monitoring
- Accessibility audit
- Performance budgets and bundle review
- Full responsive QA
- Seed/demo reset
- Critical Playwright suite
- Backup/migration/deployment documentation
- Privacy, terms, and minimal account deletion/export flows

### Critical end-to-end tests

- Signup → create project
- Configure MCP → verify connection
- Generate/review/approve features
- Generate/review/approve tests
- Create and execute manual run
- Failure → issue → fix → rerun → verification
- Claude-assisted result with human review
- Overview/analytics reflect changes

### Acceptance

- No critical accessibility violations
- No unauthorized cross-project access
- All critical Playwright flows pass
- Production build and migration succeed
- Empty/loading/error/success states exist for every core screen
- Product meets the anti-template checklist

### Stop point

Produce a launch-readiness report rather than automatically deploying.

---

## Later phases, not MVP commitments

- Team roles and review assignments
- CI/CD and Git provider integrations
- Browser automation adapters
- Multiple AI assistants
- Scheduled regression runs
- Release comparison reports
- Custom fields and workflows
- Public API/webhooks
- Billing and plans
- Organization-wide analytics
