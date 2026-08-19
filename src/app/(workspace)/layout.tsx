import type { ReactNode } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { productConfig } from "@/config/product.config";
import { WorkspaceAccountMenu } from "@/features/auth/components/workspace-account-menu";
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
          <WorkspaceAccountMenu user={user} />
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
