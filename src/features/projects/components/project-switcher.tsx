"use client";

import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import type { Project } from "@/types/domain";

export type ProjectSwitcherProps = {
  currentProject: Project;
  projects: Project[];
  collapsed?: boolean;
};

export function ProjectSwitcher({
  currentProject,
  projects,
  collapsed = false,
}: ProjectSwitcherProps) {
  const router = useRouter();

  if (collapsed) {
    return (
      <Menu>
        <MenuTrigger
          className="flex h-10 w-10 items-center justify-center rounded-md border border-subtle bg-surface text-foreground font-medium transition-fast hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label={`Switch project from ${currentProject.name}`}
        >
          <span className="text-mono-sm font-semibold">{currentProject.publicId.slice(0, 2)}</span>
        </MenuTrigger>
        <MenuContent align="start" className="w-64">
          <MenuLabel className="px-2.5 py-1.5 text-eyebrow text-foreground-muted uppercase tracking-wider">
            Switch project
          </MenuLabel>
          {projects.map((proj) => {
            const isCurrent = proj.id === currentProject.id;
            return (
              <MenuItem
                key={proj.id}
                onClick={() => router.push(`/projects/${proj.slug}`)}
                className="flex items-center justify-between gap-2 px-2.5 py-2 cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-body-sm font-medium text-foreground truncate">
                    {proj.name}
                  </span>
                  <span className="text-mono-sm text-foreground-muted">{proj.publicId}</span>
                </div>
                {isCurrent && <Icon name="check" size={14} className="text-action shrink-0" />}
              </MenuItem>
            );
          })}
          <MenuSeparator />
          <MenuItem
            onClick={() => router.push("/projects")}
            className="flex items-center gap-2 px-2.5 py-2 text-foreground-secondary cursor-pointer"
          >
            <Icon name="projects" size={14} />
            <span className="text-body-sm">All projects</span>
          </MenuItem>
          <MenuItem
            onClick={() => router.push("/projects/new")}
            className="flex items-center gap-2 px-2.5 py-2 text-foreground-secondary cursor-pointer"
          >
            <Icon name="plus" size={14} />
            <span className="text-body-sm">New project</span>
          </MenuItem>
        </MenuContent>
      </Menu>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        className="group flex w-full items-center justify-between gap-2 rounded-md border border-subtle bg-surface px-3 py-2 text-left transition-fast hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        aria-label={`Current project: ${currentProject.name}. Click to switch project.`}
      >
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-body-sm font-medium text-foreground truncate">
              {currentProject.name}
            </span>
            <span className="text-mono-sm text-foreground-muted shrink-0">
              {currentProject.publicId}
            </span>
          </div>
          <span className="text-mono-sm text-foreground-muted capitalize">
            {currentProject.environment}
          </span>
        </div>
        <Icon
          name="chevronDown"
          size={14}
          className="text-foreground-muted shrink-0 transition-fast group-hover:text-foreground"
        />
      </MenuTrigger>
      <MenuContent align="start" className="w-64">
        <MenuLabel className="px-2.5 py-1.5 text-eyebrow text-foreground-muted uppercase tracking-wider">
          Projects ({projects.length})
        </MenuLabel>
        {projects.map((proj) => {
          const isCurrent = proj.id === currentProject.id;
          return (
            <MenuItem
              key={proj.id}
              onClick={() => router.push(`/projects/${proj.slug}`)}
              className={`flex items-center justify-between gap-2 px-2.5 py-2 cursor-pointer ${
                isCurrent ? "bg-inset/50 font-medium" : ""
              }`}
            >
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-body-sm text-foreground truncate">{proj.name}</span>
                  <span className="text-mono-sm text-foreground-muted">{proj.publicId}</span>
                </div>
                <span className="text-mono-sm text-foreground-muted text-[11px] capitalize">
                  {proj.environment}
                </span>
              </div>
              {isCurrent && <Icon name="check" size={14} className="text-action shrink-0" />}
            </MenuItem>
          );
        })}
        <MenuSeparator />
        <MenuItem
          onClick={() => router.push("/projects")}
          className="flex items-center gap-2 px-2.5 py-2 text-foreground-secondary cursor-pointer"
        >
          <Icon name="projects" size={14} />
          <span className="text-body-sm">All projects</span>
        </MenuItem>
        <MenuItem
          onClick={() => router.push("/projects/new")}
          className="flex items-center gap-2 px-2.5 py-2 text-foreground-secondary cursor-pointer"
        >
          <Icon name="plus" size={14} />
          <span className="text-body-sm">New project</span>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
