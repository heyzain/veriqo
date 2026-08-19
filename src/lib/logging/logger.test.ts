import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "./logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("routes each level to the matching console method as one JSON line", () => {
    logger.info("something happened", { projectId: "proj-1" });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(parsed).toMatchObject({ level: "info", message: "something happened", context: { projectId: "proj-1" } });
    expect(typeof parsed.time).toBe("string");

    logger.warn("uh oh");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(warnSpy.mock.calls[0]![0] as string)).toMatchObject({ level: "warn", message: "uh oh" });

    logger.error("broke", { tool: "submit_test_result" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(errorSpy.mock.calls[0]![0] as string)).toMatchObject({ level: "error", message: "broke" });
  });

  it("omits the context field entirely when none is given", () => {
    logger.info("no context here");
    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(parsed.context).toBeUndefined();
  });
});
