import type { ReactNode } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { productConfig } from "@/config/product.config";
import { signOutAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/server/services/auth-service";

/**
 * Workspace-level chrome — a slim top bar only. This is deliberately not
 * the project-scoped shell (sidebar, project switcher, breadcrumbs) that
 * Phase 2 ("Project shell and guided setup") owns; the workspace index
 * still needs *something* per 01-DESIGN-SYSTEM.md's information
 * architecture ("Workspace level: Projects... Account settings").
 */
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-app">
      <header className="border-b border-subtle bg-surface">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-6 sm:px-8">
          <Link href="/projects" className="text-title-md font-medium text-foreground">
            {productConfig.name}
          </Link>
          <Menu>
            <MenuTrigger
              className="flex items-center gap-2 rounded-pill py-1 pl-1 pr-2.5 transition-fast hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              aria-label={`Account menu for ${user.name}`}
            >
              <Avatar name={user.name} size="sm" />
              <Icon name="chevronDown" size={14} className="text-foreground-muted" />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
                <span className="text-body-sm font-medium text-foreground">{user.name}</span>
                <span className="text-body-sm text-foreground-muted">{user.email}</span>
              </MenuLabel>
              <MenuSeparator />
              <MenuItem className="p-0">
                <form action={signOutAction} className="w-full">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
                  >
                    <Icon name="close" size={16} />
                    Sign out
                  </button>
                </form>
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
