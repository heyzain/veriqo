# Veriqo — Experience and Design System

## Design intent

Veriqo should feel like a calm, crafted working environment—not a purchased SaaS dashboard template.

The attached reference influences the emotional direction only: warm paper, deep editorial color, confident typography, quiet geometry, and deliberate spacing. Do not reproduce its exact composition. The product workspace needs more operational density and stronger entity relationships than the reference screen.

The desired emotional sequence is:

`Arrive calmly → understand context → see the next action → focus on one task → receive clear feedback → retain trust`

## Experience principles

### Calm is not emptiness

Use breathing room around page-level groups, not inside every table row or card. The interface should feel relaxed while still fitting meaningful QA information on screen.

### The UI explains relationships

Do not rely only on sidebar navigation. Use linked IDs, breadcrumbs, relationship strips, timelines, coverage indicators, and contextual actions to reveal the chain between features, tests, results, issues, and reruns.

### AI is a participant, not the visual theme

Claude activity uses a subtle dedicated treatment. Do not use glowing gradients, sparkles everywhere, animated orbs, or a permanent chat panel. AI-generated content is labeled by source and review state.

### One dominant action per view

Each page has one visually dominant next action. Secondary actions remain accessible without competing.

### Evidence feels durable

IDs, timestamps, environments, builds, actors, and status history should feel like reliable records. Prefer precise typography and quiet dividers over decorative containers.

## Working visual concept: “Quiet Ledger”

The system combines:

- Warm editorial surfaces
- Deep forest navigation
- Muted mineral colors
- Soft but intentional radii
- Sans-serif operational text
- Serif display moments used sparingly
- Fine rules and inset surfaces rather than card grids
- Subtle, slow motion for state changes

## Theme tokens

All values must be CSS variables and mapped through semantic tokens. Components must never contain raw hex colors.

### Light theme primitives

```css
:root {
  --paper-0: #fbfaf6;
  --paper-1: #f5f2ea;
  --paper-2: #ebe6da;
  --ink-0: #13251f;
  --ink-1: #294139;
  --ink-2: #667a72;
  --forest-0: #0f3026;
  --forest-1: #17483a;
  --moss: #2f7a60;
  --marigold: #d8a83e;
  --clay: #b95f4f;
  --sky: #4f7893;
  --violet: #766a91;
  --white: #ffffff;
  --black: #0b1511;
}
```

### Semantic tokens

```css
:root {
  --bg-app: var(--paper-1);
  --bg-surface: var(--paper-0);
  --bg-raised: var(--white);
  --bg-inset: #efebe2;
  --bg-sidebar: var(--forest-0);
  --text-primary: var(--ink-0);
  --text-secondary: var(--ink-1);
  --text-muted: var(--ink-2);
  --text-on-dark: #f7f4eb;
  --border-subtle: rgba(19, 37, 31, 0.11);
  --border-strong: rgba(19, 37, 31, 0.22);
  --action-primary: var(--moss);
  --action-primary-hover: #286b54;
  --focus-ring: rgba(47, 122, 96, 0.28);
  --status-pass: #3f7d5b;
  --status-fail: #b55248;
  --status-partial: #b8872c;
  --status-blocked: #687078;
  --status-progress: #4f7893;
  --status-ai: #766a91;
}
```

Dark mode is not required in Phase 1. When added, define semantic-token overrides rather than editing components.

## Typography

Use locally served or properly optimized web fonts.

- **UI/body:** `Manrope` or `Inter`, fallback `system-ui`
- **Display/editorial:** `Newsreader`, fallback `Georgia`
- **Technical/IDs:** `IBM Plex Mono`, fallback `ui-monospace`

Rules:

- Serif is reserved for auth/onboarding statements, project welcome, release narrative, and occasional major page titles.
- Operational pages primarily use sans-serif.
- IDs, commands, keys, versions, environments, and timestamps use mono selectively.
- Never use more than two font families in one compact component.

Type scale:

| Token | Size / line-height | Use |
| --- | --- | --- |
| display-lg | 52/54 | auth/onboarding statement only |
| display-md | 38/42 | project entry or major empty state |
| title-xl | 30/36 | project overview title |
| title-lg | 24/30 | page title |
| title-md | 18/24 | section title |
| body-lg | 16/26 | guidance and onboarding copy |
| body | 14/22 | default application copy |
| body-sm | 13/19 | metadata and supporting text |
| label | 12/16, 600 | controls and column headers |
| eyebrow | 11/16, tracked | rare section marker |
| mono-sm | 12/18 | IDs, commands and technical values |

## Spacing and geometry

Use an 8px base grid with 4px only for small optical adjustments.

Spacing tokens: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`.

Page rules:

- Desktop content max width: `1480px`
- Operational page horizontal padding: `32px–40px`
- Auth/onboarding horizontal padding: `48px–72px`
- Section gap: `32px`
- Related controls gap: `8px–12px`
- Table row height: `52px–60px`
- Main sidebar: `248px`, collapsible to `72px`
- Optional contextual drawer: `400px–480px`

Radius tokens:

```css
--radius-xs: 6px;
--radius-sm: 10px;
--radius-md: 14px;
--radius-lg: 20px;
--radius-xl: 28px;
--radius-pill: 999px;
```

Use radii intentionally:

- Inputs/buttons: `10px`
- Menus/toasts: `12px–14px`
- Main panels: `14px–20px`
- Auth visual panels and major onboarding container: up to `28px`
- Status badges: pill
- Do not make every nested element rounded.

## Borders, elevation, and surfaces

- Prefer one-pixel translucent borders and tonal surface changes.
- Avoid boxing every section.
- A large parent panel can contain unboxed rows separated by rules.
- Use shadows only for floating menus, drawers, modals, and one primary raised surface.
- Avoid stacked shadows and glossy effects.

Shadow tokens:

```css
--shadow-sm: 0 1px 2px rgba(13, 30, 24, 0.06);
--shadow-md: 0 12px 32px rgba(13, 30, 24, 0.10);
--shadow-lg: 0 24px 64px rgba(13, 30, 24, 0.14);
```

## Application layout

### Auth layout

Desktop uses a 42/58 split:

- Left: deep forest brand/story panel with restrained geometry and one memorable sentence
- Right: warm paper form area

The form remains compact (`420–460px`) and vertically balanced. Include sign in, sign up, forgot password, reset password, email verification, and invite acceptance.

Mobile removes the full story panel and retains a small brand statement above the form.

### Workspace/project index

Use a composed project library rather than a generic dashboard:

- A narrow contextual introduction area can echo the reference
- Project cards behave like records, showing project health and next action
- Recent projects and archived projects are separated without visual clutter
- “Create project” launches a focused multi-step modal/page

### Project shell

The working app uses:

- Persistent left navigation
- Slim top context bar
- Main content canvas
- Optional right drawer opened only for detail/inspection

Sidebar contains logo, project switcher, main navigation, setup completion, and account control. Do not permanently display promotional copy inside the operational shell.

Top bar contains breadcrumbs, global/project search, Claude connection state, recent activity, and the contextual primary action.

### Page anatomy

Every operational page follows:

1. Breadcrumb/context line
2. Title, short supporting sentence, primary action
3. Optional state/insight strip
4. Filters or local navigation
5. Primary working surface
6. Related records or activity only where useful

## Component language

Build reusable product-specific components, not only generic cards.

### Core primitives

- Button
- IconButton
- Input, Textarea, Select, Combobox
- Checkbox, Radio, Switch
- Tooltip, Popover, Menu
- Dialog, AlertDialog, Drawer
- Tabs, SegmentedControl
- Toast
- Badge
- Avatar/ActorMark
- Skeleton
- EmptyState

### Product components

- `ProjectRecordCard`
- `ProjectHealthStrip`
- `SetupPath`
- `SetupStep`
- `ConnectionBadge`
- `McpCommandBlock`
- `PromptComposer`
- `PromptCopyAction`
- `AgentActivityStream`
- `EntityLink`
- `RelationshipTrail`
- `SourceBadge` (`Claude`, `Manual`, `Imported`)
- `ReviewState`
- `CoverageBar`
- `RiskMark`
- `StatusDot`
- `FeatureRecord`
- `TestCaseRecord`
- `ResultControl`
- `ExecutionStepper`
- `IssueLifecycle`
- `RerunComparison`
- `ReleaseConfidence`
- `NextActionPanel`
- `EvidenceGallery`
- `RecordTimeline`
- `DataTableShell`
- `FilterBar`
- `SavedViewMenu`

## Status design

Never communicate status through color alone. Every state requires a label and, when useful, an icon or pattern.

- Pass/Verified: muted green, check icon
- Fail/Critical: clay red, cross or alert icon
- Partial/Needs attention: marigold, half-circle or warning icon
- Blocked: neutral gray, block icon
- In progress: mineral blue, progress icon
- Claude-generated/activity: muted violet, small agent glyph
- Draft/Not run: neutral paper/ink treatment

Badges are quiet and compact. Critical failures may use a stronger tinted row/background, but never a fully saturated red wall.

## Motion

Motion should reassure, not entertain.

- Hover/focus: `120–160ms`
- Drawer/modal: `180–220ms`
- State transition/progress: `220–320ms`
- Activity insertion: subtle fade and 6px slide
- Respect `prefers-reduced-motion`
- No looping decorative animations in the working app

## Content voice

Tone: calm, direct, precise, supportive.

Prefer:

- “Claude is saving 8 test cases…”
- “Two high-risk features still need coverage.”
- “The fix is ready. Rerun 3 affected tests to verify it.”
- “Connection verified 2 minutes ago.”

Avoid:

- “Magic is happening!”
- “Supercharge your testing!”
- “Oopsie!”
- “AI-powered” repeated in every heading
- Blaming users for configuration errors

## Critical screen specifications

### Overview

Lead with a release narrative, not four equal statistic cards. Show release confidence with explanation, blockers, coverage gaps, current run, and one next action. Metrics must deep-link to filtered records.

### Features

Use a refined records table/list. Each row shows risk, review state, coverage, tests, issues, and change status. Clicking opens a full detail page or stable drawer with relationships.

### Test cases

Support feature grouping. Preserve the visual chain from test ID to parent feature, latest result, and related issue. Bulk actions appear only after selection.

### Test runner

This is the most focused screen: compact run context, current case, steps, expected result, evidence, and large but restrained result controls. No analytics widgets.

### Issues

Issue detail visually centers the lifecycle and evidence. Display original failure and rerun comparison in the same view. “Verified” requires a passed rerun.

### MCP setup

Use a guided setup with platform tabs, readable command blocks, copy confirmation, connection test, and activity. Never expose a key without masking by default.

### Activity

Use a readable chronological ledger. Entries contain actor, action, entity links, context, and time. Filters stay compact.

## Responsive behavior

- Desktop first: `1280px+`
- Tablet: sidebar collapses; tables keep essential columns and expose the rest in row details
- Mobile: operational records become stacked rows, not horizontally crushed tables
- Test execution on mobile remains usable but is not the initial optimization target
- Never hide the primary action or current project context

## Accessibility rules

- WCAG AA contrast minimum
- Visible keyboard focus using semantic focus token
- Complete keyboard access for tables, menus, dialogs, and runner controls
- 44px minimum touch target on touch layouts
- Labels for every form control
- Live-region feedback for copy, save, and incoming MCP activity
- Error messages describe the problem and recovery action
- Icons never carry meaning without accessible names or adjacent text

## Anti-template checklist

Reject the implementation if it contains:

- A top row of four identical KPI cards as the main dashboard
- Large empty cards with a single number
- Gradient AI hero inside the app
- Permanent chatbot on every page
- Excessive glassmorphism
- 24px radius on every element
- Heavy borders around every section
- Huge page titles consuming working space
- Random icon styles
- Unexplained charts
- Disconnected detail pages
- Generic lorem ipsum or fake company metrics
- Visual copying of Linear, Jira, or TestRail

## Visual acceptance criteria

Before a screen is considered complete:

- The primary action is obvious within three seconds.
- The user can identify the current project and workflow stage.
- Status is understandable without relying on color.
- Connected records are visible and clickable.
- Empty/loading/error/success states are designed.
- The screen has one clear visual hierarchy.
- Components use tokens rather than one-off CSS values.
- Density feels useful at 1366×768 and comfortable at 1440×900.
- The screen looks like Veriqo, not a UI kit demo.
