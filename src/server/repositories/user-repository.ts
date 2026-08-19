import "server-only";

import { dbConnect } from "@/server/db/connection";
import { UserModel, toUser } from "@/server/db/models/user.model";
import type { User } from "@/types/auth";

export async function findUserById(id: string): Promise<User | null> {
  await dbConnect();
  const doc = await UserModel.findOne({ id }).lean();
  return doc ? toUser(doc) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  await dbConnect();
  const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  return doc ? toUser(doc) : null;
}

export async function createUser(user: User): Promise<void> {
  await dbConnect();
  await UserModel.create({ ...user, email: user.email.toLowerCase() });
}

export async function updateUser(user: User): Promise<void> {
  await dbConnect();
  await UserModel.updateOne(
    { id: user.id },
    { $set: { ...user, email: user.email.toLowerCase() } },
    { upsert: true },
  );
}

/** Part of `account-service.deleteAccount` — removes the account itself, after its owned projects are already gone. */
export async function deleteUser(id: string): Promise<void> {
  await dbConnect();
  await UserModel.deleteOne({ id });
}
