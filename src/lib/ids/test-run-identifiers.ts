import { formatPublicId } from "@/lib/mock/ids";

export type TestRunPublicIdPrefix = "RUN" | "RERUN";

/**
 * Sequential run public IDs (04-CONFIG-BLUEPRINT.md, "Public IDs" —
 * `RUN-24`, and reruns as their own `RERUN-03` sequence). Unlike test
 * cases' per-feature-prefix gap-filling (`test-case-identifiers.ts`), each
 * prefix has one running sequence per project — continuing from the highest
 * existing `<prefix>-N` keeps new IDs numbered after real ones rather than
 * backfilling a lower gap. `existingIds` is every run public ID in the
 * project (both prefixes mixed); the prefix-specific regex ignores the rest.
 */
export function nextTestRunPublicId(prefix: TestRunPublicIdPrefix, existingIds: ReadonlySet<string>): string {
  let max = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  for (const id of existingIds) {
    const match = pattern.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return formatPublicId(prefix, max + 1);
}
