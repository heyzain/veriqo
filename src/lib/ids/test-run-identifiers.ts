import { formatPublicId } from "@/lib/mock/ids";

/**
 * Sequential run public IDs (04-CONFIG-BLUEPRINT.md, "Public IDs" —
 * `RUN-24`). Unlike test cases' per-feature-prefix gap-filling
 * (`test-case-identifiers.ts`), a project has one run sequence — continuing
 * from the highest existing `RUN-N` keeps new runs numbered after real ones
 * rather than backfilling a lower gap.
 */
export function nextTestRunPublicId(existingIds: ReadonlySet<string>): string {
  let max = 0;
  for (const id of existingIds) {
    const match = /^RUN-(\d+)$/.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return formatPublicId("RUN", max + 1);
}
