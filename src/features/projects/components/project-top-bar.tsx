"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { RefreshButton } from "@/components/shared/refresh-button";
import { Icon } from "@/components/ui/icon";
import { projectNavigation } from "@/config/navigation.config";
import type { McpConnectionStatus } from "@/config/status.config";
import { ConnectionBadge } from "@/features/projects/components/connection-badge";
import type { ActivityEvent, Project } from "@/types/domain";

export type ProjectTopBarProps = {
  project: Project;
  mcpStatus: McpConnectionStatus;
  lastActivity?: ActivityEvent;
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
};

export function ProjectTopBar({
  project,
  mcpStatus,
  lastActivity,
  onOpenSearch,
  onOpenMobileNav,
}: ProjectTopBarProps) {
  const pathname = usePathname();

  // Determine current active section for breadcrumbs
  const currentNav = projectNavigation.find((item) => {
    if (item.href === "") {
      return pathname === `/projects/${project.slug}`;
    }
    return pathname.startsWith(`/projects/${project.slug}${item.href}`);
  });

  const currentPageLabel = currentNav ? currentNav.label : "Overview";

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-subtle bg-surface/90 px-4 sm:px-6 backdrop-blur-sm">
      {/* Left: Mobile Nav Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-11 w-11 items-center justify-center rounded text-foreground-muted hover:bg-inset hover:text-foreground md:hidden"
          aria-label="Open navigation menu"
        >
          <Icon name="overview" size={18} />
        </button>

        {/* Breadcrumb Trail */}
        <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-body-sm min-w-0">
          <Link
            href="/projects"
            className="text-foreground-muted hover:text-foreground transition-fast shrink-0"
          >
            Projects
          </Link>
          <Icon name="chevronRight" size={13} className="text-foreground-muted shrink-0" />
          <Link
            href={`/projects/${project.slug}`}
            className="font-medium text-foreground-secondary hover:text-foreground transition-fast truncate"
          >
            {project.name}
          </Link>
          {currentNav && currentNav.href !== "" && (
            <>
              <Icon name="chevronRight" size={13} className="text-foreground-muted shrink-0" />
              <span className="font-medium text-foreground truncate">{currentPageLabel}</span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Search, Connection Badge & Activity */}
      <div className="flex items-center gap-3">
        {/* Search Trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-md border border-subtle bg-surface px-2.5 py-1 text-body-sm text-foreground-muted transition-fast hover:bg-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label="Search project (Command + K)"
        >
          <Icon name="search" size={14} className="shrink-0" />
          <span className="hidden sm:inline text-[13px]">Search...</span>
          <kbd className="hidden sm:inline-flex items-center rounded border border-subtle bg-inset px-1 py-0.2 text-[10px] text-foreground-muted font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Refresh Data Button */}
        <RefreshButton variant="icon" label="Refresh page data" size="sm" intent="ghost" />

        {/* Claude Connection Badge */}
        <div className="hidden sm:block">
          <ConnectionBadge status={mcpStatus} projectSlug={project.slug} />
        </div>

        {/* Last Activity indicator */}
        {lastActivity && (
          <div className="hidden lg:flex items-center gap-1.5 text-mono-sm text-foreground-muted text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground-muted/40" />
            <span className="truncate max-w-[180px]">
              {lastActivity.actorName}: {lastActivity.action}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
