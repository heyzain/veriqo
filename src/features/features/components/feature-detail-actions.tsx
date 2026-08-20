"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import {
  approveFeatureAction,
  archiveFeatureAction,
  restoreFeatureAction,
} from "@/features/features/actions";
import { FeatureEditDialog } from "@/features/features/components/feature-edit-dialog";
import { FeatureMergeDialog } from "@/features/features/components/feature-merge-dialog";
import { FeatureRegenerateDialog } from "@/features/features/components/feature-regenerate-dialog";
import { featureStatuses } from "@/config/status.config";
import type { Feature, Project } from "@/types/domain";

export type FeatureDetailActionsProps = {
  project: Project;
  feature: Feature;
  allFeatures: readonly Feature[];
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

/**
 * The "one dominant action per view" action row for a feature's detail page
 * — approve/edit/merge/archive/regenerate (Phase 4 acceptance), each also
 * available from the records table. Kept as its own client component so the
 * rest of the detail page stays a plain Server Component.
 */
export function FeatureDetailActions({ project, feature, allFeatures }: FeatureDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const canApprove = feature.status === "needsReview" || feature.status === "changed" || feature.status === "draft";
  const isArchived = feature.status === "archived";
  const mergeCandidates = allFeatures.filter((f) => f.id !== feature.id && f.status !== "archived");

  function run(action: (formData: FormData) => Promise<void>, errorTitle: string) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("projectSlug", project.slug);
        formData.set("featureId", feature.publicId);
        formData.set("redirectTo", `/projects/${project.slug}/features/${feature.publicId}`);
        await action(formData);
      } catch (error) {
        if (!isRedirectError(error)) toast({ title: errorTitle, variant: "fail" });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canApprove ? (
        <Button type="button" intent="primary" size="sm" disabled={isPending} onClick={() => run(approveFeatureAction, "Couldn't approve the feature")}>
          <Icon name="approved" size={14} />
          <span>Approve</span>
        </Button>
      ) : null}
      {feature.status === "approved" ? (
        <Button asChild intent="secondary" size="sm">
          <Link href={`/projects/${project.slug}/test-cases?tab=generate&scope=selected&featureId=${feature.publicId}`}>
            <Icon name="testCases" size={14} />
            <span>Generate test cases</span>
          </Link>
        </Button>
      ) : null}
      <Button type="button" intent="secondary" size="sm" onClick={() => setEditing(true)}>
        <Icon name="draft" size={14} />
        <span>Edit</span>
      </Button>
      <Button type="button" intent="secondary" size="sm" onClick={() => setRegenerating(true)}>
        <Icon name="changed" size={14} />
        <span>Regenerate</span>
      </Button>
      {!isArchived && mergeCandidates.length > 0 ? (
        <Button type="button" intent="secondary" size="sm" onClick={() => setMerging(true)}>
          <Icon name="merge" size={14} />
          <span>Merge…</span>
        </Button>
      ) : null}
      {isArchived ? (
        <Button type="button" intent="ghost" size="sm" disabled={isPending} onClick={() => run(restoreFeatureAction, "Couldn't restore the feature")}>
          <Icon name="changed" size={14} />
          <span>Restore</span>
        </Button>
      ) : (
        <Button type="button" intent="ghost" size="sm" disabled={isPending} onClick={() => run(archiveFeatureAction, "Couldn't archive the feature")}>
          <Icon name="archived" size={14} />
          <span>Archive</span>
        </Button>
      )}

      {editing ? (
        <FeatureEditDialog
          open={editing}
          onOpenChange={setEditing}
          projectSlug={project.slug}
          feature={feature}
          onSaved={() => router.refresh()}
        />
      ) : null}
      {merging ? (
        <FeatureMergeDialog
          open={merging}
          onOpenChange={setMerging}
          projectSlug={project.slug}
          feature={feature}
          candidates={mergeCandidates.sort((a, b) =>
            a.id === feature.possibleDuplicateOfId ? -1 : b.id === feature.possibleDuplicateOfId ? 1 : 0,
          )}
          onMerged={() => router.push(`/projects/${project.slug}/features`)}
        />
      ) : null}
      {regenerating ? (
        <FeatureRegenerateDialog
          open={regenerating}
          onOpenChange={setRegenerating}
          projectSlug={project.slug}
          featureId={feature.publicId}
          context={{
            project: {
              name: project.name,
              description: project.description,
              appUrl: project.appUrl,
              environment: project.environment,
              repository: project.repository,
            },
            existingFeatures: allFeatures.map((f) => ({
              publicId: f.publicId,
              name: f.name,
              status: featureStatuses[f.status].label,
            })),
            focusFeature: { publicId: feature.publicId, name: feature.name, description: feature.description },
          }}
        />
      ) : null}
    </div>
  );
}
