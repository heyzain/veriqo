import Link from "next/link";

import type { ModuleFailureCount } from "@/server/services/analytics-service";

export type FailureByModuleChartProps = {
  modules: readonly ModuleFailureCount[];
};

/**
 * Fail counts by feature — a magnitude-by-category job, so one hue (the
 * reserved `fail` status color) carries every bar; the feature name on the
 * axis is what distinguishes categories, not color.
 */
export function FailureByModuleChart({ modules }: FailureByModuleChartProps) {
  if (modules.length === 0) {
    return <p className="text-body-sm text-foreground-muted">No failures recorded yet.</p>;
  }

  const max = Math.max(...modules.map((m) => m.failCount));

  return (
    <ul className="flex flex-col gap-2.5">
      {modules.map((module) => (
        <li key={module.featurePublicId}>
          <Link href={module.href} className="group flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-body-sm text-foreground group-hover:underline sm:w-40">
              {module.featureName}
            </span>
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-pill bg-inset">
              <span
                className="absolute inset-y-0 left-0 rounded-pill bg-fail"
                style={{ width: `${(module.failCount / max) * 100}%` }}
              />
            </span>
            <span className="w-6 shrink-0 text-right text-mono-sm text-foreground-muted">{module.failCount}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
