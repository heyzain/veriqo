"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { CopyBlock } from "@/components/shared/copy-block";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { pollTestRunActivityAction } from "@/features/test-runs/actions";
import { RunProgressBar } from "@/features/test-runs/components/run-progress-bar";
import { executionPrompt, type ExecutionContext } from "@/prompts/execution/prompt";
import type { RunProgress } from "@/server/services/test-run-service";
import type { ActivityEvent } from "@/types/domain";

export type ClaudeAssistedExecutionPanelProps = {
  projectSlug: string;
  runPublicId: string;
  progress: RunProgress;
  needsReviewCount: number;
  context: ExecutionContext;
};

type ExecutionState = "idle" | "waiting" | "incoming" | "completed";

const POLL_INTERVAL_MS = 4000;
const LOOKBACK_ISO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

/**
 * The prompt composer + copy action + live incoming-activity states for a
 * `claudeAssisted` run (Phase 8) — the same "waiting/incoming/completed"
 * treatment `FeatureDiscoveryPanel` and `IssueInvestigationPanel` use,
 * scoped to this one run's activity instead of the whole project.
 */
export function ClaudeAssistedExecutionPanel({
  projectSlug,
  runPublicId,
  progress,
  needsReviewCount,
  context,
}: ClaudeAssistedExecutionPanelProps) {
  const router = useRouter();
  const prompt = useMemo(() => executionPrompt.render(context), [context]);

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [newEventIds, setNewEventIds] = useState<ReadonlySet<string>>(new Set());
  const [copiedAt, setCopiedAt] = useState<string | null>(null);
  const seenIdsRef = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const result = await pollTestRunActivityAction(projectSlug, runPublicId, LOOKBACK_ISO);
      if (cancelled || !result) return;

      const previouslySeen = seenIdsRef.current;
      const incoming = result.events.filter((event) => !previouslySeen.has(event.id));
      seenIdsRef.current = new Set(result.events.map((event) => event.id));
      setEvents(result.events);
      if (incoming.length > 0) {
        setNewEventIds(new Set(incoming.map((event) => event.id)));
        window.setTimeout(() => setNewEventIds(new Set()), 1200);
        if (copiedAt) router.refresh(); // fresh results landed — refresh progress/review controls below
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSlug, runPublicId, copiedAt]);

  const eventsSinceCopy = copiedAt
    ? events.filter((event) => new Date(event.createdAt).getTime() > new Date(copiedAt).getTime())
    : [];
  const completedSinceCopy = eventsSinceCopy.some((event) => event.action.includes("completed its assisted pass"));
  const resultCountSinceCopy = eventsSinceCopy.filter((event) => event.action.startsWith("recorded ")).length;

  const state: ExecutionState = !copiedAt
    ? "idle"
    : eventsSinceCopy.length === 0
      ? "waiting"
      : completedSinceCopy
        ? "completed"
        : "incoming";

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-subtle bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="claude" size={16} className="text-ai" />
          <h2 className="text-title-md text-foreground">Claude-assisted execution</h2>
        </div>
        {needsReviewCount > 0 ? (
          <Badge tone="partial" icon="alert">
            {needsReviewCount} need{needsReviewCount === 1 ? "s" : ""} review
          </Badge>
        ) : null}
      </div>

      <RunProgressBar progress={progress} />

      <CopyBlock
        label="Execution prompt"
        value={prompt}
        description="Paste this into Claude Code or Claude Desktop, connected to this project over MCP. Claude executes each case and submits results directly here."
        onCopy={() => setCopiedAt(new Date().toISOString())}
      />

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
              state === "completed" ? "text-pass" : state === "incoming" ? "text-ai" : "animate-spin text-foreground-muted"
            }
          />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-body-sm font-medium text-foreground">
              {state === "waiting" && "Waiting for Claude to run this prompt…"}
              {state === "incoming" &&
                `Claude is submitting results${resultCountSinceCopy > 0 ? ` — ${resultCountSinceCopy} so far` : ""}…`}
              {state === "completed" && "Claude finished its assisted pass — review below."}
            </p>
            <p className="text-body-sm text-foreground-muted">
              {state === "waiting" && "This checks for real MCP activity every few seconds — no need to keep this open."}
              {state === "incoming" && "Recording each result as it arrives."}
              {state === "completed" &&
                (needsReviewCount > 0
                  ? `${needsReviewCount} result${needsReviewCount === 1 ? "" : "s"} need your review before this run is fully trusted.`
                  : "No results were flagged for review.")}
            </p>
          </div>
          {state === "waiting" ? <Badge tone="progress" icon="inProgress">Listening</Badge> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-title-md text-foreground">Agent activity</h3>
        <AgentActivityStream
          activity={events}
          newEventIds={newEventIds}
          emptyTitle="No activity yet"
          emptyDescription="Once Claude runs the prompt above, incoming results appear here."
        />
      </div>
    </div>
  );
}
