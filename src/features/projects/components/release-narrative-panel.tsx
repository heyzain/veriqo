import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ProjectRecords } from "@/server/services/project-service";

export type ReleaseNarrativePanelProps = {
  records: ProjectRecords;
};

/**
 * A calm, honest snapshot of where the project stands — every claim here
 * traces back to a real record (00-PRODUCT.md principle: "Evidence over
 * confidence theater"). This is not the full explainable release-confidence
 * engine (weights, blockers, coverage gaps) — that is Phase 9. Phase 2 only
 * needs a populated overview state that never states a number it can't back.
 */
export function ReleaseNarrativePanel({ records }: ReleaseNarrativePanelProps) {
  const { project, features, issues } = records;

  const approvedFeatures = features.filter((f) => f.status === "approved");
  const pendingFeatures = features.filter(
    (f) => f.status === "needsReview" || f.status === "changed" || f.status === "draft",
  );
  const openIssues = issues.filter((i) => i.status !== "verified");
  const verifiedIssues = issues.filter((i) => i.status === "verified");
  const latestVerifiedIssue = verifiedIssues[verifiedIssues.length - 1];

  const hasOpenIssues = openIssues.length > 0;
  const headlineBadgeTone = hasOpenIssues ? "progress" : "pass";
  const headlineBadgeLabel = hasOpenIssues
    ? `${openIssues.length} issue${openIssues.length === 1 ? "" : "s"} open`
    : "No open blockers";

  const headline =
    issues.length === 0
      ? `No issues have been reported yet, with ${approvedFeatures.length} of ${features.length} features approved.`
      : hasOpenIssues
        ? `${openIssues.length} open issue${openIssues.length === 1 ? "" : "s"} to resolve before ${project.name} is ready to release.`
        : `Every tracked issue is verified, with ${approvedFeatures.length} of ${features.length} features approved for coverage.`;

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-strong bg-surface p-6 shadow-sm">
      {/* Top Header & Release Decision Narrative */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">
              Project Snapshot
            </span>
            <Badge tone={headlineBadgeTone} icon={hasOpenIssues ? "inProgress" : "approved"}>
              {headlineBadgeLabel}
            </Badge>
          </div>

          <h2 className="text-title-lg font-serif text-foreground">{headline}</h2>

          <p className="text-body text-foreground-secondary leading-relaxed">
            {latestVerifiedIssue && (
              <>
                The most recent verified fix,{" "}
                <Link
                  href={`/projects/${project.slug}/issues`}
                  className="font-mono text-mono-sm font-semibold text-foreground hover:underline"
                >
                  {latestVerifiedIssue.publicId}
                </Link>{" "}
                (&ldquo;{latestVerifiedIssue.title}&rdquo;), passed its rerun.{" "}
              </>
            )}
            {pendingFeatures.length > 0 ? (
              <>
                {pendingFeatures.length} feature{pendingFeatures.length === 1 ? "" : "s"} (
                {pendingFeatures.map((f) => f.name).join(", ")}) still need review before coverage
                is complete.
              </>
            ) : (
              features.length > 0 && <>All discovered features have been reviewed.</>
            )}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
          <Button asChild intent="primary" size="lg">
            <Link href={`/projects/${project.slug}/test-runs`}>
              <Icon name="testRuns" size={16} />
              <span>Review Test Runs</span>
              <Icon name="chevronRight" size={16} />
            </Link>
          </Button>

          {pendingFeatures.length > 0 && (
            <Button asChild intent="secondary" size="md">
              <Link href={`/projects/${project.slug}/features`}>
                <Icon name="features" size={15} />
                <span>
                  Review {pendingFeatures.length} pending feature
                  {pendingFeatures.length === 1 ? "" : "s"}
                </span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Contributing Factors & Explainable Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-subtle">
        {/* Factor 1: Verified Fixes */}
        <div className="flex flex-col gap-1.5 rounded-md border border-subtle bg-inset/30 p-3.5">
          <div
            className={`flex items-center gap-2 font-medium text-body-sm ${
              verifiedIssues.length > 0 ? "text-pass" : "text-foreground"
            }`}
          >
            <Icon name="approved" size={16} />
            <span>
              {verifiedIssues.length} verified fix{verifiedIssues.length === 1 ? "" : "es"}
            </span>
          </div>
          <p className="text-body-sm text-foreground-secondary">
            {verifiedIssues.length > 0 ? (
              <>
                {verifiedIssues.map((issue, idx) => (
                  <span key={issue.id}>
                    {idx > 0 && ", "}
                    <Link
                      href={`/projects/${project.slug}/issues`}
                      className="font-mono text-foreground hover:underline"
                    >
                      {issue.publicId}
                    </Link>
                  </span>
                ))}{" "}
                verified via a passing rerun.
              </>
            ) : (
              "No fixes verified yet."
            )}
          </p>
        </div>

        {/* Factor 2: Feature Coverage */}
        <div className="flex flex-col gap-1.5 rounded-md border border-subtle bg-inset/30 p-3.5">
          <div className="flex items-center gap-2 text-foreground font-medium text-body-sm">
            <Icon name="features" size={16} className="text-foreground-muted" />
            <span>
              {approvedFeatures.length} / {features.length} Features Approved
            </span>
          </div>
          <p className="text-body-sm text-foreground-secondary">
            {pendingFeatures.length > 0 ? (
              <>
                {pendingFeatures.length} feature{pendingFeatures.length === 1 ? "" : "s"} (
                <Link
                  href={`/projects/${project.slug}/features`}
                  className="hover:underline text-foreground"
                >
                  {pendingFeatures.map((f) => f.name).join(", ")}
                </Link>
                ) remain in review.
              </>
            ) : (
              "All features have been reviewed."
            )}
          </p>
        </div>

        {/* Factor 3: Open Blockers */}
        <div className="flex flex-col gap-1.5 rounded-md border border-subtle bg-inset/30 p-3.5">
          <div
            className={`flex items-center gap-2 font-medium text-body-sm ${
              hasOpenIssues ? "text-fail" : "text-pass"
            }`}
          >
            <Icon name={hasOpenIssues ? "alert" : "check"} size={16} />
            <span>{openIssues.length} Open Blockers</span>
          </div>
          <p className="text-body-sm text-foreground-secondary">
            {hasOpenIssues ? (
              <>
                <Link
                  href={`/projects/${project.slug}/issues`}
                  className="hover:underline text-foreground"
                >
                  {openIssues.map((i) => i.publicId).join(", ")}
                </Link>{" "}
                still need investigation, a fix, or a verifying rerun.
              </>
            ) : (
              "No critical or high-severity failures blocking deployment."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
