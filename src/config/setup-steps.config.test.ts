import { describe, expect, it } from "vitest";

import { nextSetupStepLabel, setupSteps, totalSetupSteps } from "./setup-steps.config";

describe("setup steps", () => {
  it("numbers steps 1..N with no gaps", () => {
    expect(setupSteps.map((s) => s.step)).toEqual(
      Array.from({ length: totalSetupSteps }, (_, i) => i + 1),
    );
  });

  it("returns the next step's label", () => {
    expect(nextSetupStepLabel(0)).toBe("Project created");
    expect(nextSetupStepLabel(1)).toBe("Connect Claude");
  });

  it("returns null once every step is complete", () => {
    expect(nextSetupStepLabel(totalSetupSteps)).toBeNull();
  });
});
