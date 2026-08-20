"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { CopyBlock } from "@/components/shared/copy-block";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/input";
import {
  markIssueReadyForRetestAction,
  pollIssueActivityAction,
  recordIssueFixAction,
  updateIssueStatusAction,
  type RecordIssueFixValues,
} from "@/features/issues/actions";
import { idleState } from "@/lib/forms/action-state";
import type { IssueInvestigationContext } from "@/prompts/issue-investigation/prompt";
import { issueInvestigationPrompt } from "@/prompts/issue-investigation/prompt";
import type { IssueStatus } from "@/config/status.config";
import type { ActivityEvent } from "@/types/domain";

export type IssueInvestigationPanelProps = {
  projectSlug: string;
  issuePublicId: string;
  status: IssueStatus;
  fixNote?: string;
  context: IssueInvestigationContext;
};

type GenerationState = "idle" | "waiting" | "incoming" | "completed";

const POLL_INTERVAL_MS = 4000;
const LOOKBACK_ISO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

/**
 * The investigation prompt composer + copy action + live incoming-activity
 * states (mirrors `FeatureDiscoveryPanel`), plus the manual controls a human
 * uses without Claude: start investigating, record a fix, mark ready for
 * retest. Only shown for `open`/`investigating`/`fixInProgress`/`reopened` —
 * `readyForRetest` and beyond hand off to `CreateFocusedRerunForm` /
 * `RerunComparison`.
 */
export function IssueInvestigationPanel({ projectSlug, issuePublicId, status, fixNote, context }: IssueInvestigationPanelProps) {
  const router = useRouter();
  const prompt = useMemo(() => issueInvestigationPrompt.render(context), [context]);

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [newEventIds, setNewEventIds] = useState<ReadonlySet<string>>(new Set());
  const [copiedAt, setCopiedAt] = useState<string | null>(null);
  const seenIdsRef = useRef<ReadonlySet<string>>(new Set());

  const [fixState, fixFormAction, isFixPending] = useActionState(recordIssueFixAction, idleState<RecordIssueFixValues>());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const result = await pollIssueActivityAction(projectSlug, issuePublicId, LOOKBACK_ISO);
      if (cancelled || !result) return;

      const previouslySeen = seenIdsRef.current;
      const incoming = result.events.filter((event) => !previouslySeen.has(event.id));
      seenIdsRef.current = new Set(result.events.map((event) => event.id));
      setEvents(result.events);
      if (incoming.length > 0) {
        setNewEventIds(new Set(incoming.map((event) => event.id)));
        window.setTimeout(() => setNewEventIds(new Set()), 1200);
        router.refresh(); // a status change/fix note landed — refresh the page state above (badges, forms)
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [projectSlug, issuePublicId, router]);

  const eventsSinceCopy = copiedAt
    ? events.filter((event) => new Date(event.createdAt).getTime() > new Date(copiedAt).getTime())
    : [];
  const fixRecordedSinceCopy = eventsSinceCopy.some((event) => event.action.startsWith("recorded a fix"));

  const state: GenerationState = !copiedAt
    ? "idle"
    : eventsSinceCopy.length === 0
      ? "waiting"
      : fixRecordedSinceCopy
        ? "completed"
        : "incoming";

  return (
    <div className="flex flex-col gap-6">
      {status === "open" ? (
        <form action={updateIssueStatusAction}>
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="issueId" value={issuePublicId} />
          <input type="hidden" name="nextStatus" value="investigating" />
          <Button type="submit" intent="primary" size="sm">
            <Icon name="inProgress" size={14} />
            <span>Start investigating</span>
          </Button>
        </form>
      ) : null}

      <CopyBlock
        label="Investigation prompt"
        value={prompt}
        description="Paste this into Claude Code or Claude Desktop, connected to this project over MCP. Claude investigates, then records status and a fix note directly here."
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
              {state === "incoming" && "Claude is working this issue…"}
              {state === "completed" && "Claude recorded a fix — review it below."}
            </p>
            <p className="text-body-sm text-foreground-muted">
              {state === "waiting" && "This checks for real MCP activity every few seconds — no need to keep this open."}
              {state === "incoming" && "Recording status changes as they arrive."}
              {state === "completed" && "Mark this ready for retest once you've reviewed the fix."}
            </p>
          </div>
          {state === "waiting" ? <Badge tone="progress" icon="inProgress">Listening</Badge> : null}
        </div>
      ) : null}

      {(status === "investigating" || status === "fixInProgress" || status === "reopened") && (
        <form action={fixFormAction} className="flex flex-col gap-3 rounded-md border border-subtle bg-surface p-5">
          <h3 className="text-title-md text-foreground">Record the fix</h3>
          {fixState.status === "error" && fixState.formError ? (
            <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">{fixState.formError}</div>
          ) : null}
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="issueId" value={issuePublicId} />
          <Textarea
            name="fixNote"
            label="What was the root cause, and what changed?"
            hideLabel
            rows={4}
            defaultValue={fixState.values?.fixNote ?? fixNote}
            error={fixState.fieldErrors?.fixNote}
            placeholder="Describe the root cause and the fix that was applied."
          />
          <div>
            <Button type="submit" intent="secondary" size="sm" loading={isFixPending}>
              {fixNote ? "Update fix note" : "Record fix"}
            </Button>
          </div>
        </form>
      )}

      {status === "fixInProgress" && fixNote ? (
        <form action={markIssueReadyForRetestAction}>
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="issueId" value={issuePublicId} />
          <Button type="submit" intent="primary" size="sm">
            <Icon name="partial" size={14} />
            <span>Mark ready for retest</span>
          </Button>
        </form>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md text-foreground">Activity</h3>
          <RefreshButton
            label="Refresh activity"
            size="sm"
            onRefresh={async () => {
              const result = await pollIssueActivityAction(projectSlug, issuePublicId, LOOKBACK_ISO);
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
          emptyTitle="No activity yet"
          emptyDescription="Investigation and fix activity for this issue appears here."
        />
      </div>
    </div>
  );
}
