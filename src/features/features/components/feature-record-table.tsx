"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CoverageBar } from "@/components/shared/coverage-bar";
import { EntityLink } from "@/components/shared/entity-link";
import { RiskMark } from "@/components/shared/risk-mark";
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
  approveFeatureAction,
  archiveFeatureAction,
  bulkApproveFeaturesAction,
  bulkArchiveFeaturesAction,
  restoreFeatureAction,
} from "@/features/features/actions";
import { FeatureEditDialog } from "@/features/features/components/feature-edit-dialog";
import { FeatureMergeDialog } from "@/features/features/components/feature-merge-dialog";
import { FeatureRegenerateDialog } from "@/features/features/components/feature-regenerate-dialog";
import { featureStatuses } from "@/config/status.config";
import type { Feature, Issue, Project, TestCase } from "@/types/domain";

export type FeatureGrouping = "none" | "status" | "risk";

export type FeatureRecordTableProps = {
  project: Project;
  features: readonly Feature[];
  allFeatures: readonly Feature[];
  testCasesByFeature: Readonly<Record<string, readonly TestCase[]>>;
  issuesByFeature: Readonly<Record<string, readonly Issue[]>>;
  grouping: FeatureGrouping;
  currentUrl: string;
  hasActiveFilters: boolean;
};

const riskLabel: Record<Feature["risk"], string> = { high: "High risk", medium: "Medium risk", low: "Low risk" };

function groupFeatures(features: readonly Feature[], grouping: FeatureGrouping): { label: string; features: Feature[] }[] {
  if (grouping === "none") return [{ label: "", features: [...features] }];

  const groups = new Map<string, Feature[]>();
  for (const feature of features) {
    const key = grouping === "status" ? featureStatuses[feature.status].label : riskLabel[feature.risk];
    const bucket = groups.get(key) ?? [];
    bucket.push(feature);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries()).map(([label, groupedFeatures]) => ({ label, features: groupedFeatures }));
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

export function FeatureRecordTable({
  project,
  features,
  allFeatures,
  testCasesByFeature,
  issuesByFeature,
  grouping,
  currentUrl,
  hasActiveFilters,
}: FeatureRecordTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [activeBulkAction, setActiveBulkAction] = useState<"approve" | "archive" | null>(null);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [merging, setMerging] = useState<Feature | null>(null);
  const [regenerating, setRegenerating] = useState<Feature | null>(null);

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
        await submitAction(action, { projectSlug: project.slug, featureId: publicId, redirectTo: currentUrl });
        setSelected((prev) => {
          if (!prev.has(publicId)) return prev;
          const next = new Set(prev);
          next.delete(publicId);
          return next;
        });
      } catch (error) {
        // `redirect()` inside the action throws by design — only report a real failure.
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
          featureId: Array.from(selected),
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

  if (features.length === 0) {
    return (
      <EmptyState
        icon="features"
        title={hasActiveFilters ? "No features match these filters" : "No features discovered yet"}
        description={
          hasActiveFilters
            ? "Try a different search term or clear the filters above."
            : "Copy the discovery prompt above into Claude Code or Claude Desktop to build a structured feature inventory."
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

  const groups = groupFeatures(features, grouping);

  return (
    <div className="flex flex-col gap-4">
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-strong bg-inset/50 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-body-sm font-medium text-foreground">
              {selected.size} feature{selected.size === 1 ? "" : "s"} selected
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
              onClick={() => runBulkAction("approve", bulkApproveFeaturesAction, "Couldn't approve the selected features")}
            >
              {activeBulkAction !== "approve" ? <Icon name="approved" size={14} /> : null}
              <span>{activeBulkAction === "approve" ? "Approving..." : "Approve"}</span>
            </Button>
            <Button
              type="button"
              intent="ghost"
              size="sm"
              loading={activeBulkAction === "archive"}
              disabled={isPending}
              onClick={() => runBulkAction("archive", bulkArchiveFeaturesAction, "Couldn't archive the selected features")}
            >
              {activeBulkAction !== "archive" ? <Icon name="archived" size={14} /> : null}
              <span>{activeBulkAction === "archive" ? "Archiving..." : "Archive"}</span>
            </Button>
          </div>
        </div>
      ) : null}

      {groups.map((group) => {
        const groupFeatureIds = group.features.map((f) => f.publicId);
        const isGroupAllSelected =
          groupFeatureIds.length > 0 && groupFeatureIds.every((id) => selected.has(id));
        const isGroupSomeSelected =
          !isGroupAllSelected && groupFeatureIds.some((id) => selected.has(id));

        function toggleSelectGroup() {
          setSelected((prev) => {
            const next = new Set(prev);
            if (isGroupAllSelected) {
              for (const id of groupFeatureIds) next.delete(id);
            } else {
              for (const id of groupFeatureIds) next.add(id);
            }
            return next;
          });
        }

        return (
          <div key={group.label || "all"} className="flex flex-col gap-2">
            {group.label ? (
              <div className="flex items-center gap-2 pt-2">
                <h3 className="text-label-style text-foreground-muted uppercase tracking-wider">{group.label}</h3>
                <span className="text-mono-sm text-foreground-muted">({group.features.length})</span>
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
                          label={group.label ? `Select all features in ${group.label}` : "Select all features"}
                          hideLabel
                          checked={isGroupAllSelected ? true : isGroupSomeSelected ? "indeterminate" : false}
                          onCheckedChange={toggleSelectGroup}
                        />
                      </th>
                    <th className="w-28 px-4 py-3 whitespace-nowrap">Code</th>
                    <th className="min-w-[280px] px-4 py-3">Feature</th>
                    <th className="w-32 px-4 py-3 whitespace-nowrap">Risk</th>
                    <th className="w-36 px-4 py-3 whitespace-nowrap">Review state</th>
                    <th className="w-36 px-4 py-3 whitespace-nowrap">Coverage</th>
                    <th className="w-28 px-4 py-3 whitespace-nowrap">Issues</th>
                    <th className="w-24 px-4 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {group.features.map((feature) => {
                    const testCases = testCasesByFeature[feature.id] ?? [];
                    const issues = issuesByFeature[feature.id] ?? [];
                    const duplicateOf = feature.possibleDuplicateOfId
                      ? allFeatures.find((f) => f.id === feature.possibleDuplicateOfId)
                      : undefined;
                    const canApprove = feature.status === "needsReview" || feature.status === "changed" || feature.status === "draft";
                    const canMerge = feature.status !== "archived" && allFeatures.some((f) => f.id !== feature.id && f.status !== "archived");

                    return (
                      <tr key={feature.id} className="transition-fast hover:bg-inset/30">
                        <td className="px-4 py-3.5 align-middle text-center">
                          <Checkbox
                            label={`Select ${feature.publicId}`}
                            hideLabel
                            checked={selected.has(feature.publicId)}
                            onCheckedChange={(checked) => toggleSelected(feature.publicId, checked === true)}
                          />
                        </td>
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <Link
                            href={`/projects/${project.slug}/features/${feature.publicId}`}
                            className="inline-flex items-center rounded border border-subtle bg-inset/70 px-2 py-0.5 font-mono text-[12px] font-semibold text-foreground tracking-tight hover:bg-inset hover:text-foreground transition-fast"
                          >
                            {feature.publicId}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/projects/${project.slug}/features/${feature.publicId}`}
                              className="text-body-sm font-medium text-foreground hover:underline"
                            >
                              {feature.name}
                            </Link>
                            <span className="line-clamp-1 text-body-sm text-foreground-muted">{feature.description}</span>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <SourceBadge source={feature.createdBySource} />
                              {duplicateOf ? (
                                <Badge tone="partial" icon="alert">
                                  Possible duplicate of {duplicateOf.publicId}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <RiskMark risk={feature.risk} />
                        </td>
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <StatusBadge status={featureStatuses[feature.status]} />
                        </td>
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <CoverageBar testCases={testCases} />
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {issues.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {issues.map((issue) => (
                                <EntityLink key={issue.id} publicId={issue.publicId} icon="issues" />
                              ))}
                            </div>
                          ) : (
                            <span className="text-body-sm text-foreground-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canApprove ? (
                              <IconButton
                                icon="approved"
                                label={`Approve ${feature.publicId}`}
                                intent="ghost"
                                size="sm"
                                disabled={isPending}
                                onClick={() => runRowAction(approveFeatureAction, feature.publicId, "Couldn't approve the feature")}
                              />
                            ) : null}
                            <Menu>
                              <MenuTrigger asChild>
                                <IconButton icon="more" label={`More actions for ${feature.publicId}`} intent="ghost" size="sm" />
                              </MenuTrigger>
                              <MenuContent align="end">
                                <MenuItem icon="draft" onSelect={() => setEditing(feature)}>
                                  Edit details
                                </MenuItem>
                                <MenuItem icon="changed" onSelect={() => setRegenerating(feature)}>
                                  Regenerate
                                </MenuItem>
                                {canMerge ? (
                                  <MenuItem icon="merge" onSelect={() => setMerging(feature)}>
                                    Merge…
                                  </MenuItem>
                                ) : null}
                                <MenuSeparator />
                                {feature.status === "archived" ? (
                                  <MenuItem
                                    icon="changed"
                                    onSelect={() =>
                                      runRowAction(restoreFeatureAction, feature.publicId, "Couldn't restore the feature")
                                    }
                                  >
                                    Restore
                                  </MenuItem>
                                ) : (
                                  <MenuItem
                                    icon="archived"
                                    destructive
                                    onSelect={() =>
                                      runRowAction(archiveFeatureAction, feature.publicId, "Couldn't archive the feature")
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
          </div>

          {/* Mobile stacked rows */}
          <div className="flex flex-col gap-3 md:hidden">
            {group.features.map((feature) => {
              const testCases = testCasesByFeature[feature.id] ?? [];
              const issues = issuesByFeature[feature.id] ?? [];
              const canApprove = feature.status === "needsReview" || feature.status === "changed" || feature.status === "draft";

              return (
                <div key={feature.id} className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        label={`Select ${feature.publicId}`}
                        hideLabel
                        checked={selected.has(feature.publicId)}
                        onCheckedChange={(checked) => toggleSelected(feature.publicId, checked === true)}
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <Link
                          href={`/projects/${project.slug}/features/${feature.publicId}`}
                          className="text-body-sm font-semibold text-foreground hover:underline"
                        >
                          {feature.publicId} — {feature.name}
                        </Link>
                        <p className="text-body-sm text-foreground-muted line-clamp-2">{feature.description}</p>
                      </div>
                    </div>
                    {canApprove ? (
                      <IconButton
                        icon="approved"
                        label={`Approve ${feature.publicId}`}
                        intent="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => runRowAction(approveFeatureAction, feature.publicId, "Couldn't approve the feature")}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={featureStatuses[feature.status]} />
                    <RiskMark risk={feature.risk} />
                    <SourceBadge source={feature.createdBySource} />
                  </div>
                  <CoverageBar testCases={testCases} />
                  {issues.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {issues.map((issue) => (
                        <EntityLink key={issue.id} publicId={issue.publicId} icon="issues" />
                      ))}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 border-t border-subtle pt-3">
                    <Button type="button" intent="secondary" size="sm" onClick={() => setEditing(feature)}>
                      Edit
                    </Button>
                    {feature.status === "archived" ? (
                      <Button
                        type="button"
                        intent="ghost"
                        size="sm"
                        onClick={() => runRowAction(restoreFeatureAction, feature.publicId, "Couldn't restore the feature")}
                      >
                        Restore
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        intent="ghost"
                        size="sm"
                        onClick={() => runRowAction(archiveFeatureAction, feature.publicId, "Couldn't archive the feature")}
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
        <FeatureEditDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          projectSlug={project.slug}
          feature={editing}
          onSaved={() => router.refresh()}
        />
      ) : null}

      {merging ? (
        <FeatureMergeDialog
          open={Boolean(merging)}
          onOpenChange={(open) => !open && setMerging(null)}
          projectSlug={project.slug}
          feature={merging}
          candidates={allFeatures.filter(
            (f) => f.id !== merging.id && f.status !== "archived",
          ).sort((a, b) => (a.id === merging.possibleDuplicateOfId ? -1 : b.id === merging.possibleDuplicateOfId ? 1 : 0))}
          onMerged={() => router.refresh()}
        />
      ) : null}

      {regenerating ? (
        <FeatureRegenerateDialog
          open={Boolean(regenerating)}
          onOpenChange={(open) => !open && setRegenerating(null)}
          projectSlug={project.slug}
          featureId={regenerating.publicId}
          context={{
            project: {
              name: project.name,
              description: project.description,
              appUrl: project.appUrl,
              environment: project.environment,
              repository: project.repository,
            },
            existingFeatures: allFeatures.map((f) => ({ publicId: f.publicId, name: f.name, status: featureStatuses[f.status].label })),
            focusFeature: { publicId: regenerating.publicId, name: regenerating.name, description: regenerating.description },
          }}
        />
      ) : null}
    </div>
  );
}
