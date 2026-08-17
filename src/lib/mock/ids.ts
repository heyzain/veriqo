/**
 * Stable, readable public identifiers (04-CONFIG-BLUEPRINT.md, "Public
 * IDs") — `FEAT-12`, `ISS-14`, and so on. Internal database identifiers
 * stay out of the UI and MCP output.
 */
export function formatPublicId(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(2, "0")}`;
}
