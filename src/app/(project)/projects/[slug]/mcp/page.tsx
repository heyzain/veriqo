import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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
  const project = user ? getProjectForOwner(slug, user) : null;
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
  const project = getProjectForOwner(slug, user);
  if (!project) notFound();

  const snapshot = getMcpConnectionSnapshot(project);
  const isConnected = snapshot.status === "connected";

  return (
    <div className="flex max-w-4xl flex-col gap-8">
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

        {isConnected ? (
          <Button asChild intent="primary" size="md">
            <Link href={`/projects/${project.slug}/features`}>
              <span>Next: Discover features</span>
              <Icon name="chevronRight" size={14} />
            </Link>
          </Button>
        ) : null}
      </div>

      <McpConnectionSummary
        status={snapshot.status}
        lastAttemptAt={snapshot.lastAttemptAt}
        lastAttemptError={snapshot.lastAttemptError}
        lastSuccessAt={snapshot.lastSuccessAt}
      />

      <McpCredentialPanel projectSlug={project.slug} credential={snapshot.credential} />

      <div className="flex flex-col gap-4">
        <h2 className="text-title-md text-foreground">Configuration instructions</h2>
        <McpSetupInstructions projectSlug={project.slug} projectName={project.name} />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-6">
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Icon name="mcp" size={16} className="text-foreground-muted" />
            <h2 className="text-title-md text-foreground">Recent MCP activity</h2>
          </div>
          <Link
            href={`/projects/${project.slug}/activity`}
            className="text-body-sm text-action hover:underline"
          >
            View full activity log →
          </Link>
        </div>
        <McpActivityList activity={snapshot.recentActivity} />
      </div>
    </div>
  );
}
