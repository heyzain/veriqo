"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EntityLink } from "@/components/shared/entity-link";
import { PriorityMark } from "@/components/shared/priority-mark";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import {
  approveTestCaseAction,
  archiveTestCaseAction,
  bulkApproveTestCasesAction,
  bulkArchiveTestCasesAction,
  duplicateTestCaseAction,
  restoreTestCaseAction,
} from "@/features/test-cases/actions";
import { TestCaseDiffView } from "@/features/test-cases/components/test-case-diff-view";
import { TestCaseEditDialog } from "@/features/test-cases/components/test-case-edit-dialog";
import { testCasePriorities, testCaseStatuses } from "@/config/status.config";
import type { Feature, Project, TestCase } from "@/types/domain";

export type TestCaseGrouping = "feature" | "status" | "priority" | "none";

export type TestCaseRecordTableProps = {
  project: Project;
  testCases: readonly TestCase[];
  allTestCases: readonly TestCase[];
  features: readonly Feature[];
  grouping: TestCaseGrouping;
  currentUrl: string;
  hasActiveFilters: boolean;
};

type Group = { key: string; label: string; testCases: TestCase[] };

function groupTestCases(testCases: readonly TestCase[], grouping: TestCaseGrouping, features: readonly Feature[]): Group[] {
  if (grouping === "none") return [{ key: "all", label: "", testCases: [...testCases] }];

  if (grouping === "feature") {
    const byFeatureId = new Map<string, TestCase[]>();
    for (const tc of testCases) {
      const bucket = byFeatureId.get(tc.featureId) ?? [];
      bucket.push(tc);
      byFeatureId.set(tc.featureId, bucket);
    }
    const groups: Group[] = [];
    for (const feature of features) {
      const bucket = byFeatureId.get(feature.id);
      if (bucket) groups.push({ key: feature.id, label: `${feature.publicId} — ${feature.name}`, testCases: bucket });
    }
    const unresolved = testCases.filter((tc) => !features.some((f) => f.id === tc.featureId));
    if (unresolved.length > 0) groups.push({ key: "unresolved", label: "Other", testCases: unresolved });
    return groups;
  }

  const groups = new Map<string, TestCase[]>();
  for (const tc of testCases) {
    const key = grouping === "status" ? testCaseStatuses[tc.status].label : testCasePriorities[tc.priority].label;
    const bucket = groups.get(key) ?? [];
    bucket.push(tc);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries()).map(([label, grouped]) => ({ key: label, label, testCases: grouped }));
}

/**
 * `redirect()` inside a directly-invoked Server Action still throws a
 * special `NEXT_REDIRECT` digest error client-side — this recognizes that
 * expected control-flow signal so only a genuine failure surfaces a toast.
 */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function submitAction(
  action: (formData: FormData) => Promise<void>,
  fields: Record<string, string | string[]>,
) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const item of value) formData.append(key, item);
    } else {
      formData.set(key, value);
    }
  }
  await action(formData);
}

export function TestCaseRecordTable({
  project,
  testCases,
  allTestCases,
  features,
  grouping,
  currentUrl,
  hasActiveFilters,
}: TestCaseRecordTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [activeBulkAction, setActiveBulkAction] = useState<"approve" | "archive" | null>(null);
  const [editing, setEditing] = useState<TestCase | null>(null);

  function toggleSelected(publicId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(publicId);
      else next.delete(publicId);
      return next;
    });
  }

  function runRowAction(action: (formData: FormData) => Promise<void>, publicId: string, errorTitle: string) {
    startTransition(async () => {
      try {
        await submitAction(action, { projectSlug: project.slug, testCaseId: publicId, redirectTo: currentUrl });
        setSelected((prev) => {
          if (!prev.has(publicId)) return prev;
          const next = new Set(prev);
          next.delete(publicId);
          return next;
        });
      } catch (error) {
        if (!isRedirectError(error)) {
          toast({ title: errorTitle, variant: "fail" });
        } else {
          setSelected((prev) => {
            if (!prev.has(publicId)) return prev;
            const next = new Set(prev);
            next.delete(publicId);
            return next;
          });
        }
      }
    });
  }

  function runBulkAction(
    type: "approve" | "archive",
    action: (formData: FormData) => Promise<void>,
    errorTitle: string,
  ) {
    if (selected.size === 0) return;
    setActiveBulkAction(type);
    startTransition(async () => {
      try {
        await submitAction(action, {
          projectSlug: project.slug,
          testCaseId: Array.from(selected),
          redirectTo: currentUrl,
        });
        setSelected(new Set());
      } catch (error) {
        if (!isRedirectError(error)) {
          toast({ title: errorTitle, variant: "fail" });
        } else {
          setSelected(new Set());
        }
      } finally {
        setActiveBulkAction(null);
      }
    });
  }

  if (testCases.length === 0) {
    return (
      <EmptyState
        icon="testCases"
        title={hasActiveFilters ? "No test cases match these filters" : "No test cases generated yet"}
        description={
          hasActiveFilters
            ? "Try a different search term or clear the filters above."
            : "Generate coverage from the Generate tab, for the full product or a selected set of approved features."
        }
        action={
          hasActiveFilters ? (
            <Button intent="secondary" onClick={() => router.replace(window.location.pathname)}>
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  const groups = groupTestCases(testCases, grouping, features);
  const addToRunHref = `/projects/${project.slug}/test-runs/new?testCaseIds=${Array.from(selected).join(",")}`;

  return (
    <div className="flex flex-col gap-4">
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-strong bg-inset/50 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-body-sm font-medium text-foreground">
              {selected.size} test case{selected.size === 1 ? "" : "s"} selected
            </span>
            <Button
              type="button"
              intent="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              intent="secondary"
              size="sm"
              loading={activeBulkAction === "approve"}
              disabled={isPending}
              onClick={() => runBulkAction("approve", bulkApproveTestCasesAction, "Couldn't approve the selected test cases")}
            >
              {activeBulkAction !== "approve" ? <Icon name="approved" size={14} /> : null}
              <span>{activeBulkAction === "approve" ? "Approving..." : "Approve"}</span>
            </Button>
            <Button asChild intent="secondary" size="sm">
              <Link href={addToRunHref}>
                <Icon name="testRuns" size={14} />
                <span>Add to run</span>
              </Link>
            </Button>
            <Button
              type="button"
              intent="ghost"
              size="sm"
              loading={activeBulkAction === "archive"}
              disabled={isPending}
              onClick={() => runBulkAction("archive", bulkArchiveTestCasesAction, "Couldn't archive the selected test cases")}
            >
              {activeBulkAction !== "archive" ? <Icon name="archived" size={14} /> : null}
              <span>{activeBulkAction === "archive" ? "Archiving..." : "Archive"}</span>
            </Button>
          </div>
        </div>
      ) : null}

      {groups.map((group) => {
        const groupTestCaseIds = group.testCases.map((tc) => tc.publicId);
        const isGroupAllSelected =
          groupTestCaseIds.length > 0 && groupTestCaseIds.every((id) => selected.has(id));
        const isGroupSomeSelected =
          !isGroupAllSelected && groupTestCaseIds.some((id) => selected.has(id));

        function toggleSelectGroup() {
          setSelected((prev) => {
            const next = new Set(prev);
            if (isGroupAllSelected) {
              for (const id of groupTestCaseIds) next.delete(id);
            } else {
              for (const id of groupTestCaseIds) next.add(id);
            }
            return next;
          });
        }

        return (
          <div key={group.key} className="flex flex-col gap-2">
            {group.label ? (
              <div className="flex items-center gap-2 pt-2">
                <h3 className="text-label-style text-foreground-muted uppercase tracking-wider">{group.label}</h3>
                <span className="text-mono-sm text-foreground-muted">({group.testCases.length})</span>
              </div>
            ) : null}

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border border-subtle bg-surface shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-subtle bg-inset/50 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                      <th className="w-12 px-4 py-3 text-center">
                        <Checkbox
                          label={group.label ? `Select all test cases in ${group.label}` : "Select all test cases"}
                          hideLabel
                          checked={isGroupAllSelected ? true : isGroupSomeSelected ? "indeterminate" : false}
                          onCheckedChange={toggleSelectGroup}
                        />
                      </th>
                    <th className="w-28 px-4 py-3 whitespace-nowrap">Code</th>
                    <th className="min-w-[260px] px-4 py-3">Test case</th>
                    {grouping !== "feature" ? <th className="w-36 px-4 py-3 whitespace-nowrap">Feature</th> : null}
                    <th className="w-32 px-4 py-3 whitespace-nowrap">Priority</th>
                    <th className="w-36 px-4 py-3 whitespace-nowrap">Review state</th>
                    <th className="w-36 px-4 py-3 whitespace-nowrap">Environments</th>
                    <th className="w-24 px-4 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {group.testCases.map((testCase) => {
                    const feature = features.find((f) => f.id === testCase.featureId);
                    const duplicateOf = testCase.possibleDuplicateOfId
                      ? allTestCases.find((tc) => tc.id === testCase.possibleDuplicateOfId)
                      : undefined;
                    const canApprove = testCase.status !== "ready" && testCase.status !== "archived";

                    return (
                      <tr key={testCase.id} className="transition-fast hover:bg-inset/30">
                        <td className="px-4 py-3.5 align-middle text-center">
                          <Checkbox
                            label={`Select ${testCase.publicId}`}
                            hideLabel
                            checked={selected.has(testCase.publicId)}
                            onCheckedChange={(checked) => toggleSelected(testCase.publicId, checked === true)}
                          />
                        </td>
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <Link
                            href={`/projects/${project.slug}/test-cases/${testCase.publicId}`}
                            className="inline-flex items-center rounded border border-subtle bg-inset/70 px-2 py-0.5 font-mono text-[12px] font-semibold text-foreground tracking-tight hover:bg-inset hover:text-foreground transition-fast"
                          >
                            {testCase.publicId}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/projects/${project.slug}/test-cases/${testCase.publicId}`}
                              className="text-body-sm font-medium text-foreground hover:underline"
                            >
                              {testCase.title}
                            </Link>
                            <span className="line-clamp-1 text-body-sm text-foreground-muted">
                              {testCase.expectedResult}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <SourceBadge source={testCase.createdBySource} />
                              {testCase.roles.length > 0 ? (
                                <span className="text-body-sm text-foreground-muted">{testCase.roles.join(", ")}</span>
                              ) : null}
                              {duplicateOf ? (
                                <Badge tone="partial" icon="alert">
                                  Possible duplicate of {duplicateOf.publicId}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        {grouping !== "feature" ? (
                          <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                            {feature ? (
                              <EntityLink
                                publicId={feature.publicId}
                                title={feature.name}
                                icon="features"
                                href={`/projects/${project.slug}/features/${feature.publicId}`}
                              />
                            ) : (
                              <span className="text-body-sm text-foreground-muted">—</span>
                            )}
                          </td>
                        ) : null}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <PriorityMark priority={testCase.priority} />
                        </td>
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <StatusBadge status={testCaseStatuses[testCase.status]} />
                        </td>
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          {testCase.environments.length > 0 ? (
                            <span className="text-body-sm text-foreground-muted">{testCase.environments.join(", ")}</span>
                          ) : (
                            <span className="text-body-sm text-foreground-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canApprove ? (
                              <IconButton
                                icon="approved"
                                label={`Approve ${testCase.publicId}`}
                                intent="ghost"
                                size="sm"
                                disabled={isPending}
                                onClick={() => runRowAction(approveTestCaseAction, testCase.publicId, "Couldn't approve the test case")}
                              />
                            ) : null}
                            <Menu>
                              <MenuTrigger asChild>
                                <IconButton icon="more" label={`More actions for ${testCase.publicId}`} intent="ghost" size="sm" />
                              </MenuTrigger>
                              <MenuContent align="end">
                                <MenuItem icon="eye" onSelect={() => router.push(`/projects/${project.slug}/test-cases/${testCase.publicId}`)}>
                                  View details
                                </MenuItem>
                                <MenuItem icon="draft" onSelect={() => setEditing(testCase)}>
                                  Edit details
                                </MenuItem>
                                <MenuItem
                                  icon="copy"
                                  onSelect={() =>
                                    runRowAction(duplicateTestCaseAction, testCase.publicId, "Couldn't duplicate the test case")
                                  }
                                >
                                  Duplicate
                                </MenuItem>
                                <MenuSeparator />
                                {testCase.status === "archived" ? (
                                  <MenuItem
                                    icon="changed"
                                    onSelect={() =>
                                      runRowAction(restoreTestCaseAction, testCase.publicId, "Couldn't restore the test case")
                                    }
                                  >
                                    Restore
                                  </MenuItem>
                                ) : (
                                  <MenuItem
                                    icon="archived"
                                    destructive
                                    onSelect={() =>
                                      runRowAction(archiveTestCaseAction, testCase.publicId, "Couldn't archive the test case")
                                    }
                                  >
                                    Archive
                                  </MenuItem>
                                )}
                              </MenuContent>
                            </Menu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {group.testCases.some((tc) => tc.previousSnapshot) ? (
              <div className="flex flex-col gap-3 border-t border-subtle p-4">
                {group.testCases
                  .filter((tc) => tc.previousSnapshot)
                  .map((tc) => (
                    <TestCaseDiffView key={tc.id} testCase={tc} />
                  ))}
              </div>
            ) : null}
          </div>

          {/* Mobile stacked rows */}
          <div className="flex flex-col gap-3 md:hidden">
            {group.testCases.map((testCase) => {
              const feature = features.find((f) => f.id === testCase.featureId);
              const canApprove = testCase.status !== "ready" && testCase.status !== "archived";

              return (
                <div key={testCase.id} className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        label={`Select ${testCase.publicId}`}
                        hideLabel
                        checked={selected.has(testCase.publicId)}
                        onCheckedChange={(checked) => toggleSelected(testCase.publicId, checked === true)}
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <Link
                          href={`/projects/${project.slug}/test-cases/${testCase.publicId}`}
                          className="text-body-sm font-semibold text-foreground hover:underline"
                        >
                          {testCase.publicId} — {testCase.title}
                        </Link>
                        {feature ? (
                          <span className="text-body-sm text-foreground-muted">
                            {feature.publicId} — {feature.name}
                          </span>
                        ) : null}
                        <p className="text-body-sm text-foreground-muted line-clamp-2">{testCase.expectedResult}</p>
                      </div>
                    </div>
                    {canApprove ? (
                      <IconButton
                        icon="approved"
                        label={`Approve ${testCase.publicId}`}
                        intent="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => runRowAction(approveTestCaseAction, testCase.publicId, "Couldn't approve the test case")}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={testCaseStatuses[testCase.status]} />
                    <PriorityMark priority={testCase.priority} />
                    <SourceBadge source={testCase.createdBySource} />
                  </div>
                  {testCase.previousSnapshot ? <TestCaseDiffView testCase={testCase} /> : null}
                  <div className="flex items-center gap-2 border-t border-subtle pt-3">
                    <Button type="button" intent="secondary" size="sm" onClick={() => setEditing(testCase)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      intent="ghost"
                      size="sm"
                      onClick={() =>
                        runRowAction(duplicateTestCaseAction, testCase.publicId, "Couldn't duplicate the test case")
                      }
                    >
                      Duplicate
                    </Button>
                    {testCase.status === "archived" ? (
                      <Button
                        type="button"
                        intent="ghost"
                        size="sm"
                        onClick={() => runRowAction(restoreTestCaseAction, testCase.publicId, "Couldn't restore the test case")}
                      >
                        Restore
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        intent="ghost"
                        size="sm"
                        onClick={() => runRowAction(archiveTestCaseAction, testCase.publicId, "Couldn't archive the test case")}
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    })}

      {editing ? (
        <TestCaseEditDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          projectSlug={project.slug}
          testCase={editing}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
