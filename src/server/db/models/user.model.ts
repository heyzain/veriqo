import "server-only";

import mongoose, { Schema } from "mongoose";

import type { User } from "@/types/auth";

const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, required: true, default: false },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

export type UserDoc = mongoose.InferSchemaType<typeof userSchema>;

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc> | undefined) ??
  mongoose.model<UserDoc>("User", userSchema);

export function toUser(doc: UserDoc): User {
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    emailVerified: doc.emailVerified,
    createdAt: doc.createdAt,
  };
}
