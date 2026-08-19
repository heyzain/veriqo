"use client";

import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { signOutAction } from "@/features/auth/actions";
import type { PublicUser } from "@/types/auth";

export type WorkspaceAccountMenuProps = {
  user: Pick<PublicUser, "name" | "email">;
};

/**
 * The workspace top-bar's account menu — split out as its own Client
 * Component so `onSelect` can wrap `signOutAction` in a plain closure the
 * same way `project-sidebar.tsx`'s account menu does. `(workspace)/layout.tsx`
 * is a Server Component; passing that closure as a prop straight from there
 * into `MenuItem` (a Client Component) isn't serializable and throws "Event
 * handlers cannot be passed to Client Component props" — moving the whole
 * interactive menu behind its own `"use client"` boundary is what actually
 * fixes it, not just the specific prop.
 */
export function WorkspaceAccountMenu({ user }: WorkspaceAccountMenuProps) {
  return (
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
        <MenuItem asChild>
          <Link href="/account">
            <Icon name="settings" size={16} />
            Account settings
          </Link>
        </MenuItem>
        <MenuSeparator />
        {/* `onSelect` calling the Server Action directly, not a nested
            form/button — see the matching comment in project-sidebar.tsx
            for why. Legal here because this whole component is a Client
            Component, unlike the Server Component that used to render this
            menu inline. */}
        <MenuItem
          onSelect={() => {
            void signOutAction();
          }}
        >
          <Icon name="close" size={16} />
          Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
