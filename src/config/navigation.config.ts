import type { IconName } from "@/components/ui/icon";

export type NavigationItem = {
  key: string;
  label: string;
  /** Path segment appended to the active project's base URL. Empty string is the project overview. */
  href: string;
  icon: IconName;
};

/**
 * Project-level navigation, per 04-CONFIG-BLUEPRINT.md and the information
 * architecture in 00-PRODUCT.md. The project shell (Phase 2) renders this
 * list directly rather than hard-coding links; resolve project-relative
 * URLs through `resolveProjectHref` instead of concatenating strings.
 */
export const projectNavigation: readonly NavigationItem[] = [
  { key: "overview", label: "Overview", href: "", icon: "overview" },
  { key: "features", label: "Features", href: "/features", icon: "features" },
  {
    key: "testCases",
    label: "Test Cases",
    href: "/test-cases",
    icon: "testCases",
  },
  {
    key: "testRuns",
    label: "Test Runs",
    href: "/test-runs",
    icon: "testRuns",
  },
  { key: "issues", label: "Issues", href: "/issues", icon: "issues" },
  { key: "activity", label: "Activity", href: "/activity", icon: "activity" },
  {
    key: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: "analytics",
  },
  { key: "mcp", label: "Claude MCP", href: "/mcp", icon: "mcp" },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings" },
] as const;

/**
 * Workspace-level navigation (outside any single project).
 */
export const workspaceNavigation: readonly NavigationItem[] = [
  { key: "projects", label: "Projects", href: "/projects", icon: "projects" },
  { key: "account", label: "Account", href: "/account", icon: "settings" },
] as const;

/**
 * Resolves a project-relative href. Centralized so route composition
 * changes (e.g. the `/projects/[projectId]` segment shape) happen in one
 * place instead of at every call site.
 */
export function resolveProjectHref(projectId: string, item: NavigationItem) {
  return `/projects/${projectId}${item.href}`;
}
