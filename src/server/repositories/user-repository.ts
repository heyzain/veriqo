import "server-only";

import { store } from "@/server/repositories/store";
import type { User } from "@/types/auth";

export function findUserById(id: string): User | null {
  return store.users.get(id) ?? null;
}

export function findUserByEmail(email: string): User | null {
  const id = store.usersByEmail.get(email.toLowerCase());
  return id ? (store.users.get(id) ?? null) : null;
}

export function createUser(user: User): void {
  store.users.set(user.id, user);
  store.usersByEmail.set(user.email.toLowerCase(), user.id);
}

export function updateUser(user: User): void {
  store.users.set(user.id, user);
}
