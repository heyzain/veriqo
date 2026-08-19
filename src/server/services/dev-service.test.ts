import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { UserModel } from "@/server/db/models/user.model";
import { resetTestDb } from "@/test/db";
import { __resetCookieJarForTests } from "@/test/mocks/next-headers";

import { resetDemoDataForDev } from "./dev-service";

const originalNodeEnv = process.env.NODE_ENV;

function setNodeEnv(value: string) {
  // Node's `process.env` rejects a partial descriptor here — it requires
  // `writable`/`enumerable` spelled out alongside `configurable`, not just
  // `configurable: true` (which alone throws: "only accepts a configurable,
  // writable, and enumerable data descriptor").
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

beforeEach(async () => {
  await resetTestDb();
  __resetCookieJarForTests();
});

afterEach(() => {
  setNodeEnv(originalNodeEnv ?? "test");
});

describe("dev-service — resetDemoDataForDev", () => {
  it("refuses in production, leaving the database untouched", async () => {
    await UserModel.create({
      id: "real-user",
      name: "Real",
      email: "real@example.com",
      passwordHash: "x",
      emailVerified: true,
      createdAt: new Date().toISOString(),
    });
    setNodeEnv("production");

    const result = await resetDemoDataForDev();
    expect(result.ok).toBe(false);
    expect(await UserModel.findOne({ id: "real-user" }).lean()).not.toBeNull();
  });

  it("reseeds the database outside production", async () => {
    setNodeEnv("test");

    const result = await resetDemoDataForDev();
    expect(result.ok).toBe(true);
    expect(await UserModel.countDocuments({})).toBeGreaterThan(0);
  });
});
