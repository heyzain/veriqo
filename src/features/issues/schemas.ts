import { z } from "zod";

/**
 * Shared shapes for the Issue domain (Phase 7) — MCP tool input validation
 * and human-facing forms, the same split `features/test-cases/schemas.ts`
 * uses (03-CLAUDE-RULES.md, "Forms — Shared Zod schema where client/server
 * validation align").
 */

export const issueSeveritySchema = z.enum(["low", "medium", "high"]);

// ---- MCP tool input (04-CONFIG-BLUEPRINT.md, "MCP rules — Typed tool inputs") ----
// Deliberately narrow: Claude can move an issue through investigation and
// record a fix, but never marks it ready for retest, creates the rerun, or
// asserts verification — those stay human/system-only (03-CLAUDE-RULES.md,
// "No silent auto-approval of Claude output", "No issue closure on
// 'fix completed'").

export const mcpIssueStatusSchema = z.enum(["open", "investigating", "fixInProgress"]);

export const mcpUpdateIssueStatusSchema = z.object({
  issueId: z.string().trim().min(1, "issueId (the issue's public ID) is required."),
  status: mcpIssueStatusSchema,
});
export type McpUpdateIssueStatusInput = z.infer<typeof mcpUpdateIssueStatusSchema>;

export const mcpRecordIssueFixSchema = z.object({
  issueId: z.string().trim().min(1, "issueId (the issue's public ID) is required."),
  fixNote: z
    .string()
    .trim()
    .min(1, "fixNote is required.")
    .max(2000, "fixNote must be 2000 characters or fewer."),
});
export type McpRecordIssueFixInput = z.infer<typeof mcpRecordIssueFixSchema>;

export const issueStatusFilterSchema = z.enum([
  "open",
  "investigating",
  "fixInProgress",
  "readyForRetest",
  "verified",
  "reopened",
]);

export const mcpListIssuesSchema = z.object({
  status: issueStatusFilterSchema.optional(),
});
export type McpListIssuesInput = z.infer<typeof mcpListIssuesSchema>;

// ---- Human-facing forms (native FormData; values stay strings so a ----
// ---- recoverable failure can repopulate the form via ActionState).  ----

export const issueCreateFormSchema = z.object({
  title: z.string().trim().min(2, "Give the issue a title.").max(160, "Keep it under 160 characters."),
  severity: issueSeveritySchema,
});
export type IssueCreateFormValues = z.infer<typeof issueCreateFormSchema>;

export const issueFixFormSchema = z.object({
  fixNote: z
    .string()
    .trim()
    .min(1, "Describe the fix before recording it.")
    .max(2000, "Keep it under 2000 characters."),
});
export type IssueFixFormValues = z.infer<typeof issueFixFormSchema>;

export const focusedRerunFormSchema = z.object({
  build: z.string().trim().min(1, "Enter a build or release identifier.").max(60, "Keep it under 60 characters."),
  environment: z.string().trim().min(1, "Choose an environment."),
  browser: z.string().trim().min(1, "Enter a browser or device.").max(60, "Keep it under 60 characters."),
  assigneeName: z.string().trim().max(80, "Keep it under 80 characters.").optional(),
  issueIds: z.string().trim().min(1, "Select at least one issue that's ready for retest."),
});
export type FocusedRerunFormValues = z.infer<typeof focusedRerunFormSchema>;

export function parseCommaIds(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
