"use client";

import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatEvidenceSize, isImageEvidenceType } from "@/config/evidence.config";
import { cn } from "@/lib/utils/cn";
import type { TestEvidence } from "@/types/domain";

export type EvidenceGalleryProps = {
  evidence: readonly TestEvidence[];
  /** Renders a remove control per item when set — the write-mode view inside the runner. */
  onRemove?: (id: string) => void;
  emptyMessage?: string;
  className?: string;
};

/**
 * `EvidenceGallery` (01-DESIGN-SYSTEM.md, "Product components") — thumbnails
 * for image evidence, a labeled file chip otherwise, always with the file
 * name as accessible alt/label text rather than a bare icon
 * (03-CLAUDE-RULES.md, "Icons never carry meaning without accessible
 * names"). Shared across Test Runs (evidence on a result) and Issues
 * (evidence carried through from the origin result) — a cross-domain
 * pattern, so it lives in `components/shared/` rather than one feature.
 */
export function EvidenceGallery({ evidence, onRemove, emptyMessage = "No evidence attached.", className }: EvidenceGalleryProps) {
  if (evidence.length === 0) {
    return <p className="text-body-sm text-foreground-muted">{emptyMessage}</p>;
  }

  return (
    <ul className={cn("flex flex-wrap gap-3", className)}>
      {evidence.map((item) => (
        <li
          key={item.id}
          className="relative flex w-32 flex-col gap-1.5 rounded-md border border-subtle bg-surface p-2 shadow-sm"
        >
          {isImageEvidenceType(item.type) ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URLs from client-side FileReader, not an optimizable remote asset.
            <img src={item.dataUrl} alt={item.name} className="h-20 w-full rounded-xs object-cover" />
          ) : (
            <div className="flex h-20 w-full items-center justify-center rounded-xs bg-inset text-foreground-muted">
              <Icon name="evidence" size={22} label={item.name} />
            </div>
          )}
          <div className="flex flex-col gap-0 overflow-hidden">
            <span className="truncate text-body-sm text-foreground" title={item.name}>
              {item.name}
            </span>
            <span className="text-mono-sm text-[11px] text-foreground-muted">{formatEvidenceSize(item.size)}</span>
          </div>
          {onRemove ? (
            <IconButton
              icon="close"
              label={`Remove ${item.name}`}
              intent="secondary"
              size="sm"
              className="absolute -right-2.5 -top-2.5 size-6 bg-raised"
              onClick={() => onRemove(item.id)}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
