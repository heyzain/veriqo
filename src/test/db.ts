import { dbConnect } from "@/server/db/connection";
import { markSeededForTests } from "@/server/repositories/seed";

/**
 * The real replacement for the old in-memory `store.x.clear()` reset — every
 * service test now runs against the actual Mongoose models, pointed at a
 * dedicated `veriqo_test` database (`vitest.config.mts`'s `test.env.MONGODB_URI`),
 * never the dev/production one. Drops every collection so each test starts
 * from empty, then marks seeding done so `ensureSeeded()` (called defensively
 * by most service functions) doesn't insert demo data into a suite that owns
 * its own fixtures.
 */
export async function resetTestDb(): Promise<void> {
  const mongoose = await dbConnect();
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  markSeededForTests();
}
