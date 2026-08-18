import Link from "next/link";

import type { PassRateTrendPoint } from "@/server/services/analytics-service";

export type PassRateTrendChartProps = {
  points: readonly PassRateTrendPoint[];
};

const WIDTH = 560;
const HEIGHT = 160;
const PAD_X = 20;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;

/**
 * Pass rate across completed runs, in run order. A "change over time" job —
 * one line, the reserved `pass` status hue, never a fabricated trend when
 * there isn't enough data yet (03-CLAUDE-RULES.md, "No random dashboard
 * metrics"). The run list beneath doubles as the chart's accessible table
 * view and its drill-down.
 */
export function PassRateTrendChart({ points }: PassRateTrendChartProps) {
  if (points.length === 0) {
    return <p className="text-body-sm text-foreground-muted">No completed runs yet — this fills in as runs finish.</p>;
  }

  if (points.length === 1) {
    const only = points[0];
    return (
      <p className="text-body-sm text-foreground-muted">
        Only one run recorded so far —{" "}
        <Link href={only.href} className="font-medium text-foreground hover:underline">
          {only.runPublicId}
        </Link>{" "}
        at {only.passRatePercent}%. A trend line appears once more runs complete.
      </p>
    );
  }

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = plotWidth / (points.length - 1);
  const coords = points.map((point, index) => ({
    x: PAD_X + stepX * index,
    y: PAD_TOP + plotHeight * (1 - point.passRatePercent / 100),
    point,
  }));
  const linePath = coords.map((c, index) => `${index === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const baseline = PAD_TOP + plotHeight;
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baseline} L ${coords[0].x.toFixed(1)} ${baseline} Z`;

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Pass rate trend across completed test runs">
        <line x1={PAD_X} y1={baseline} x2={WIDTH - PAD_X} y2={baseline} className="stroke-subtle" strokeWidth={1} />
        <path d={areaPath} className="fill-pass/10" />
        <path d={linePath} className="fill-none stroke-pass" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c) => (
          <circle key={c.point.runPublicId} cx={c.x} cy={c.y} r={4} className="fill-pass">
            <title>{`${c.point.runPublicId} — ${c.point.passRatePercent}%`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {points.map((point) => (
          <Link
            key={point.runPublicId}
            href={point.href}
            className="flex items-center gap-1.5 text-body-sm text-foreground-muted hover:text-foreground hover:underline"
          >
            <span className="text-mono-sm font-semibold text-foreground">{point.runPublicId}</span>
            <span>{point.passRatePercent}%</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
