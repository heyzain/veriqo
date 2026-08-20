"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { CopyBlock } from "@/components/shared/copy-block";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { pollFeatureDiscoveryActivityAction } from "@/features/features/actions";
import { featureDiscoveryPrompt, type FeatureDiscoveryContext } from "@/prompts/feature-discovery/prompt";
import type { ActivityEvent } from "@/types/domain";

export type FeatureDiscoveryPanelProps = {
  projectSlug: string;
  context: FeatureDiscoveryContext;
};

type GenerationState = "idle" | "waiting" | "incoming" | "completed";

const POLL_INTERVAL_MS = 4000;
const LOOKBACK_ISO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

/**
 * The prompt composer + copy action + live incoming-activity states for
 * feature discovery (02-BUILD-PHASES.md Phase 4). Polls real recorded
 * activity — never a fabricated progress animation (03-CLAUDE-RULES.md,
 * "No fake actions that look functional without being labeled as prototype
 * behavior") — so "waiting" genuinely means no MCP call has landed yet.
 */
export function FeatureDiscoveryPanel({ projectSlug, context }: FeatureDiscoveryPanelProps) {
  const router = useRouter();
  const prompt = useMemo(() => featureDiscoveryPrompt.render(context), [context]);

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [newEventIds, setNewEventIds] = useState<ReadonlySet<string>>(new Set());
  const [copiedAt, setCopiedAt] = useState<string | null>(null);
  // Mutated only from inside the poll effect below, never read during
  // render — a plain ref, not state, since a new poll result doesn't need
  // its own render pass beyond the `setEvents`/`setNewEventIds` it triggers.
  const seenIdsRef = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const result = await pollFeatureDiscoveryActivityAction(projectSlug, LOOKBACK_ISO);
      if (cancelled || !result) return;

      const previouslySeen = seenIdsRef.current;
      const incoming = result.events.filter((event) => !previouslySeen.has(event.id));
      seenIdsRef.current = new Set(result.events.map((event) => event.id));
      setEvents(result.events);
      if (incoming.length > 0) {
        setNewEventIds(new Set(incoming.map((event) => event.id)));
        window.setTimeout(() => setNewEventIds(new Set()), 1200);
        router.refresh(); // a fresh feature/update landed — refresh the records table below
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [projectSlug, router]);

  const agentEvents = useMemo(() => events.filter((event) => event.actorType === "claude"), [events]);

  const eventsSinceCopy = copiedAt
    ? agentEvents.filter((event) => new Date(event.createdAt).getTime() > new Date(copiedAt).getTime())
    : agentEvents;
  // `events` only ever grows while this panel is mounted, so this count is
  // monotonic — safe to derive directly each render instead of latching it
  // into its own state.
  const newFeatureCountSinceCopy = eventsSinceCopy.filter(
    (event) => event.action.startsWith("discovered "),
  ).length;

  const state: GenerationState = !copiedAt
    ? "idle"
    : eventsSinceCopy.length === 0
      ? "waiting"
      : newFeatureCountSinceCopy > 0
        ? "completed"
        : "incoming";

  return (
    <div className="flex flex-col gap-6">
      <CopyBlock
        label={context.focusFeature ? "Regeneration prompt" : "Discovery prompt"}
        value={prompt}
        description="Paste this into Claude Code or Claude Desktop, connected to this project over MCP. Claude analyzes the codebase and saves features directly here."
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
                `Claude saved ${newFeatureCountSinceCopy} feature${newFeatureCountSinceCopy === 1 ? "" : "s"} — ready to review below.`}
            </p>
            <p className="text-body-sm text-foreground-muted">
              {state === "waiting" && "This checks for real MCP activity every few seconds — no need to keep this open."}
              {state === "incoming" && "Recording what Claude sends before it appears in the table below."}
              {state === "completed" && "New and updated features default to Needs review."}
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
              const result = await pollFeatureDiscoveryActivityAction(projectSlug, LOOKBACK_ISO);
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
          emptyDescription="Once Claude runs the prompt above, discovery and review activity for this project appears here."
        />
      </div>
    </div>
  );
}
