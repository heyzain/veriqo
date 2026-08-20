import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { mcpConnectionStatuses, type McpConnectionStatus } from "@/config/status.config";

export type ConnectionBadgeProps = {
  status: McpConnectionStatus;
  projectSlug: string;
  className?: string;
  collapsed?: boolean;
};

const dotClassByTone: Record<string, string> = {
  pass: "bg-pass shadow-[0_0_0_2px_rgba(63,125,91,0.2)]",
  fail: "bg-fail shadow-[0_0_0_2px_rgba(185,95,79,0.2)]",
  progress: "bg-progress shadow-[0_0_0_2px_rgba(79,120,147,0.2)]",
  neutral: "bg-neutral",
};

/**
 * Status is never color-only (01-DESIGN-SYSTEM.md, "Status design") — the
 * dot is paired with the label from `status.config.ts` everywhere this
 * renders, including the collapsed sidebar variant via its `title`/
 * `aria-label`.
 */
export function ConnectionBadge({
  status,
  projectSlug,
  className = "",
  collapsed = false,
}: ConnectionBadgeProps) {
  const definition = mcpConnectionStatuses[status];
  const dotClass = dotClassByTone[definition.tone] ?? dotClassByTone.neutral;
  const label = `MCP: ${definition.label}`;

  if (collapsed) {
    return (
      <Link
        href={`/projects/${projectSlug}/mcp`}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-sm transition-fast hover:bg-inset ${className}`}
        title={label}
        aria-label={label}
      >
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      </Link>
    );
  }

  return (
    <Link
      href={`/projects/${projectSlug}/mcp`}
      className={`inline-flex items-center gap-2 rounded-pill border border-subtle bg-surface px-2.5 py-1 text-mono-sm transition-fast hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${className}`}
      aria-label={label}
    >
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="text-foreground-secondary">
        MCP:{" "}
        <span
          className={
            definition.tone === "pass"
              ? "font-medium text-pass"
              : definition.tone === "fail"
                ? "font-medium text-fail"
                : "text-foreground-muted"
          }
        >
          {definition.label}
        </span>
      </span>
      <Icon name="chevronRight" size={12} className="text-foreground-muted" />
    </Link>
  );
}
