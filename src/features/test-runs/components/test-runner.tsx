"use client";

import * as React from "react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { resultStatuses, testRunStatuses, type ResultStatus } from "@/config/status.config";
import { EvidenceGallery } from "@/components/shared/evidence-gallery";
import { EvidenceUploadButton } from "@/features/test-runs/components/evidence-upload-button";
import { RunProgressBar } from "@/features/test-runs/components/run-progress-bar";
import { pauseTestRunAction, submitTestResultAction } from "@/features/test-runs/actions";
import type { RunProgress } from "@/server/services/test-run-service";
import type { Feature, TestCase, TestEvidence, TestResult, TestRun } from "@/types/domain";

export type RunnerItem = { testCase: TestCase; result: TestResult };

export type TestRunnerProps = {
  projectSlug: string;
  testRun: TestRun;
  items: readonly RunnerItem[];
  features: readonly Feature[];
  progress: RunProgress;
  startIndex: number;
};

type Draft = { actualResult: string; evidence: TestEvidence[] };

const resultActions: readonly Exclude<ResultStatus, "notRun">[] = ["pass", "fail", "partial", "blocked"];

function draftKey(runId: string, testCaseId: string) {
  return `veriqo:run-draft:${runId}:${testCaseId}`;
}

function loadDraft(runId: string, testCaseId: string, fallback: Draft): Draft {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(draftKey(runId, testCaseId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      actualResult: typeof parsed.actualResult === "string" ? parsed.actualResult : fallback.actualResult,
      evidence: Array.isArray(parsed.evidence) ? (parsed.evidence as TestEvidence[]) : fallback.evidence,
    };
  } catch {
    return fallback;
  }
}

/**
 * The focused manual runner (01-DESIGN-SYSTEM.md, "Test runner" — "compact
 * run context, current case, steps, expected result, evidence, and large
 * but restrained result controls. No analytics widgets.").
 *
 * Draft protection: notes/evidence for the *current, not-yet-submitted*
 * case are mirrored to `localStorage` (debounced) so a refresh mid-entry
 * doesn't lose them. Once a case is submitted it's persisted server-side —
 * that's the actual "refreshing doesn't lose recorded progress" guarantee
 * (Phase 6 acceptance); the draft is just for what hasn't been submitted yet.
 */
export function TestRunner({ projectSlug, testRun, items, features, progress: initialProgress, startIndex }: TestRunnerProps) {
  const [runStatus, setRunStatus] = React.useState(testRun.status);
  const [runItems, setRunItems] = React.useState(items);
  const [progress, setProgress] = React.useState(initialProgress);
  const [currentIndex, setCurrentIndex] = React.useState(Math.min(startIndex, items.length - 1));
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const current = runItems[currentIndex];
  const currentFeature = current ? features.find((f) => f.id === current.testCase.featureId) : undefined;

  function draftForCase(item: RunnerItem | undefined): Draft {
    if (!item) return { actualResult: "", evidence: [] };
    return loadDraft(testRun.id, item.testCase.id, {
      actualResult: item.result.actualResult ?? "",
      evidence: [...item.result.evidence],
    });
  }

  const [draft, setDraft] = React.useState<Draft>(() => draftForCase(current));

  // The draft belongs to whichever case is current. Rather than an effect
  // that calls setState after the case changes, reload it during render —
  // React's documented alternative for state derived from a changed prop
  // (react.dev, "You Might Not Need an Effect"; the same pattern
  // `CreateProjectWizard` uses for its step-error handling).
  const [loadedForCaseId, setLoadedForCaseId] = React.useState(current?.testCase.id);
  if (current && current.testCase.id !== loadedForCaseId) {
    setLoadedForCaseId(current.testCase.id);
    setDraft(draftForCase(current));
  }

  // Debounced autosave of the in-progress draft.
  React.useEffect(() => {
    if (!current) return;
    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey(testRun.id, current.testCase.id), JSON.stringify(draft));
      } catch {
        // Best-effort — draft protection degrades gracefully if storage is unavailable.
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draft, testRun.id, current]);

  const isComplete = runStatus === "completed" || runStatus === "needsAttention";

  async function handleRecord(status: Exclude<ResultStatus, "notRun">) {
    if (!current || isSubmitting) return;
    if (status !== "pass" && !draft.actualResult.trim()) {
      toast({ title: "Describe what happened before recording this result.", variant: "fail" });
      return;
    }

    setIsSubmitting(true);
    const response = await submitTestResultAction({
      projectSlug,
      runId: testRun.publicId,
      testCaseId: current.testCase.publicId,
      status,
      actualResult: draft.actualResult,
      evidence: draft.evidence,
    });
    setIsSubmitting(false);

    if (!response.ok) {
      toast({ title: "Couldn't record this result", description: response.error, variant: "fail" });
      return;
    }

    try {
      window.localStorage.removeItem(draftKey(testRun.id, current.testCase.id));
    } catch {
      // Non-fatal.
    }

    const now = new Date().toISOString();
    setRunItems((prev) =>
      prev.map((item, index) =>
        index === currentIndex
          ? {
              ...item,
              result: { ...item.result, status, actualResult: draft.actualResult.trim() || undefined, evidence: draft.evidence, updatedAt: now },
            }
          : item,
      ),
    );
    setProgress(response.progress);
    setRunStatus(response.testRun.status);

    toast({ title: `Recorded ${resultStatuses[status].label.toLowerCase()} for ${current.testCase.publicId}`, variant: status === "pass" ? "pass" : status === "fail" ? "fail" : "partial" });

    if (response.issueUpdate) {
      const verified = response.issueUpdate.status === "verified";
      toast({
        title: verified
          ? `${response.issueUpdate.publicId} verified`
          : `${response.issueUpdate.publicId} reopened — the rerun didn't pass`,
        description: verified ? "The passing rerun confirmed the fix." : "Investigate again before the next retest.",
        variant: verified ? "pass" : "fail",
      });
    }

    const nextIncomplete = runItems.findIndex((item, index) => index > currentIndex && item.result.status === "notRun");
    if (nextIncomplete !== -1) {
      setCurrentIndex(nextIncomplete);
    } else if (currentIndex < runItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  if (!current && !isComplete) {
    return null;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-subtle pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/projects/${projectSlug}/test-runs/${testRun.publicId}`}
              className="text-mono-sm font-semibold text-foreground-muted hover:text-foreground"
            >
              {testRun.publicId}
            </Link>
            <h1 className="text-title-lg font-serif text-foreground">{testRun.name}</h1>
            <StatusBadge status={testRunStatuses[runStatus]} />
          </div>
          {runStatus === "inProgress" ? (
            <form action={pauseTestRunAction}>
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input type="hidden" name="runId" value={testRun.publicId} />
              <input type="hidden" name="redirectTo" value={`/projects/${projectSlug}/test-runs/${testRun.publicId}`} />
              <Button type="submit" intent="secondary" size="sm">
                <Icon name="paused" size={14} />
                <span>Pause</span>
              </Button>
            </form>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-foreground-muted">
          <span>Build: <span className="text-mono-sm text-foreground">{testRun.build}</span></span>
          <span aria-hidden="true">•</span>
          <span>{testRun.environment}</span>
          <span aria-hidden="true">•</span>
          <span>{testRun.browser}</span>
        </div>
        <RunProgressBar progress={progress} compact />
      </div>

      {isComplete || !current ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-subtle bg-surface px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-pill bg-inset text-foreground-muted">
            <Icon name={runStatus === "needsAttention" ? "alert" : "approved"} size={22} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-title-md text-foreground">
              {runStatus === "needsAttention" ? "Run complete — needs attention" : "Run complete"}
            </p>
            <p className="max-w-sm text-body-sm text-foreground-muted">
              {runStatus === "needsAttention"
                ? "Every selected test case has a result, and at least one failed."
                : "Every selected test case passed, was marked partial, or was blocked."}
            </p>
          </div>
          <RunProgressBar progress={progress} />
          <Button asChild intent="primary">
            <Link href={`/projects/${projectSlug}/test-runs/${testRun.publicId}`}>
              <span>View run summary</span>
              <Icon name="chevronRight" size={14} />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Case navigation dots */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Jump to test case">
            {runItems.map((item, index) => {
              const def = resultStatuses[item.result.status];
              return (
                <button
                  key={item.testCase.id}
                  type="button"
                  aria-current={index === currentIndex ? "step" : undefined}
                  aria-label={`${item.testCase.publicId} — ${def.label}`}
                  title={`${item.testCase.publicId} — ${def.label}`}
                  onClick={() => setCurrentIndex(index)}
                  className={
                    "flex h-2.5 w-6 rounded-pill transition-fast " +
                    (index === currentIndex ? "ring-2 ring-focus-ring ring-offset-1 ring-offset-app" : "opacity-70 hover:opacity-100") +
                    " " +
                    (def.tone === "pass"
                      ? "bg-pass"
                      : def.tone === "fail"
                        ? "bg-fail"
                        : def.tone === "partial"
                          ? "bg-partial"
                          : def.tone === "blocked"
                            ? "bg-blocked"
                            : "bg-inset")
                  }
                />
              );
            })}
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-6">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-mono-sm font-semibold text-foreground-muted">{current.testCase.publicId}</span>
                {currentFeature ? (
                  <span className="text-body-sm text-foreground-muted">{currentFeature.publicId} — {currentFeature.name}</span>
                ) : null}
                <span className="text-body-sm text-foreground-muted">
                  Case {currentIndex + 1} of {runItems.length}
                </span>
              </div>
              <h2 className="text-title-md text-foreground">{current.testCase.title}</h2>
            </div>

            {current.testCase.preconditions ? (
              <div className="flex flex-col gap-1">
                <span className="text-label-style text-foreground-muted">Preconditions</span>
                <p className="text-body-sm text-foreground-secondary">{current.testCase.preconditions}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <span className="text-label-style text-foreground-muted">Steps</span>
              <ol className="flex flex-col gap-1.5">
                {current.testCase.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-body text-foreground-secondary">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill bg-inset text-[11px] font-medium text-foreground-muted">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-label-style text-foreground-muted">Expected result</span>
              <p className="text-body text-foreground-secondary">{current.testCase.expectedResult}</p>
            </div>

            <div className="flex flex-col gap-2 border-t border-subtle pt-4">
              <Textarea
                label="Actual result"
                description="Required for fail, partial, or blocked — optional for pass."
                rows={3}
                value={draft.actualResult}
                onChange={(event) => setDraft((prev) => ({ ...prev, actualResult: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-label-style text-foreground-muted">Evidence</span>
              <EvidenceGallery
                evidence={draft.evidence}
                onRemove={(id) => setDraft((prev) => ({ ...prev, evidence: prev.evidence.filter((item) => item.id !== id) }))}
                emptyMessage="No evidence added yet."
              />
              <EvidenceUploadButton
                evidence={draft.evidence}
                onAdd={(items) => setDraft((prev) => ({ ...prev, evidence: [...prev.evidence, ...items] }))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {resultActions.map((status) => (
              <Button
                key={status}
                type="button"
                size="lg"
                disabled={isSubmitting}
                loading={isSubmitting}
                className={
                  status === "pass"
                    ? "bg-pass hover:bg-pass text-foreground-on-dark hover:opacity-90"
                    : status === "fail"
                      ? "bg-fail hover:bg-fail text-foreground-on-dark hover:opacity-90"
                      : status === "partial"
                        ? "bg-partial hover:bg-partial text-foreground-on-dark hover:opacity-90"
                        : "bg-blocked hover:bg-blocked text-foreground-on-dark hover:opacity-90"
                }
                onClick={() => handleRecord(status)}
              >
                <Icon name={resultStatuses[status].icon} size={16} />
                <span>{resultStatuses[status].label}</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-subtle pt-4">
            <Button
              type="button"
              intent="secondary"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            >
              <Icon name="chevronLeft" size={14} />
              <span>Previous</span>
            </Button>
            <Button asChild intent="ghost" size="sm">
              <Link href={`/projects/${projectSlug}/test-runs/${testRun.publicId}`}>Save &amp; exit</Link>
            </Button>
            <Button
              type="button"
              intent="secondary"
              size="sm"
              disabled={currentIndex === runItems.length - 1}
              onClick={() => setCurrentIndex((index) => Math.min(runItems.length - 1, index + 1))}
            >
              <span>Next</span>
              <Icon name="chevronRight" size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
