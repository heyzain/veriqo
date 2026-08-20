"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { CopyBlock } from "@/components/shared/copy-block";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { pollTestCaseGenerationActivityAction } from "@/features/test-cases/actions";
import {
  testGenerationPrompt,
  type TestGenerationContext,
  type TestGenerationScope,
} from "@/prompts/test-generation/prompt";
import type { ActivityEvent } from "@/types/domain";

export type TestCaseGenerationPanelProps = {
  projectSlug: string;
  project: TestGenerationContext["project"];
  /** Every approved, non-archived feature — the full pool either generation mode draws from. */
  approvedFeatures: readonly TestGenerationContext["features"][number][];
  existingTestCases: readonly TestGenerationContext["existingTestCases"][number][];
  environments: readonly string[];
};

type GenerationState = "idle" | "waiting" | "incoming" | "completed";

const POLL_INTERVAL_MS = 4000;
const LOOKBACK_ISO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

/**
 * The prompt composer + copy action + live incoming-activity states for test
 * generation (02-BUILD-PHASES.md Phase 5) — the same pattern
 * `FeatureDiscoveryPanel` established for Phase 4, with an added scope
 * picker so "full product" and "selected features" are distinct,
 * understandable flows (Phase 5 acceptance) rather than one blended mode.
 */
export function TestCaseGenerationPanel({
  projectSlug,
  project,
  approvedFeatures,
  existingTestCases,
  environments,
}: TestCaseGenerationPanelProps) {
  const router = useRouter();
  const [scope, setScope] = useState<TestGenerationScope>("full");
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<ReadonlySet<string>>(new Set());

  const inScopeFeatures = useMemo(
    () => (scope === "full" ? approvedFeatures : approvedFeatures.filter((f) => selectedFeatureIds.has(f.publicId))),
    [scope, approvedFeatures, selectedFeatureIds],
  );
  const inScopeExistingTestCases = useMemo(() => {
    const inScopeIds = new Set(inScopeFeatures.map((f) => f.publicId));
    return existingTestCases.filter((tc) => inScopeIds.has(tc.featureId));
  }, [inScopeFeatures, existingTestCases]);

  const context: TestGenerationContext = useMemo(
    () => ({ project, scope, features: inScopeFeatures, existingTestCases: inScopeExistingTestCases, environments }),
    [project, scope, inScopeFeatures, inScopeExistingTestCases, environments],
  );
  const prompt = useMemo(() => testGenerationPrompt.render(context), [context]);

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [newEventIds, setNewEventIds] = useState<ReadonlySet<string>>(new Set());
  const [copiedAt, setCopiedAt] = useState<string | null>(null);
  const seenIdsRef = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const result = await pollTestCaseGenerationActivityAction(projectSlug, LOOKBACK_ISO);
      if (cancelled || !result) return;

      const previouslySeen = seenIdsRef.current;
      const incoming = result.events.filter((event) => !previouslySeen.has(event.id));
      seenIdsRef.current = new Set(result.events.map((event) => event.id));
      setEvents(result.events);
      if (incoming.length > 0) {
        setNewEventIds(new Set(incoming.map((event) => event.id)));
        window.setTimeout(() => setNewEventIds(new Set()), 1200);
        if (copiedAt) router.refresh();
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSlug, copiedAt]);

  const eventsSinceCopy = copiedAt
    ? events.filter((event) => new Date(event.createdAt).getTime() > new Date(copiedAt).getTime())
    : [];
  const newTestCaseCountSinceCopy = eventsSinceCopy.filter(
    (event) => event.actorType === "claude" && event.action.startsWith("generated "),
  ).length;

  const state: GenerationState = !copiedAt
    ? "idle"
    : eventsSinceCopy.length === 0
      ? "waiting"
      : newTestCaseCountSinceCopy > 0
        ? "completed"
        : "incoming";

  if (approvedFeatures.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-subtle px-6 py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-pill bg-inset text-foreground-muted">
          <Icon name="features" size={20} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-title-md text-foreground">No approved features yet</p>
          <p className="max-w-sm text-body-sm text-foreground-muted">
            Test cases are generated from approved features. Approve at least one before generating coverage.
          </p>
        </div>
        <Link href={`/projects/${projectSlug}/features`} className="text-body-sm text-action hover:underline">
          Review features →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SegmentedControl
          label="Generation scope"
          value={scope}
          onValueChange={(value) => setScope(value as TestGenerationScope)}
          options={[
            { value: "full", label: "Full product" },
            { value: "selected", label: "Selected features" },
          ]}
        />
        <p className="text-body-sm text-foreground-muted">
          {scope === "full"
            ? `Covers all ${approvedFeatures.length} approved feature${approvedFeatures.length === 1 ? "" : "s"}.`
            : "Choose which approved features this pass should cover."}
        </p>

        {scope === "selected" ? (
          <div className="flex flex-col gap-2 rounded-md border border-subtle bg-surface p-4">
            {approvedFeatures.map((feature) => (
              <Checkbox
                key={feature.publicId}
                label={`${feature.publicId} — ${feature.name}`}
                checked={selectedFeatureIds.has(feature.publicId)}
                onCheckedChange={(checked) =>
                  setSelectedFeatureIds((prev) => {
                    const next = new Set(prev);
                    if (checked === true) next.add(feature.publicId);
                    else next.delete(feature.publicId);
                    return next;
                  })
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      {scope === "selected" && inScopeFeatures.length === 0 ? (
        <p className="rounded-md border border-dashed border-subtle px-4 py-6 text-center text-body-sm text-foreground-muted">
          Select at least one feature above to compose its prompt.
        </p>
      ) : (
        <CopyBlock
          label="Test-generation prompt"
          value={prompt}
          description="Paste this into Claude Code or Claude Desktop, connected to this project over MCP. Claude analyzes the in-scope features and saves test cases directly here."
          onCopy={() => setCopiedAt(new Date().toISOString())}
        />
      )}

      {state !== "idle" ? (
        <div
          className={`flex items-center gap-3 rounded-md border p-4 ${
            state === "completed"
              ? "border-pass/30 bg-pass/10"
              : state === "incoming"
                ? "border-ai/30 bg-ai/10"
                : "border-subtle bg-inset/40"
          }`}
          role="status"
        >
          <Icon
            name={state === "completed" ? "approved" : state === "incoming" ? "claude" : "spinner"}
            size={18}
            className={
              state === "completed"
                ? "text-pass"
                : state === "incoming"
                  ? "text-ai"
                  : "animate-spin text-foreground-muted"
            }
          />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-body-sm font-medium text-foreground">
              {state === "waiting" && "Waiting for Claude to run this prompt…"}
              {state === "incoming" && "Claude is saving activity for this project…"}
              {state === "completed" &&
                `Claude saved ${newTestCaseCountSinceCopy} test case${newTestCaseCountSinceCopy === 1 ? "" : "s"} — ready to review below.`}
            </p>
            <p className="text-body-sm text-foreground-muted">
              {state === "waiting" && "This checks for real MCP activity every few seconds — no need to keep this open."}
              {state === "incoming" && "Recording what Claude sends before it appears in the records tab."}
              {state === "completed" && "New and updated test cases default to In review."}
            </p>
          </div>
          {state === "waiting" ? <Badge tone="progress" icon="inProgress">Listening</Badge> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md text-foreground">Agent activity</h3>
          <RefreshButton
            label="Refresh activity"
            size="sm"
            onRefresh={async () => {
              const result = await pollTestCaseGenerationActivityAction(projectSlug, LOOKBACK_ISO);
              if (result) {
                setEvents(result.events);
                router.refresh();
              }
            }}
          />
        </div>
        <AgentActivityStream
          activity={events}
          newEventIds={newEventIds}
          emptyTitle="No test-case activity yet"
          emptyDescription="Once Claude runs the prompt above, generation and review activity for this project appears here."
        />
      </div>
    </div>
  );
}
