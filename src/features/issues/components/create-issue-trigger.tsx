"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CreateIssueDialog } from "@/features/issues/components/create-issue-dialog";
import type { RiskLevel } from "@/types/domain";

export type CreateIssueTriggerProps = {
  projectSlug: string;
  testRunPublicId: string;
  testCasePublicId: string;
  defaultTitle: string;
  defaultSeverity: RiskLevel;
  /** When a result already has an issue, this renders a link to it instead of a create trigger. */
  existingIssuePublicId?: string;
};

/**
 * The "Create issue" entry point on a failed/partial/blocked result row
 * (Test Run detail page) — or, if one already exists for that result, a
 * link straight to it, so the same failure never spawns a second issue from
 * the UI either (`issue-service.createIssueFromFailedResult` is already
 * idempotent server-side; this just avoids offering the button at all).
 */
export function CreateIssueTrigger({
  projectSlug,
  testRunPublicId,
  testCasePublicId,
  defaultTitle,
  defaultSeverity,
  existingIssuePublicId,
}: CreateIssueTriggerProps) {
  const [open, setOpen] = useState(false);

  if (existingIssuePublicId) {
    return (
      <Button asChild intent="secondary" size="sm">
        <Link href={`/projects/${projectSlug}/issues/${existingIssuePublicId}`}>
          <Icon name="issues" size={14} />
          <span>View {existingIssuePublicId}</span>
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button type="button" intent="secondary" size="sm" onClick={() => setOpen(true)}>
        <Icon name="issues" size={14} />
        <span>Create issue</span>
      </Button>
      <CreateIssueDialog
        open={open}
        onOpenChange={setOpen}
        projectSlug={projectSlug}
        testRunPublicId={testRunPublicId}
        testCasePublicId={testCasePublicId}
        defaultTitle={defaultTitle}
        defaultSeverity={defaultSeverity}
      />
    </>
  );
}
