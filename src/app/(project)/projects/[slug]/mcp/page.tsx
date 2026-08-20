import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RefreshButton } from "@/components/shared/refresh-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { McpActivityList } from "@/features/mcp/components/mcp-activity-list";
import { McpConnectionSummary } from "@/features/mcp/components/mcp-connection-summary";
import { McpCredentialPanel } from "@/features/mcp/components/mcp-credential-panel";
import { McpSetupInstructions } from "@/features/mcp/components/mcp-setup-instructions";
import { getCurrentUser } from "@/server/services/auth-service";
import { getMcpConnectionSnapshot } from "@/server/services/mcp-service";
import { getProjectForOwner } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? await getProjectForOwner(slug, user) : null;
  return { title: project ? `${project.name} · Claude MCP` : "Claude MCP Setup" };
}

export default async function ProjectMcpPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const project = await getProjectForOwner(slug, user);
  if (!project) notFound();

  const snapshot = await getMcpConnectionSnapshot(project);
  const isConnected = snapshot.status === "connected";

  return (
    <div className="flex flex-col gap-8">
      {/* Header — the one dominant action is "generate a credential" until
          connected; once connected, it moves forward to feature discovery. */}
      <div className="flex flex-col gap-4 border-b border-subtle pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-title-lg text-foreground">Claude MCP Connection</h1>
          <p className="text-body text-foreground-secondary">
            Connect Claude Code or Claude Desktop to {project.name} through the Model Context
            Protocol.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <RefreshButton label="Refresh status" size="md" intent="secondary" />
          {isConnected ? (
            <Button asChild intent="primary" size="md">
              <Link href={`/projects/${project.slug}/features`}>
                <span>Next: Discover features</span>
                <Icon name="chevronRight" size={14} />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Credentials & Setup (~65%) */}
        <div className="flex flex-col gap-8 lg:col-span-8">
          <McpCredentialPanel projectSlug={project.slug} credential={snapshot.credential} />

          <div className="flex flex-col gap-4">
            <h2 className="text-title-md text-foreground">Setup / configuration</h2>
            <McpSetupInstructions projectSlug={project.slug} projectName={project.name} />
          </div>
        </div>

        {/* Right Column: Connection Health & Live Context (~35%, min 340px) */}
        <div className="flex flex-col gap-6 lg:col-span-4 lg:min-w-[340px]">
          {/* Connection Health & Target Context */}
          <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Icon name="mcp" size={16} className="text-ai" />
              <h2 className="text-title-md text-foreground">Connection health</h2>
            </div>

            <McpConnectionSummary
              status={snapshot.status}
              lastAttemptAt={snapshot.lastAttemptAt}
              lastAttemptError={snapshot.lastAttemptError}
              lastSuccessAt={snapshot.lastSuccessAt}
            />

            <div className="flex flex-col gap-2.5 border-t border-subtle pt-4 text-body-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Project</span>
                <span className="font-medium text-foreground">{project.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Environment</span>
                <span className="capitalize text-foreground">{project.environment}</span>
              </div>
              {project.repository ? (
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Repository</span>
                  <span className="font-mono text-[12px] text-foreground">{project.repository}</span>
                </div>
              ) : null}
              {project.appUrl ? (
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Target URL</span>
                  <a
                    href={project.appUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-action hover:underline line-clamp-1 max-w-[200px]"
                  >
                    {project.appUrl}
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          {/* Recent MCP Activity */}
          <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Icon name="activity" size={16} className="text-foreground-muted" />
                <h2 className="text-title-md text-foreground">Recent MCP activity</h2>
              </div>
              <Link
                href={`/projects/${project.slug}/activity`}
                className="text-body-sm text-action hover:underline"
              >
                All logs →
              </Link>
            </div>
            <McpActivityList activity={snapshot.recentActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}
