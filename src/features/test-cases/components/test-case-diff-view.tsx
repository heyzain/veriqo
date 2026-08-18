import { PriorityMark } from "@/components/shared/priority-mark";
import { Icon } from "@/components/ui/icon";
import type { TestCase } from "@/types/domain";

export type TestCaseDiffViewProps = {
  testCase: TestCase;
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
 * already-`ready` test case (Phase 5, mirroring `FeatureDiffView` from Phase
 * 4). Only fields that actually changed are shown — approving simply clears
 * `previousSnapshot`.
 */
export function TestCaseDiffView({ testCase }: TestCaseDiffViewProps) {
  const previous = testCase.previousSnapshot;
  if (!previous) return null;

  const stepsChanged =
    previous.steps.length !== testCase.steps.length ||
    previous.steps.some((step, index) => step !== testCase.steps[index]);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-ai/25 bg-ai/5 p-5">
      <div className="flex items-center gap-2">
        <Icon name="claude" size={16} className="text-ai" />
        <h3 className="text-title-md text-foreground">Claude proposed an update</h3>
      </div>
      <p className="text-body-sm text-foreground-secondary">
        This test case was approved, then re-analyzed. Review what changed before approving again — approving
        replaces the previous content shown below.
      </p>

      <Field label="Title" before={previous.title} after={testCase.title} />
      <Field label="Expected result" before={previous.expectedResult} after={testCase.expectedResult} />

      {previous.priority !== testCase.priority ? (
        <div className="flex flex-col gap-1">
          <span className="text-label-style text-foreground-muted">Priority</span>
          <div className="flex items-center gap-2">
            <PriorityMark priority={previous.priority} className="opacity-60 line-through" />
            <Icon name="chevronRight" size={14} className="text-foreground-muted" />
            <PriorityMark priority={testCase.priority} />
          </div>
        </div>
      ) : null}

      {stepsChanged ? (
        <div className="flex flex-col gap-1">
          <span className="text-label-style text-foreground-muted">Steps</span>
          <ol className="flex list-decimal flex-col gap-1 rounded-sm border border-fail/25 bg-fail/5 px-3 py-2 pl-6 text-body-sm text-foreground-secondary">
            {previous.steps.map((step, index) => (
              <li key={index} className="line-through">
                {step}
              </li>
            ))}
          </ol>
          <ol className="flex list-decimal flex-col gap-1 rounded-sm border border-pass/25 bg-pass/5 px-3 py-2 pl-6 text-body-sm text-foreground">
            {testCase.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
