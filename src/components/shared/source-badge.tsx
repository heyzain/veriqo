import { Badge } from "@/components/ui/badge";
import { actorTypes } from "@/config/status.config";
import type { ActorType } from "@/config/status.config";

export type SourceBadgeProps = {
  source: ActorType;
  className?: string;
};

/**
 * Labels a record by who produced its current content — Claude, a human, the
 * system, or an import (`SourceBadge` in 01-DESIGN-SYSTEM.md). Every
 * Claude-generated record must carry this so it's never mistaken for
 * human-authored content (03-CLAUDE-RULES.md, "Claude-generated records are
 * labeled and reviewable").
 */
export function SourceBadge({ source, className }: SourceBadgeProps) {
  const def = actorTypes[source];
  return (
    <Badge tone={def.tone} icon={def.icon} className={className}>
      {def.label}
    </Badge>
  );
}
