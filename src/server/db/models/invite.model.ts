import "server-only";

import mongoose, { Schema } from "mongoose";

import type { Invite } from "@/types/auth";

const inviteSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    inviterName: { type: String, required: true },
    projectName: { type: String, required: true },
    role: { type: String, required: true },
    expiresAt: { type: Number, required: true },
    acceptedAt: { type: Number },
  },
  { versionKey: false },
);

export type InviteDoc = mongoose.InferSchemaType<typeof inviteSchema>;

export const InviteModel =
  (mongoose.models.Invite as mongoose.Model<InviteDoc> | undefined) ??
  mongoose.model<InviteDoc>("Invite", inviteSchema);

export function toInvite(doc: InviteDoc): Invite {
  return {
    token: doc.token,
    email: doc.email,
    inviterName: doc.inviterName,
    projectName: doc.projectName,
    role: doc.role,
    expiresAt: doc.expiresAt,
    acceptedAt: doc.acceptedAt ?? undefined,
  };
}
