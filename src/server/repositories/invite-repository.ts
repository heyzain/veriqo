import "server-only";

import { dbConnect } from "@/server/db/connection";
import { InviteModel, toInvite } from "@/server/db/models/invite.model";
import type { Invite } from "@/types/auth";

export async function findInviteByToken(token: string): Promise<Invite | null> {
  await dbConnect();
  const doc = await InviteModel.findOne({ token }).lean();
  return doc ? toInvite(doc) : null;
}

export async function saveInvite(invite: Invite): Promise<void> {
  await dbConnect();
  await InviteModel.updateOne({ token: invite.token }, { $set: invite }, { upsert: true });
}
