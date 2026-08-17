import "server-only";

import { store } from "@/server/repositories/store";
import type { Invite } from "@/types/auth";

export function findInviteByToken(token: string): Invite | null {
  return store.invites.get(token) ?? null;
}

export function saveInvite(invite: Invite): void {
  store.invites.set(invite.token, invite);
}
