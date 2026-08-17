# Veriqo — Claude Implementation Rules

These rules govern every build phase. Read `00-PRODUCT.md`, `01-DESIGN-SYSTEM.md`, and `02-BUILD-PHASES.md` before changing code.

## Working protocol

1. Restate the current phase objective and acceptance criteria.
2. Inspect existing code and reuse established patterns.
3. Propose the smallest coherent implementation plan.
4. Implement only the current phase.
5. Run validation.
6. Report changed files, key decisions, known limitations, and screenshots/routes to review.
7. Stop for approval before the next phase.

Do not silently reinterpret the product into a generic issue tracker or test management dashboard.

## Product invariants

- Preserve `Project → Feature → Test case → Run → Result → Issue → Fix → Rerun → Verification`.
- Every domain detail view exposes its related records.
- A fix does not verify an issue; only an applicable passed rerun can.
- Claude-generated records are labeled and reviewable.
- Project-scoped actions must verify project ownership server-side.
- Release confidence must be explainable.
- Every important action creates an activity event.

## Configuration-first rule

Do not scatter replaceable product decisions through components.

Centralize:

- Product name, short name, description, URLs, support email
- Logos and favicon paths
- Navigation
- Feature flags
- Enabled AI agent (`claude` initially)
- Status labels and semantic appearances
- Upload constraints
- Prompt version identifiers
- Release-confidence weights
- External links

Use typed configuration. Validate environment variables at startup. Never expose server-only secrets in client bundles.

## Component architecture

Use four layers:

1. `ui/` — accessible primitives with no domain knowledge
2. `shared/` — reusable application patterns such as page header and data table
3. `features/<domain>/` — feature-specific components, hooks, schemas, and actions
4. `app/` — route composition and server boundaries

Prefer composition over giant option-heavy components.

Rules:

- A route should compose components, not contain hundreds of lines of UI.
- Keep data access out of presentational primitives.
- Do not create a new component for a one-line wrapper with no semantic value.
- Do create a component when a pattern repeats, owns behavior, or expresses a product concept.
- Use variants for meaningful states, not arbitrary visual customization.
- Wrap third-party primitives so product behavior and styling remain controlled locally.
- Wrap the icon library; do not import icons randomly throughout the app.

## Styling rules

- Use semantic tokens from the design system.
- No raw colors inside components.
- No arbitrary one-off radii when a token exists.
- No hard-coded shadows.
- No inline CSS except truly dynamic calculated values.
- Responsive behavior is part of the component, not a later patch.
- Build light mode first; prepare semantic token overrides for dark mode.
- Avoid excessive `Card` usage. Use sections, rows, inset surfaces, and rules.
- Do not use gradients unless a later approved brand update explicitly introduces them.

## UI state contract

Every data-dependent view must deliberately handle:

- Initial loading
- Background refreshing
- Empty state
- Populated state
- Partial/missing data
- Permission denied
- Recoverable error
- Unrecoverable error
- Success feedback
- Optimistic update rollback when used

Skeletons should resemble the final layout. Never show a full-page spinner for ordinary route data.

## Forms

- Shared Zod schema where client/server validation align
- Visible labels; placeholders are examples, not labels
- Inline error near the relevant field
- Preserve user input after recoverable failure
- Disable submission only while submitting or when invalid for a clear reason
- Prevent accidental duplicate submissions
- Destructive actions require precise confirmation
- Secret values are masked by default

## Tables and record lists

- URL-driven filters, sorting, pagination, and selected saved view where practical
- Stable row IDs
- Meaningful empty-filter results with clear reset action
- Bulk toolbar appears only after selection
- Primary identifier and relationship links remain visible
- Mobile transforms into record rows/details rather than crushed columns
- Do not make the entire row inaccessible as one giant click target

## Data and server boundaries

- Validate all external input
- Authorize every mutation on the server
- Never trust project/workspace IDs from the client
- Use transactions for state changes that must remain consistent
- Use idempotency keys for MCP writes and retried mutations
- Record actor/source for human, Claude, system, and import actions
- Prefer explicit state-transition services over direct status-field edits
- Store timestamps in UTC and render in user locale
- Soft-delete/archive domain records where history matters
- Preserve immutable execution/evidence history

## MCP rules

- Project-specific, revocable credentials
- Least-privilege tools
- Typed tool inputs and outputs
- Idempotent create/update behavior
- Useful, non-secret error responses
- Audit every MCP mutation
- Do not expose database IDs when stable public IDs are appropriate
- Version prompts and record which prompt version produced data
- Never claim execution evidence that was not actually received

## Authentication and security

- Use secure, HTTP-only session cookies where applicable
- Apply CSRF protections appropriate to the auth architecture
- Hash credentials/tokens at rest
- Rate-limit authentication, key management, and MCP endpoints
- Verify tenant/project ownership for reads and writes
- Sanitize user-rendered rich text/markdown
- Validate evidence file type, size, and access
- Never log secrets or complete API keys
- Keep audit history for sensitive changes

## Accessibility

- Semantic elements before ARIA
- Full keyboard navigation
- Visible focus
- Dialog focus trap and return focus
- Status not communicated by color alone
- Accessible names for icons and icon-only controls
- Announce async save/copy/incoming-activity outcomes
- Respect reduced motion
- Maintain WCAG AA contrast

## Performance

- Prefer server rendering for initial record pages where appropriate
- Keep client components scoped to actual interactivity
- Lazy-load heavy editors/charts/drawers
- Avoid fetching the same entity separately in many child components
- Paginate large record sets
- Optimize images/evidence thumbnails
- Set explicit performance budgets before launch

## Testing expectations

For each feature:

- Unit tests for business rules and state transitions
- Component tests for meaningful interactive states
- Integration tests for server mutations and authorization
- Playwright for critical user journeys

Mandatory business-rule tests:

- Cross-project access is rejected
- Generated features/tests require review
- Issue verification requires a passed rerun
- Failed rerun reopens or keeps issue unresolved
- MCP retries are idempotent
- Release confidence responds to blockers and verification

## Copy rules

- Calm, direct, precise language
- Tell the user what happened and what to do next
- Avoid hype, blame, jokes in errors, and repetitive “AI-powered” language
- Use consistent domain terminology from `00-PRODUCT.md`
- Put reusable UI copy in typed domain/config modules when appropriate

## Prohibited shortcuts

- No lorem ipsum in core flows
- No fake actions that look functional without being labeled as prototype behavior
- No random dashboard metrics
- No silent auto-approval of Claude output
- No issue closure on “fix completed”
- No untyped `any` to bypass design problems
- No duplicated status maps in multiple files
- No giant all-purpose dashboard component
- No premature billing, teams, or multi-agent support
- No deployment without explicit approval

## Definition of done for a screen

- Meets the current phase acceptance criteria
- Matches the design tokens and layout rules
- Has responsive behavior
- Has loading, empty, error, and populated states
- Is keyboard accessible
- Uses realistic LinkVault seed data where relevant
- Exposes connected records and next action
- Has no console errors
- Passes lint, type-check, relevant tests, and production build
