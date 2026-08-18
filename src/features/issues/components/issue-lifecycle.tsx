import { Icon } from "@/components/ui/icon";
import { issueStatuses, type IssueStatus } from "@/config/status.config";
import { cn } from "@/lib/utils/cn";

const canonicalOrder: readonly IssueStatus[] = ["open", "investigating", "fixInProgress", "readyForRetest", "verified"];

export type IssueLifecycleProps = {
  status: IssueStatus;
  className?: string;
};

/**
 * `IssueLifecycle` (01-DESIGN-SYSTEM.md, "Product components") — the
 * canonical five-step rail, with the current step highlighted and completed
 * ones checked. "Reopened" isn't a sixth step on the same rail; it's a
 * restart from "Fix in progress" with its own callout, since the cycle
 * genuinely begins again rather than continuing forward (01-DESIGN-SYSTEM.md,
 * "Issue detail visually centers the lifecycle").
 */
export function IssueLifecycle({ status, className }: IssueLifecycleProps) {
  const isReopened = status === "reopened";
  const effectiveIndex = canonicalOrder.indexOf(isReopened ? "fixInProgress" : status);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ol className="flex items-center">
        {canonicalOrder.map((step, index) => {
          const def = issueStatuses[step];
          const isDone = index < effectiveIndex || (index === effectiveIndex && !isReopened);
          const isCurrent = index === effectiveIndex;

          return (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  aria-label={def.label}
                  title={def.label}
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-pill border text-[11px] font-medium",
                    isDone
                      ? "border-pass bg-pass/15 text-pass"
                      : isCurrent
                        ? "border-action bg-action text-foreground-on-dark"
                        : "border-subtle bg-inset text-foreground-muted",
                  )}
                >
                  {isDone ? <Icon name="check" size={13} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden max-w-20 text-center text-body-sm sm:block",
                    isCurrent || isDone ? "text-foreground" : "text-foreground-muted",
                  )}
                >
                  {def.label}
                </span>
              </div>
              {index < canonicalOrder.length - 1 ? (
                <span className={cn("mx-2 h-px flex-1", isDone ? "bg-pass/40" : "bg-subtle")} />
              ) : null}
            </li>
          );
        })}
      </ol>
      {isReopened ? (
        <div className="flex items-center gap-2 rounded-md border border-fail/30 bg-fail/10 px-3 py-2 text-body-sm text-fail">
          <Icon name="fail" size={14} />
          <span>Reopened — the rerun didn&apos;t pass. Investigate again before the next retest.</span>
        </div>
      ) : null}
    </div>
  );
}
