import "server-only";

import mongoose from "mongoose";

import { serverEnv } from "@/lib/env/server";

/**
 * Cached across Next.js dev hot-reloads via `globalThis` — the same pattern
 * `server/repositories/store.ts` used for the in-memory store this file
 * replaces the connection for. Without this, every module reload during
 * `next dev` would open a new connection and eventually exhaust MongoDB's
 * connection pool.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { __veriqoMongoose?: MongooseCache };

const cache: MongooseCache = globalForMongoose.__veriqoMongoose ?? { conn: null, promise: null };

if (process.env.NODE_ENV !== "production") {
  globalForMongoose.__veriqoMongoose = cache;
}

/**
 * Every repository function calls this before touching a model. Mongoose
 * buffers queries issued before the connection actually opens, but awaiting
 * this explicitly keeps repositories honest about being async and surfaces a
 * connection failure at the call site instead of a silent hang.
 */
export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(serverEnv.MONGODB_URI);
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
