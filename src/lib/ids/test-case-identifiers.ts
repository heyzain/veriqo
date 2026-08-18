/**
 * Module-aware test-case public IDs (04-CONFIG-BLUEPRINT.md, "Public IDs" —
 * "module-aware IDs such as `AUTH-07`"). The prefix comes from the parent
 * feature's name so cases stay grouped by eye (`PV-07` for "Private Vault",
 * matching the seed story) without needing a per-feature counter table —
 * sequencing just scans existing public IDs sharing that prefix.
 */
import { formatPublicId } from "@/lib/mock/ids";

export function testCaseModulePrefix(featureName: string): string {
  const words = featureName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "TC";
  if (words.length === 1) {
    const letters = words[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    return letters || "TC";
  }
  const initials = words
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  return initials || "TC";
}

export function nextTestCasePublicId(prefix: string, existingIds: ReadonlySet<string>): string {
  let sequence = 1;
  let candidate = formatPublicId(prefix, sequence);
  while (existingIds.has(candidate)) {
    sequence += 1;
    candidate = formatPublicId(prefix, sequence);
  }
  return candidate;
}
