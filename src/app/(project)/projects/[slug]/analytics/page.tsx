import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { FailureByModuleChart } from "@/features/analytics/components/failure-by-module-chart";
import { HumanVsClaudeChart } from "@/features/analytics/components/human-vs-claude-chart";
import { PassRateTrendChart } from "@/features/analytics/components/pass-rate-trend-chart";
import { SeverityDistributionChart } from "@/features/analytics/components/severity-distribution-chart";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { formatDurationHours } from "@/lib/format/date";
import { getProjectAnalytics } from "@/server/services/analytics-service";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectRecords } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? await getProjectRecords(slug, user) : null;
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
  const records = await getProjectRecords(slug, user);
  if (!records) notFound();

  const { project } = records;
  const analytics = getProjectAnalytics(records);
  const { passRateTrend, failuresByModule, severityDistribution, fixVerification, reopenedRate, sourceBreakdown } = analytics;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-subtle pb-6">
        <h1 className="text-title-lg font-serif text-foreground">Analytics</h1>
        <p className="text-body text-foreground-secondary">
          Coverage, execution trends, and verification metrics for {project.name} — every figure here traces to real
          runs, results, and issues, and drills into the records behind it.
        </p>
      </div>

      {/* Pass rate trend */}
      <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Icon name="testRuns" size={16} className="text-foreground-muted" />
          <h2 className="text-title-md text-foreground">Pass rate trend</h2>
        </div>
        <p className="text-body-sm text-foreground-secondary">Share of results that passed, by completed run.</p>
        <PassRateTrendChart points={passRateTrend} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Icon name="features" size={16} className="text-foreground-muted" />
            <h2 className="text-title-md text-foreground">Failures by module</h2>
          </div>
          <p className="text-body-sm text-foreground-secondary">Which features have recorded the most failing results.</p>
          <FailureByModuleChart modules={failuresByModule} />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Icon name="issues" size={16} className="text-foreground-muted" />
            <h2 className="text-title-md text-foreground">Open issue severity</h2>
          </div>
          <p className="text-body-sm text-foreground-secondary">The severity mix of issues still open right now.</p>
          <SeverityDistributionChart severities={severityDistribution} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Fix-to-verification time"
          value={fixVerification.averageHours === null ? "—" : formatDurationHours(fixVerification.averageHours)}
          detail={
            fixVerification.verifiedCount === 0
              ? "No issue has been verified yet."
              : `Average across ${fixVerification.verifiedCount} verified issue${fixVerification.verifiedCount === 1 ? "" : "s"}, from open to verified.`
          }
          href={fixVerification.href}
          icon="approved"
        />
        <StatTile
          label="Reopened issue rate"
          value={reopenedRate.ratePercent === null ? "—" : `${reopenedRate.ratePercent}%`}
          detail={
            reopenedRate.resolvedCycleCount === 0
              ? "No issue has completed a retest cycle yet."
              : `${reopenedRate.reopenedCount} of ${reopenedRate.resolvedCycleCount} issue${reopenedRate.resolvedCycleCount === 1 ? "" : "s"} that reached a rerun needed more than one attempt.`
          }
          href={reopenedRate.href}
          icon="changed"
        />
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Icon name="claude" size={16} className="text-foreground-muted" />
          <h2 className="text-title-md text-foreground">Human vs. Claude-assisted results</h2>
        </div>
        <p className="text-body-sm text-foreground-secondary">Who recorded each test result — manual runs and Claude-assisted runs alike.</p>
        <HumanVsClaudeChart breakdown={sourceBreakdown} />
      </section>
    </div>
  );
}
