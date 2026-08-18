"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { McpConnectionStatus } from "@/config/status.config";
import { ProjectSearchDialog } from "@/features/projects/components/project-search-dialog";
import { ProjectSidebar } from "@/features/projects/components/project-sidebar";
import { ProjectTopBar } from "@/features/projects/components/project-top-bar";
import type { PublicUser } from "@/types/auth";
import type { ActivityEvent, Project } from "@/types/domain";

export type ProjectShellProps = {
  project: Project;
  projects: Project[];
  user: PublicUser;
  mcpStatus: McpConnectionStatus;
  lastActivity?: ActivityEvent;
  children: ReactNode;
};

export function ProjectShell({
  project,
  projects,
  user,
  mcpStatus,
  lastActivity,
  children,
}: ProjectShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut for Cmd+K / Ctrl+K search palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-app">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block sticky top-0 h-screen shrink-0 z-30">
        <ProjectSidebar
          project={project}
          projects={projects}
          user={user}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DrawerContent
          title="Project Navigation"
          description="Main project navigation and actions"
          className="p-0 max-w-[280px] w-[280px]"
        >
          <div className="h-full">
            <ProjectSidebar
              project={project}
              projects={projects}
              user={user}
              collapsed={false}
              isMobileDrawer
              onCloseMobileDrawer={() => setMobileNavOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <ProjectTopBar
          project={project}
          mcpStatus={mcpStatus}
          lastActivity={lastActivity}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main id="main-content" className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-[1480px]">{children}</div>
        </main>
      </div>

      {/* Global / Project Search Dialog (Command Palette) */}
      <ProjectSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        project={project}
      />
    </div>
  );
}
