"use client";

import { useState } from "react";

import { IconButton } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export type CopyBlockProps = {
  label: string;
  value: string;
  description?: string;
  onCopy?: () => void;
};

/**
 * A labeled, copyable block of text — commands, config, or a composed
 * prompt (`McpCommandBlock`/`PromptCopyAction` in 01-DESIGN-SYSTEM.md, one
 * implementation). Copy confirmation is both visual (icon swap) and
 * announced (toast), per "Copy actions have accessible confirmation"
 * (02-BUILD-PHASES.md Phase 3 acceptance, reused by Phase 4's prompt
 * composer).
 */
export function CopyBlock({ label, value, description, onCopy }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: "Copied to clipboard", variant: "neutral" });
    onCopy?.();
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-style text-foreground-secondary">{label}</span>
        <IconButton
          icon={copied ? "check" : "copy"}
          label={`Copy ${label.toLowerCase()}`}
          intent="ghost"
          size="sm"
          type="button"
          onClick={handleCopy}
        />
      </div>
      {description ? <p className="text-body-sm text-foreground-muted">{description}</p> : null}
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-forest-0 p-4 font-mono text-mono-sm text-[13px] text-foreground-on-dark">
        {value}
      </pre>
    </div>
  );
}
