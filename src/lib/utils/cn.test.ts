import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("resolves conflicting Tailwind utilities in favor of the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignores nullish and boolean values", () => {
    expect(cn("a", null, undefined, false)).toBe("a");
  });
});
