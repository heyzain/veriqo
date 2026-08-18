import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

export type EntityLinkProps = {
  /** The stable public ID shown, e.g. "FEAT-07", "PV-07", "ISS-14". */
  publicId: string;
  icon?: IconName;
  /** Omit when the target doesn't have a detail route yet — renders as a plain chip instead of a link. */
  href?: string;
  title?: string;
  className?: string;
};

/**
 * The small monospace chip used everywhere one record points at another —
 * dependencies, source test cases, related issues (`EntityLink` in
 * 01-DESIGN-SYSTEM.md, "The UI explains relationships"). Renders as a real
 * link when `href` is given, or a static chip when the target has no detail
 * route yet, so a relationship is never implied to be clickable when it
 * isn't.
 */
export function EntityLink({ publicId, icon, href, title, className }: EntityLinkProps) {
  const chrome = cn(
    "inline-flex items-center gap-1.5 rounded-pill border border-subtle bg-inset px-2.5 py-1 text-mono-sm font-medium text-foreground",
    href && "transition-fast hover:border-strong hover:bg-raised",
    className,
  );

  if (!href) {
    return (
      <span className={chrome} title={title}>
        {icon ? <Icon name={icon} size={12} /> : null}
        {publicId}
      </span>
    );
  }

  return (
    <Link href={href} className={chrome} title={title}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {publicId}
    </Link>
  );
}
