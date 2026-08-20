import "server-only";

import type { AutomationExecutionOutcome, AutomationExecutor } from "@/server/automation/types";

/**
 * Phase 0's only `AutomationExecutor` — there is no execution engine yet
 * (docs/05-NATIVE-AUTOMATION.md, "Do NOT implement browser launching in this
 * phase"). Refuses outright rather than fabricating a result, per
 * 03-CLAUDE-RULES.md: "Never claim execution evidence that was not actually
 * received." Server-internal only — nothing under `app/**` imports this, so
 * there is no functional "Run automatically" entry point in the UI.
 *
 * A later phase swaps this for a Playwright-backed executor by passing it to
 * `automation/orchestrator.ts`'s `startAutomationExecution` — the
 * orchestrator, and everything it calls, is unaffected by the swap.
 */
export class NotImplementedAutomationExecutor implements AutomationExecutor {
  async execute(): Promise<AutomationExecutionOutcome> {
    throw new Error(
      "Veriqo automated execution isn't available yet — run this test case manually or with Claude-assisted execution instead.",
    );
  }
}
