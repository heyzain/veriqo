import "server-only";

import mongoose, { Schema } from "mongoose";

import type { AuthToken } from "@/types/auth";

const tokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    purpose: { type: String, required: true },
    userId: { type: String, required: true },
    expiresAt: { type: Number, required: true },
    usedAt: { type: Number },
  },
  { versionKey: false },
);

export type TokenDoc = mongoose.InferSchemaType<typeof tokenSchema>;

export const TokenModel =
  (mongoose.models.Token as mongoose.Model<TokenDoc> | undefined) ??
  mongoose.model<TokenDoc>("Token", tokenSchema);

export function toAuthToken(doc: TokenDoc): AuthToken {
  return {
    token: doc.token,
    purpose: doc.purpose as AuthToken["purpose"],
    userId: doc.userId,
    expiresAt: doc.expiresAt,
    usedAt: doc.usedAt ?? undefined,
  };
}
