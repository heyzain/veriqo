import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectRecords } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? getProjectRecords(slug, user) : null;
  return { title: records ? `${records.project.name} · Analytics` : "Analytics" };
}

export default async function ProjectAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const records = getProjectRecords(slug, user);
  if (!records) notFound();

  const { project, features, testRuns, issues } = records;
  const approvedFeatures = features.filter((f) => f.status === "approved");
  const coveragePercent = features.length > 0 ? Math.round((approvedFeatures.length / features.length) * 100) : 0;
  const verifiedIssues = issues.filter((i) => i.status === "verified");
  const verifiedRatePercent =
    issues.length > 0 ? Math.round((verifiedIssues.length / issues.length) * 100) : null;

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">QA Analytics & Metrics</h1>
          </div>
          <p className="text-body text-foreground-secondary">
            Coverage, execution trends, and verification metrics for {project.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild intent="secondary" size="md">
            <Link href={`/projects/${project.slug}`}>
              <Icon name="overview" size={15} />
              <span>Project Overview</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="flex flex-col gap-2 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
          <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">
            Approved Feature Coverage
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-display-md font-serif text-foreground">{coveragePercent}%</span>
            <span className="text-mono-sm text-foreground-muted">
              ({approvedFeatures.length}/{features.length})
            </span>
          </div>
          <p className="text-body-sm text-foreground-secondary">
            Features reviewed and approved for active test generation.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
          <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">
            Verified Resolution Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-display-md font-serif text-pass">
              {verifiedRatePercent === null ? "—" : `${verifiedRatePercent}%`}
            </span>
            <span className="text-mono-sm text-foreground-muted">
              ({verifiedIssues.length}/{issues.length})
            </span>
          </div>
          <p className="text-body-sm text-foreground-secondary">
            {issues.length === 0
              ? "No issues have been recorded yet."
              : "Issues verified through an applicable passing rerun."}
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
          <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">
            Active Test Runs
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-display-md font-serif text-foreground">{testRuns.length}</span>
            <span className="text-mono-sm text-foreground-muted">recorded</span>
          </div>
          <p className="text-body-sm text-foreground-secondary">
            Total runs and focused reruns conducted for candidate builds.
          </p>
        </div>
      </div>
    </div>
  );
}
