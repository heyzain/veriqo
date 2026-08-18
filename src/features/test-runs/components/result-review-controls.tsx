"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  approveClaudeResultAction,
  correctTestResultAction,
  rejectClaudeResultAction,
  type CorrectTestResultValues,
} from "@/features/test-runs/actions";
import { idleState } from "@/lib/forms/action-state";
import type { ResultStatus } from "@/config/status.config";

export type ResultReviewControlsProps = {
  projectSlug: string;
  runPublicId: string;
  testCasePublicId: string;
  currentStatus: Exclude<ResultStatus, "notRun">;
  currentActualResult?: string;
};

const statusOptions = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "partial", label: "Partial" },
  { value: "blocked", label: "Blocked" },
] as const;

/**
 * Approve / Correct / Reject for a Claude result flagged `needsHumanReview`
 * (Phase 8 Build: "Human approval/rejection/correction of uncertain
 * results"). Approve and Reject are one-click server actions; Correct opens
 * a small form so the human can set the actual status and notes directly —
 * that submission is itself just `submitTestResult` again, so it also
 * re-applies the issue verify/reopen rule if this happens to be a rerun.
 */
export function ResultReviewControls({
  projectSlug,
  runPublicId,
  testCasePublicId,
  currentStatus,
  currentActualResult,
}: ResultReviewControlsProps) {
  const router = useRouter();
  const [correctOpen, setCorrectOpen] = React.useState(false);
  const [state, formAction, isPending] = useActionState(correctTestResultAction, idleState<CorrectTestResultValues>());

  // Close the dialog once the correction saves — adjusted during render
  // rather than in an effect (react.dev, "You Might Not Need an Effect"),
  // the same pattern `TestRunner` uses for its per-case draft reload.
  const [handledState, setHandledState] = React.useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success") setCorrectOpen(false);
  }

  React.useEffect(() => {
    if (state.status === "success") router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={approveClaudeResultAction}>
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="runId" value={runPublicId} />
        <input type="hidden" name="testCaseId" value={testCasePublicId} />
        <Button type="submit" intent="secondary" size="sm">
          <Icon name="approved" size={14} />
          <span>Approve</span>
        </Button>
      </form>

      <Button type="button" intent="secondary" size="sm" onClick={() => setCorrectOpen(true)}>
        <Icon name="draft" size={14} />
        <span>Correct</span>
      </Button>

      <form action={rejectClaudeResultAction}>
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="runId" value={runPublicId} />
        <input type="hidden" name="testCaseId" value={testCasePublicId} />
        <Button type="submit" intent="ghost" size="sm">
          <Icon name="close" size={14} />
          <span>Reject</span>
        </Button>
      </form>

      <Dialog open={correctOpen} onOpenChange={setCorrectOpen}>
        <DialogContent title="Correct this result" description={testCasePublicId} className="max-w-md">
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="runId" value={runPublicId} />
            <input type="hidden" name="testCaseId" value={testCasePublicId} />

            {state.status === "error" && state.formError ? (
              <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">{state.formError}</div>
            ) : null}

            <Select
              name="status"
              label="Status"
              options={statusOptions}
              defaultValue={state.values?.status ?? currentStatus}
              error={state.fieldErrors?.status}
            />
            <Textarea
              name="actualResult"
              label="Actual result"
              description="Required for fail, partial, or blocked."
              rows={4}
              defaultValue={state.values?.actualResult ?? currentActualResult}
              error={state.fieldErrors?.actualResult}
            />

            <DialogFooter>
              <Button type="button" intent="secondary" onClick={() => setCorrectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" intent="primary" disabled={isPending}>
                {isPending ? "Saving…" : "Save correction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
