import { RiskMark } from "@/components/shared/risk-mark";
import { Icon } from "@/components/ui/icon";
import type { Feature } from "@/types/domain";

export type FeatureDiffViewProps = {
  feature: Feature;
};

function Field({ label, before, after }: { label: string; before: string; after: string }) {
  if (before === after) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-style text-foreground-muted">{label}</span>
      <div className="flex flex-col gap-1 rounded-sm border border-fail/25 bg-fail/5 px-3 py-2 text-body-sm text-foreground-secondary line-through">
        {before}
      </div>
      <div className="flex flex-col gap-1 rounded-sm border border-pass/25 bg-pass/5 px-3 py-2 text-body-sm text-foreground">
        {after}
      </div>
    </div>
  );
}

/**
 * The diff/review treatment for a Claude-proposed update to an
 * already-approved feature (Phase 4 acceptance). Only fields that actually
 * changed are shown — approving simply clears `previousSnapshot`.
 */
export function FeatureDiffView({ feature }: FeatureDiffViewProps) {
  const previous = feature.previousSnapshot;
  if (!previous) return null;

  const criteriaChanged =
    previous.acceptanceCriteria.length !== feature.acceptanceCriteria.length ||
    previous.acceptanceCriteria.some((item, index) => item !== feature.acceptanceCriteria[index]);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-ai/25 bg-ai/5 p-5">
      <div className="flex items-center gap-2">
        <Icon name="claude" size={16} className="text-ai" />
        <h3 className="text-title-md text-foreground">Claude proposed an update</h3>
      </div>
      <p className="text-body-sm text-foreground-secondary">
        This feature was approved, then re-analyzed. Review what changed before approving again — approving
        replaces the previous content shown below.
      </p>

      <Field label="Name" before={previous.name} after={feature.name} />
      <Field label="Description" before={previous.description} after={feature.description} />

      {previous.risk !== feature.risk ? (
        <div className="flex flex-col gap-1">
          <span className="text-label-style text-foreground-muted">Risk</span>
          <div className="flex items-center gap-2">
            <RiskMark risk={previous.risk} className="opacity-60 line-through" />
            <Icon name="chevronRight" size={14} className="text-foreground-muted" />
            <RiskMark risk={feature.risk} />
          </div>
        </div>
      ) : null}

      {criteriaChanged ? (
        <div className="flex flex-col gap-1">
          <span className="text-label-style text-foreground-muted">Acceptance criteria</span>
          <ul className="flex flex-col gap-1 rounded-sm border border-fail/25 bg-fail/5 px-3 py-2 text-body-sm text-foreground-secondary">
            {previous.acceptanceCriteria.map((item, index) => (
              <li key={index} className="line-through">
                {item}
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-1 rounded-sm border border-pass/25 bg-pass/5 px-3 py-2 text-body-sm text-foreground">
            {feature.acceptanceCriteria.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
