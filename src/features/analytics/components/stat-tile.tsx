import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/icon";

export type StatTileProps = {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: IconName;
};

/**
 * A single computed metric with its explanation and drill-down — used
 * sparingly (fix-to-verification time, reopened rate), never as a repeated
 * KPI-wall pattern (01-DESIGN-SYSTEM.md, "Anti-template checklist" — "Large
 * empty cards with a single number").
 */
export function StatTile({ label, value, detail, href, icon }: StatTileProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-md border border-subtle bg-surface p-4 transition-fast hover:border-strong hover:bg-inset/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-eyebrow uppercase tracking-wider text-foreground-muted">{label}</span>
        <Icon name={icon} size={15} className="text-foreground-muted transition-fast group-hover:text-foreground" />
      </div>
      <span className="text-title-lg font-serif text-foreground">{value}</span>
      <p className="text-body-sm text-foreground-muted">{detail}</p>
    </Link>
  );
}
