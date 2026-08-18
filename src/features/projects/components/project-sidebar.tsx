"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Tooltip } from "@/components/ui/tooltip";
import { productConfig } from "@/config/product.config";
import { projectNavigation, resolveProjectHref } from "@/config/navigation.config";
import { totalSetupSteps } from "@/config/setup-steps.config";
import { signOutAction } from "@/features/auth/actions";
import { ProjectSwitcher } from "@/features/projects/components/project-switcher";
import type { PublicUser } from "@/types/auth";
import type { Project } from "@/types/domain";

export type ProjectSidebarProps = {
  project: Project;
  projects: Project[];
  user: PublicUser;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
};

export function ProjectSidebar({
  project,
  projects,
  user,
  collapsed = false,
  onToggleCollapsed,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}: ProjectSidebarProps) {
  const pathname = usePathname();
  const isSetUp = project.setupStepsCompleted >= totalSetupSteps;

  return (
    <aside
      className={`flex h-full flex-col justify-between border-r border-subtle bg-surface transition-all duration-200 ${
        collapsed ? "w-[72px]" : "w-[248px]"
      }`}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-4 p-3">
        {/* Header / Brand */}
        <div className="flex items-center justify-between px-1.5 pt-1">
          <Link
            href="/projects"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-forest text-foreground-on-dark font-serif font-bold text-body-sm shadow-sm">
              {productConfig.shortName}
            </div>
            {!collapsed && (
              <span className="text-body font-semibold text-foreground tracking-tight">
                {productConfig.name}
              </span>
            )}
          </Link>

          {!isMobileDrawer && onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:bg-inset hover:text-foreground transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={16} />
            </button>
          )}

          {isMobileDrawer && onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:bg-inset hover:text-foreground transition-fast"
              aria-label="Close navigation"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Project Switcher */}
        <div className="px-0.5">
          <ProjectSwitcher
            currentProject={project}
            projects={projects}
            collapsed={collapsed}
          />
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-0.5" aria-label="Project navigation">
          {projectNavigation.map((item) => {
            const targetHref = resolveProjectHref(project.slug, item);
            const isOverview = item.href === "";
            const isActive = isOverview
              ? pathname === `/projects/${project.slug}`
              : pathname.startsWith(targetHref);

            if (collapsed) {
              return (
                <Tooltip key={item.key} content={item.label} side="right">
                  <Link
                    href={targetHref}
                    onClick={onCloseMobileDrawer}
                    className={`flex h-10 w-10 mx-auto items-center justify-center rounded-md transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                      isActive
                        ? "bg-forest text-foreground-on-dark shadow-sm"
                        : "text-foreground-secondary hover:bg-inset hover:text-foreground"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon name={item.icon} size={18} />
                  </Link>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.key}
                href={targetHref}
                onClick={onCloseMobileDrawer}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-body-sm font-medium transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  isActive
                    ? "bg-forest text-foreground-on-dark shadow-sm"
                    : "text-foreground-secondary hover:bg-inset hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  name={item.icon}
                  size={17}
                  className={isActive ? "text-foreground-on-dark" : "text-foreground-muted"}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Setup Completion & User Account */}
      <div className="flex flex-col gap-3 p-3 border-t border-subtle">
        {/* Setup Progress Indicator (if not fully completed or in compact form) */}
        {!isSetUp && !collapsed && (
          <Link
            href={`/projects/${project.slug}`}
            className="flex flex-col gap-1.5 rounded-md border border-subtle bg-inset/50 p-2.5 transition-fast hover:bg-inset"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider">
                Setup Progress
              </span>
              <span className="text-mono-sm text-[11px] text-foreground-muted font-semibold">
                {project.setupStepsCompleted}/{totalSetupSteps}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-pill bg-paper-2">
              <div
                className="h-full bg-action transition-all duration-300 rounded-pill"
                style={{
                  width: `${Math.round((project.setupStepsCompleted / totalSetupSteps) * 100)}%`,
                }}
              />
            </div>
          </Link>
        )}

        {/* User Account Menu */}
        <Menu>
          <MenuTrigger
            className={`flex items-center gap-2.5 rounded-md p-1.5 transition-fast hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
              collapsed ? "justify-center" : "justify-between"
            }`}
            aria-label={`Account menu for ${user.name}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={user.name} size="sm" />
              {!collapsed && (
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-body-sm font-medium text-foreground truncate">
                    {user.name}
                  </span>
                  <span className="text-mono-sm text-[11px] text-foreground-muted truncate">
                    {user.email}
                  </span>
                </div>
              )}
            </div>
            {!collapsed && (
              <Icon name="chevronDown" size={14} className="text-foreground-muted shrink-0" />
            )}
          </MenuTrigger>
          <MenuContent align={collapsed ? "end" : "start"} className="w-56">
            <MenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
              <span className="text-body-sm font-medium text-foreground">{user.name}</span>
              <span className="text-mono-sm text-foreground-muted text-[11px]">{user.email}</span>
            </MenuLabel>
            <MenuSeparator />
            <MenuItem className="p-0">
              <form action={signOutAction} className="w-full">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left cursor-pointer text-foreground-secondary hover:text-foreground"
                >
                  <Icon name="close" size={15} />
                  <span>Sign out</span>
                </button>
              </form>
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </aside>
  );
}
