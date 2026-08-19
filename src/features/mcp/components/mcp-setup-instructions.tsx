"use client";

import { useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productConfig } from "@/config/product.config";
import { McpCommandBlock } from "@/features/mcp/components/mcp-command-block";

export type McpSetupInstructionsProps = {
  projectSlug: string;
  projectName: string;
};

const desktopConfigPaths = [
  {
    value: "macos",
    label: "macOS",
    path: "~/Library/Application Support/Claude/claude_desktop_config.json",
  },
  { value: "windows", label: "Windows", path: "%APPDATA%\\Claude\\claude_desktop_config.json" },
  { value: "linux", label: "Linux", path: "~/.config/Claude/claude_desktop_config.json" },
] as const;

/**
 * Platform setup tabs (01-DESIGN-SYSTEM.md, "MCP setup" — "platform tabs,
 * readable command blocks"). Claude Code / Claude Desktop is the primary
 * split; Claude Desktop additionally varies by OS config-file location, so
 * that gets its own segmented control rather than a third top-level tab.
 * Commands use a `<YOUR_MCP_CREDENTIAL>` placeholder — the real secret is
 * only ever shown once, in the reveal dialog above.
 */
export function McpSetupInstructions({ projectSlug, projectName }: McpSetupInstructionsProps) {
  const [os, setOs] = useState<string>("macos");

  const mcpServerKey = productConfig.name.toLowerCase();
  const mcpEndpoint = `${productConfig.urls.app}/api/mcp/${projectSlug}`;
  // Deliberately one line, no `\` continuation — `\` only continues a
  // command in bash/zsh. PowerShell (Windows' default shell) needs a
  // backtick for that instead, so a single copy-pasted block has to work
  // without either: one line is the only form every shell accepts as-is.
  const claudeCodeCommand = `claude mcp add --transport http ${mcpServerKey} ${mcpEndpoint} --header "Authorization: Bearer <YOUR_MCP_CREDENTIAL>"`;
  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        [mcpServerKey]: {
          url: mcpEndpoint,
          headers: { Authorization: "Bearer <YOUR_MCP_CREDENTIAL>" },
        },
      },
    },
    null,
    2,
  );

  const activePath = desktopConfigPaths.find((path) => path.value === os) ?? desktopConfigPaths[0];

  return (
    <Tabs defaultValue="claude-code">
      <TabsList>
        <TabsTrigger value="claude-code">Claude Code CLI</TabsTrigger>
        <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
      </TabsList>

      <TabsContent value="claude-code" className="pt-4">
        <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-5">
          <div>
            <h3 className="text-body font-medium text-foreground">Run this in your project directory</h3>
            <p className="text-body-sm text-foreground-muted">
              Replace <code className="text-mono-sm">&lt;YOUR_MCP_CREDENTIAL&gt;</code> with the value
              shown when you generate a credential above.
            </p>
          </div>
          <McpCommandBlock label="Terminal command" value={claudeCodeCommand} />
          <div className="border-t border-subtle pt-3 text-body-sm text-foreground-secondary">
            Once connected, Claude can read {projectName}&apos;s QA context and save discovered features
            directly here — later phases add tests, runs, and results the same way.
          </div>
        </div>
      </TabsContent>

      <TabsContent value="claude-desktop" className="pt-4">
        <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-5">
          <div className="flex flex-col gap-2.5">
            <h3 className="text-body font-medium text-foreground">Add this server configuration</h3>
            <SegmentedControl
              label="Operating system"
              value={os}
              onValueChange={setOs}
              options={desktopConfigPaths.map(({ value, label }) => ({ value, label }))}
            />
            <p className="text-body-sm text-foreground-muted">
              Edit <code className="text-mono-sm">{activePath.path}</code>:
            </p>
          </div>
          <McpCommandBlock label="claude_desktop_config.json" value={claudeDesktopConfig} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
