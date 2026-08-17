"use client";

import { IconButton } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export type DevLinkPreviewProps = {
  label: string;
  href: string;
};

/**
 * Surfaces a token-bearing link that would normally be emailed, since no
 * email provider is configured yet (a documented Phase 1 limitation — see
 * the phase report). The caller only renders this when
 * `NODE_ENV !== "production"`, so it never reaches a production build's
 * runtime behavior.
 */
export function DevLinkPreview({ label, href }: DevLinkPreviewProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-strong bg-inset px-4 py-3">
      <p className="text-label-style text-foreground-muted">
        Development preview — email delivery isn&apos;t configured yet
      </p>
      <div className="flex items-center gap-2">
        <a
          href={href}
          className="flex-1 truncate text-mono-sm text-action underline decoration-dotted underline-offset-2"
        >
          {label}
        </a>
        <IconButton
          icon="copy"
          label="Copy link"
          intent="ghost"
          size="sm"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
            toast({ title: "Link copied", variant: "neutral" });
          }}
        />
      </div>
    </div>
  );
}
