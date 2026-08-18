import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productConfig } from "@/config/product.config";
import { getCurrentUser } from "@/server/services/auth-service";
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

  const isConnected = project.setupStepsCompleted >= 2;

  const mcpServerKey = productConfig.name.toLowerCase();
  const mcpEndpoint = `${productConfig.urls.app}/api/mcp/${project.slug}`;
  const claudeCodeCommand = `claude mcp add ${mcpServerKey} -- ${mcpEndpoint}`;
  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        [mcpServerKey]: {
          url: mcpEndpoint,
          env: {
            VERIQO_PROJECT_CODE: project.publicId,
          },
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Claude MCP Connection</h1>
            <Badge
              tone={isConnected ? "pass" : "neutral"}
              icon={isConnected ? "approved" : "planned"}
            >
              {isConnected ? "Connected" : "Setup required"}
            </Badge>
          </div>
          <p className="text-body text-foreground-secondary">
            Connect Claude Code or Claude Desktop to {project.name} through the Model Context Protocol.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild intent="secondary" size="md">
            <Link href={`/projects/${project.slug}/features`}>
              <span>Next: Discover features</span>
              <Icon name="chevronRight" size={14} />
            </Link>
          </Button>
        </div>
      </div>

      {/* Connection State Card */}
      <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-forest text-foreground-on-dark shadow-sm">
              <Icon name="mcp" size={20} />
            </div>
            <div>
              <h2 className="text-body font-medium text-foreground">Project MCP Endpoint</h2>
              <p className="text-mono-sm text-foreground-muted text-[12px]">
                Endpoint: {mcpEndpoint}
              </p>
            </div>
          </div>
          <Badge tone={isConnected ? "pass" : "neutral"}>
            {isConnected ? "Active" : "Ready to connect"}
          </Badge>
        </div>

        <div className="rounded-md border border-subtle bg-inset/40 p-4">
          <div className="flex flex-col gap-2">
            <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">
              Project Credential
            </span>
            <div className="flex items-center gap-2.5 rounded bg-surface border border-subtle px-3 py-2.5 text-body-sm text-foreground-secondary">
              <Icon name="info" size={15} className="text-foreground-muted shrink-0" />
              <span>
                A project-scoped credential is issued, masked by default, and revocable once
                Claude MCP connection setup is available.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Instructions Tabs */}
      <div className="flex flex-col gap-4">
        <h2 className="text-title-md text-foreground">Configuration Instructions</h2>

        <Tabs defaultValue="claude-code">
          <TabsList>
            <TabsTrigger value="claude-code">Claude Code CLI</TabsTrigger>
            <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
          </TabsList>

          <TabsContent value="claude-code" className="pt-4">
            <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-5">
              <div>
                <h3 className="text-body font-medium text-foreground">1. Run MCP command in terminal</h3>
                <p className="text-body-sm text-foreground-muted">
                  Execute this command in your project directory to register the Veriqo MCP server:
                </p>
              </div>

              <pre className="overflow-x-auto rounded-md bg-forest-0 p-4 text-mono-sm text-foreground-on-dark font-mono text-[13px]">
                {claudeCodeCommand}
              </pre>

              <div className="border-t border-subtle pt-3 text-body-sm text-foreground-secondary">
                Once connected, Claude can read test requirements, save discovered features, and submit execution results directly to {project.name}.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="claude-desktop" className="pt-4">
            <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-5">
              <div>
                <h3 className="text-body font-medium text-foreground">Claude Desktop Configuration</h3>
                <p className="text-body-sm text-foreground-muted">
                  Add this server configuration to your <code className="text-mono-sm">claude_desktop_config.json</code> file:
                </p>
              </div>

              <pre className="overflow-x-auto rounded-md bg-forest-0 p-4 text-mono-sm text-foreground-on-dark font-mono text-[13px]">
                {claudeDesktopConfig}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
