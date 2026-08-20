"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { CopyBlock } from "@/components/shared/copy-block";
import { RefreshButton } from "@/components/shared/refresh-button";
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

type ExecutionState = "idle" | "waiting" | "running" | "incoming" | "completed";

const POLL_INTERVAL_MS = 4000;
const LOOKBACK_ISO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

/**
 * The prompt composer + copy action + live incoming-activity states for a
 * `claudeAssisted` run (Phase 8) — scoped specifically to Claude agent activity.
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
        router.refresh(); // Fresh results/status landed — refresh page state
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [projectSlug, runPublicId, router]);

  // Filter specifically for agent activity (Claude) for this panel
  const agentEvents = useMemo(() => events.filter((event) => event.actorType === "claude"), [events]);

  const agentEventsSinceCopy = copiedAt
    ? agentEvents.filter((event) => new Date(event.createdAt).getTime() > new Date(copiedAt).getTime())
    : agentEvents;

  const completedEvent = agentEventsSinceCopy.find((event) => event.action.includes("completed its assisted pass"));
  const resultEvents = agentEventsSinceCopy.filter((event) => event.action.startsWith("recorded "));
  const resultCount = resultEvents.length;
  const hasStarted = agentEventsSinceCopy.some(
    (event) => event.action.startsWith("started ") || event.action.startsWith("resumed "),
  );

  let state: ExecutionState = "idle";
  if (completedEvent || (progress.total > 0 && progress.notRun === 0 && hasStarted)) {
    state = "completed";
  } else if (resultCount > 0) {
    state = "incoming";
  } else if (hasStarted) {
    state = "running";
  } else if (copiedAt) {
    state = "waiting";
  }

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
              : state === "incoming" || state === "running"
                ? "border-ai/30 bg-ai/10"
                : "border-subtle bg-inset/40"
          }`}
          role="status"
        >
          <Icon
            name={
              state === "completed"
                ? "approved"
                : state === "incoming" || state === "running"
                  ? "claude"
                  : "spinner"
            }
            size={18}
            className={
              state === "completed"
                ? "text-pass"
                : state === "incoming" || state === "running"
                  ? "text-ai"
                  : "animate-spin text-foreground-muted"
            }
          />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-body-sm font-medium text-foreground">
              {state === "waiting" && "Waiting for Claude to run this prompt…"}
              {state === "running" && "Claude started the test run — executing test cases…"}
              {state === "incoming" &&
                `Claude is submitting results — ${resultCount} of ${progress.total} recorded…`}
              {state === "completed" && "Claude finished its assisted pass — review below."}
            </p>
            <p className="text-body-sm text-foreground-muted">
              {state === "waiting" && "This checks for real MCP activity every few seconds — no need to keep this open."}
              {state === "running" && "Claude is executing the test cases and will record each result as it completes."}
              {state === "incoming" && "Recording each result as it arrives."}
              {state === "completed" &&
                (needsReviewCount > 0
                  ? `${needsReviewCount} result${needsReviewCount === 1 ? "" : "s"} need your review before this run is fully trusted.`
                  : "All results recorded.")}
            </p>
          </div>
          {state === "waiting" ? <Badge tone="progress" icon="inProgress">Listening</Badge> : null}
          {state === "running" ? <Badge tone="ai" icon="inProgress">In progress</Badge> : null}
          {state === "incoming" ? <Badge tone="ai" icon="claude">Recording</Badge> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md text-foreground">Agent activity</h3>
          <RefreshButton
            label="Refresh activity"
            size="sm"
            onRefresh={async () => {
              const result = await pollTestRunActivityAction(projectSlug, runPublicId, LOOKBACK_ISO);
              if (result) {
                setEvents(result.events);
                router.refresh();
              }
            }}
          />
        </div>
        <AgentActivityStream
          activity={agentEvents}
          newEventIds={newEventIds}
          emptyTitle="No agent activity yet"
          emptyDescription="Once Claude starts the run and executes cases, incoming results and lifecycle events appear here."
        />
      </div>
    </div>
  );
}
