import { formatPublicId } from "@/lib/mock/ids";

/**
 * Sequential issue public IDs (04-CONFIG-BLUEPRINT.md, "Public IDs" —
 * `ISS-14`). One counter per project, continuing from the highest existing
 * `ISS-N` — the same max-based sequencing `test-run-identifiers.ts` uses,
 * rather than test cases' per-feature-prefix gap-filling.
 */
export function nextIssuePublicId(existingIds: ReadonlySet<string>): string {
  let max = 0;
  for (const id of existingIds) {
    const match = /^ISS-(\d+)$/.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return formatPublicId("ISS", max + 1);
}
