import Link from "next/link";

import { Icon } from "@/components/ui/icon";

export type ConnectionBadgeProps = {
  connected?: boolean;
  projectSlug: string;
  className?: string;
  collapsed?: boolean;
};

export function ConnectionBadge({
  connected = false,
  projectSlug,
  className = "",
  collapsed = false,
}: ConnectionBadgeProps) {
  if (collapsed) {
    return (
      <Link
        href={`/projects/${projectSlug}/mcp`}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-sm transition-fast hover:bg-inset ${className}`}
        title={connected ? "Claude MCP: Connected" : "Claude MCP: Not connected"}
        aria-label={connected ? "Claude MCP: Connected" : "Claude MCP: Not connected"}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-pass shadow-[0_0_0_2px_rgba(63,125,91,0.2)]" : "bg-neutral"
          }`}
        />
      </Link>
    );
  }

  return (
    <Link
      href={`/projects/${projectSlug}/mcp`}
      className={`inline-flex items-center gap-2 rounded-pill border border-subtle bg-surface px-2.5 py-1 text-mono-sm transition-fast hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${className}`}
      aria-label={`Claude MCP: ${connected ? "Connected" : "Not connected"}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? "bg-pass shadow-[0_0_0_2px_rgba(63,125,91,0.2)]" : "bg-neutral"
        }`}
      />
      <span className="text-foreground-secondary">
        Claude MCP: <span className={connected ? "text-pass font-medium" : "text-foreground-muted"}>{connected ? "Connected" : "Not connected"}</span>
      </span>
      <Icon name="chevronRight" size={12} className="text-foreground-muted" />
    </Link>
  );
}
