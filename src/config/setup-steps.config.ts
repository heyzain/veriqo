/**
 * The seven-step guided path from 00-PRODUCT.md ("The first project screen
 * is a guided setup path...") and 02-BUILD-PHASES.md Phase 2. Phase 1 only
 * needs the step data — to compute a project card's "next action" text — not
 * the visual guided-setup UI itself, which Phase 2 owns.
 */
export type SetupStep = {
  /** 1-based, matches `Project.setupStepsCompleted`. */
  step: number;
  key: string;
  label: string;
};

export const setupSteps: readonly SetupStep[] = [
  { step: 1, key: "projectCreated", label: "Project created" },
  { step: 2, key: "connectClaude", label: "Connect Claude" },
  { step: 3, key: "discoverFeatures", label: "Discover features" },
  { step: 4, key: "reviewFeatures", label: "Review features" },
  { step: 5, key: "generateTests", label: "Generate test cases" },
  { step: 6, key: "createFirstRun", label: "Create first run" },
  { step: 7, key: "reviewReadiness", label: "Review release readiness" },
] as const;

export const totalSetupSteps = setupSteps.length;

/**
 * The label of the next incomplete step, or `null` once every step is done.
 * Used by `ProjectRecordCard` — never a fabricated health score, just the
 * plain next action for that project.
 */
export function nextSetupStepLabel(setupStepsCompleted: number): string | null {
  const next = setupSteps.find((s) => s.step === setupStepsCompleted + 1);
  return next?.label ?? null;
}
