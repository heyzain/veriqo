"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import {
  approveTestCaseAction,
  archiveTestCaseAction,
  duplicateTestCaseAction,
  restoreTestCaseAction,
} from "@/features/test-cases/actions";
import { TestCaseEditDialog } from "@/features/test-cases/components/test-case-edit-dialog";
import type { Project, TestCase } from "@/types/domain";

export type TestCaseDetailActionsProps = {
  project: Project;
  testCase: TestCase;
};

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function TestCaseDetailActions({ project, testCase }: TestCaseDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const canApprove = testCase.status !== "ready" && testCase.status !== "archived";
  const isArchived = testCase.status === "archived";
  const addToRunHref = `/projects/${project.slug}/test-runs/new?testCaseIds=${testCase.publicId}`;

  function run(action: (formData: FormData) => Promise<void>, errorTitle: string) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("projectSlug", project.slug);
        formData.set("testCaseId", testCase.publicId);
        formData.set("redirectTo", `/projects/${project.slug}/test-cases/${testCase.publicId}`);
        await action(formData);
      } catch (error) {
        if (!isRedirectError(error)) toast({ title: errorTitle, variant: "fail" });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canApprove ? (
        <Button
          type="button"
          intent="primary"
          size="sm"
          disabled={isPending}
          onClick={() => run(approveTestCaseAction, "Couldn't approve the test case")}
        >
          <Icon name="approved" size={14} />
          <span>Approve</span>
        </Button>
      ) : null}

      <Button type="button" intent="secondary" size="sm" onClick={() => setEditing(true)}>
        <Icon name="draft" size={14} />
        <span>Edit</span>
      </Button>

      {!isArchived ? (
        <Button asChild intent="secondary" size="sm">
          <Link href={addToRunHref}>
            <Icon name="testRuns" size={14} />
            <span>Add to run</span>
          </Link>
        </Button>
      ) : null}

      <Button
        type="button"
        intent="secondary"
        size="sm"
        disabled={isPending}
        onClick={() => run(duplicateTestCaseAction, "Couldn't duplicate the test case")}
      >
        <Icon name="copy" size={14} />
        <span>Duplicate</span>
      </Button>

      {isArchived ? (
        <Button
          type="button"
          intent="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => run(restoreTestCaseAction, "Couldn't restore the test case")}
        >
          <Icon name="changed" size={14} />
          <span>Restore</span>
        </Button>
      ) : (
        <Button
          type="button"
          intent="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => run(archiveTestCaseAction, "Couldn't archive the test case")}
        >
          <Icon name="archived" size={14} />
          <span>Archive</span>
        </Button>
      )}

      {editing ? (
        <TestCaseEditDialog
          open={editing}
          onOpenChange={setEditing}
          projectSlug={project.slug}
          testCase={testCase}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
