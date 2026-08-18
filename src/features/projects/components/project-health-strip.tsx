import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { mcpConnectionStatuses, type McpConnectionStatus } from "@/config/status.config";
import type { ProjectSummary } from "@/server/services/project-service";

export type ProjectHealthStripProps = {
  summary: ProjectSummary;
  mcpStatus: McpConnectionStatus;
};

export function ProjectHealthStrip({ summary, mcpStatus }: ProjectHealthStripProps) {
  const { project } = summary;
  const mcpStatusDef = mcpConnectionStatuses[mcpStatus];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {/* 1. Features */}
      <Link
        href={`/projects/${project.slug}/features`}
        className="group flex flex-col gap-1 rounded-md border border-subtle bg-surface p-3.5 transition-fast hover:border-strong hover:bg-inset/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">Features</span>
          <Icon name="features" size={15} className="text-foreground-muted group-hover:text-foreground transition-fast" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-title-md font-semibold text-foreground">
            {summary.featuresCount}
          </span>
          <span className="text-mono-sm text-[11px] text-foreground-muted">
            {summary.approvedFeaturesCount} approved
          </span>
        </div>
      </Link>

      {/* 2. Test Cases */}
      <Link
        href={`/projects/${project.slug}/test-cases`}
        className="group flex flex-col gap-1 rounded-md border border-subtle bg-surface p-3.5 transition-fast hover:border-strong hover:bg-inset/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">Test Cases</span>
          <Icon name="testCases" size={15} className="text-foreground-muted group-hover:text-foreground transition-fast" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-title-md font-semibold text-foreground">
            {summary.testCasesCount}
          </span>
          <span className="text-mono-sm text-[11px] text-foreground-muted">
            active
          </span>
        </div>
      </Link>

      {/* 3. Test Runs */}
      <Link
        href={`/projects/${project.slug}/test-runs`}
        className="group flex flex-col gap-1 rounded-md border border-subtle bg-surface p-3.5 transition-fast hover:border-strong hover:bg-inset/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">Test Runs</span>
          <Icon name="testRuns" size={15} className="text-foreground-muted group-hover:text-foreground transition-fast" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-title-md font-semibold text-foreground">
            {summary.testRunsCount}
          </span>
          <span className="text-mono-sm text-[11px] text-foreground-muted">
            runs recorded
          </span>
        </div>
      </Link>

      {/* 4. Issues & Verified Fixes */}
      <Link
        href={`/projects/${project.slug}/issues`}
        className="group flex flex-col gap-1 rounded-md border border-subtle bg-surface p-3.5 transition-fast hover:border-strong hover:bg-inset/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">Issues</span>
          <Icon name="issues" size={15} className="text-foreground-muted group-hover:text-foreground transition-fast" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-title-md font-semibold text-foreground">
            {summary.issuesCount}
          </span>
          <span className="text-mono-sm text-[11px] text-pass">
            {summary.verifiedIssuesCount} verified
          </span>
        </div>
      </Link>

      {/* 5. Claude MCP Integration */}
      <Link
        href={`/projects/${project.slug}/mcp`}
        className="group col-span-2 sm:col-span-4 lg:col-span-1 flex flex-col gap-1 rounded-md border border-subtle bg-surface p-3.5 transition-fast hover:border-strong hover:bg-inset/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">Claude MCP</span>
          <Icon name="mcp" size={15} className="text-foreground-muted group-hover:text-foreground transition-fast" />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={mcpStatusDef.tone} icon={mcpStatusDef.icon}>
            {mcpStatusDef.label}
          </Badge>
        </div>
      </Link>
    </div>
  );
}
