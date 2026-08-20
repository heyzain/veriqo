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

const shellOptions = [
  { value: "bash", label: "macOS / Linux / Bash" },
  { value: "powershell", label: "PowerShell (Windows)" },
  { value: "cmd", label: "Command Prompt" },
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
  const [shell, setShell] = useState<string>("powershell");

  const mcpServerKey = productConfig.name.toLowerCase();
  const mcpEndpoint = `${productConfig.urls.app}/api/mcp/${projectSlug}`;
  // Deliberately one line, no `\` continuation — `\` only continues a
  // command in bash/zsh. PowerShell (Windows' default shell) needs a
  // backtick for that instead, so a single copy-pasted block has to work
  // without either: one line is the only form every shell accepts as-is.
  const claudeCodeCommand = `claude mcp add --transport http ${mcpServerKey} ${mcpEndpoint} --header "Authorization: Bearer <YOUR_MCP_CREDENTIAL>"`;

  const getTestCommand = (selectedShell: string) => {
    switch (selectedShell) {
      case "powershell":
        return `Invoke-RestMethod -Uri "${mcpEndpoint}" -Method POST -Headers @{ Authorization = "Bearer <YOUR_MCP_CREDENTIAL>" } -ContentType "application/json" -Body '{"tool":"health_check"}'`;
      case "cmd":
        return `curl.exe -X POST ${mcpEndpoint} -H "Authorization: Bearer <YOUR_MCP_CREDENTIAL>" -H "Content-Type: application/json" -d "{\\"tool\\":\\"health_check\\"}"`;
      case "bash":
      default:
        return `curl -X POST ${mcpEndpoint} -H "Authorization: Bearer <YOUR_MCP_CREDENTIAL>" -H "Content-Type: application/json" -d '{"tool":"health_check"}'`;
    }
  };

  const claudeTestCommand = getTestCommand(shell);
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
        <div className="flex flex-col gap-6 rounded-lg border border-subtle bg-surface p-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest text-foreground-on-dark text-mono-sm text-[11px] font-bold">
                1
              </span>
              <h3 className="text-body font-medium text-foreground">Add MCP server in your project directory</h3>
            </div>
            <p className="text-body-sm text-foreground-muted">
              Run this in your project terminal to register Veriqo with Claude Code. Replace{" "}
              <code className="text-mono-sm">&lt;YOUR_MCP_CREDENTIAL&gt;</code> with the value
              shown when you generate a credential above.
            </p>
            <McpCommandBlock label="Terminal command" value={claudeCodeCommand} />
          </div>

          <div className="flex flex-col gap-3 border-t border-subtle pt-4">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest text-foreground-on-dark text-mono-sm text-[11px] font-bold">
                2
              </span>
              <h3 className="text-body font-medium text-foreground">Test connection and mark as connected</h3>
            </div>
            <p className="text-body-sm text-foreground-muted">
              Verify the endpoint directly from your terminal or from inside Claude Code:
            </p>
            <div className="flex flex-col gap-2">
              <SegmentedControl
                label="Terminal shell"
                value={shell}
                onValueChange={setShell}
                options={shellOptions}
              />
              <McpCommandBlock label="Terminal test command" value={claudeTestCommand} />
            </div>
            <div className="rounded-md border border-subtle bg-inset/40 p-3 text-body-sm text-foreground-secondary">
              <span className="font-semibold text-foreground">Or in Claude Code:</span> ask Claude{" "}
              <code className="rounded bg-inset px-1 py-0.5 font-mono text-[12px] text-foreground">
                &quot;Run health check on veriqo MCP to test connection&quot;
              </code>{" "}
              or verify with{" "}
              <code className="rounded bg-inset px-1 py-0.5 font-mono text-[12px] text-foreground">
                claude mcp list
              </code>
              .
            </div>
          </div>

          <div className="border-t border-subtle pt-3 text-body-sm text-foreground-secondary">
            Once connected, Claude can read {projectName}&apos;s QA context and save discovered features
            directly here — later phases add tests, runs, and results the same way.
          </div>
        </div>
      </TabsContent>

      <TabsContent value="claude-desktop" className="pt-4">
        <div className="flex flex-col gap-6 rounded-lg border border-subtle bg-surface p-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest text-foreground-on-dark text-mono-sm text-[11px] font-bold">
                1
              </span>
              <h3 className="text-body font-medium text-foreground">Add this server configuration</h3>
            </div>
            <SegmentedControl
              label="Operating system"
              value={os}
              onValueChange={setOs}
              options={desktopConfigPaths.map(({ value, label }) => ({ value, label }))}
            />
            <p className="text-body-sm text-foreground-muted">
              Edit <code className="text-mono-sm">{activePath.path}</code>:
            </p>
            <McpCommandBlock label="claude_desktop_config.json" value={claudeDesktopConfig} />
          </div>

          <div className="flex flex-col gap-3 border-t border-subtle pt-4">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest text-foreground-on-dark text-mono-sm text-[11px] font-bold">
                2
              </span>
              <h3 className="text-body font-medium text-foreground">Restart Claude Desktop &amp; Test Connection</h3>
            </div>
            <p className="text-body-sm text-foreground-muted">
              Restart Claude Desktop to apply the new configuration. You can test and verify the connection with this terminal command:
            </p>
            <div className="flex flex-col gap-2">
              <SegmentedControl
                label="Terminal shell"
                value={shell}
                onValueChange={setShell}
                options={shellOptions}
              />
              <McpCommandBlock label="Terminal test command" value={claudeTestCommand} />
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
