import { z } from "zod";

/**
 * Shared shapes for the Test case domain (Phase 5) — MCP tool input
 * validation and the human-facing edit form, the same split
 * `features/schemas.ts` uses for Phase 4 (03-CLAUDE-RULES.md, "Forms —
 * Shared Zod schema where client/server validation align").
 */

export const testCasePrioritySchema = z.enum(["critical", "high", "medium", "low"]);

// ---- MCP tool input (04-CONFIG-BLUEPRINT.md, "MCP rules — Typed tool inputs") ----

export const mcpCreateTestCaseSchema = z.object({
  featureId: z.string().trim().min(1, "featureId (the parent feature's public ID) is required."),
  title: z.string().trim().min(2, "title must be at least 2 characters.").max(160, "title must be 160 characters or fewer."),
  priority: testCasePrioritySchema,
  preconditions: z.string().trim().max(500, "preconditions must be 500 characters or fewer.").optional(),
  steps: z
    .array(z.string().trim().min(1).max(300))
    .min(1, "steps must include at least one step.")
    .max(20, "steps must include 20 steps or fewer."),
  expectedResult: z
    .string()
    .trim()
    .min(1, "expectedResult is required.")
    .max(500, "expectedResult must be 500 characters or fewer."),
  roles: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  environments: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  idempotencyKey: z.string().trim().max(120).optional(),
});
export type McpCreateTestCaseInput = z.infer<typeof mcpCreateTestCaseSchema>;

export const mcpUpdateTestCaseSchema = z.object({
  testCaseId: z.string().trim().min(1, "testCaseId (the test case's public ID) is required."),
  title: z.string().trim().min(2).max(160).optional(),
  priority: testCasePrioritySchema.optional(),
  preconditions: z.string().trim().max(500).optional(),
  steps: z.array(z.string().trim().min(1).max(300)).min(1).max(20).optional(),
  expectedResult: z.string().trim().min(1).max(500).optional(),
  roles: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  environments: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
});
export type McpUpdateTestCaseInput = z.infer<typeof mcpUpdateTestCaseSchema>;

export const testCaseStatusFilterSchema = z.enum(["draft", "inReview", "ready", "needsUpdate", "archived"]);

export const mcpListTestCasesSchema = z.object({
  status: testCaseStatusFilterSchema.optional(),
  featureId: z.string().trim().min(1).optional(),
});
export type McpListTestCasesInput = z.infer<typeof mcpListTestCasesSchema>;

// ---- Human-facing edit form (native FormData; values stay strings so a ----
// ---- recoverable failure can repopulate the form via ActionState).     ----

export const testCaseEditFormSchema = z.object({
  title: z.string().trim().min(2, "Give the test case a title.").max(160, "Keep it under 160 characters."),
  priority: testCasePrioritySchema,
  preconditions: z.string().trim().max(500, "Keep it under 500 characters.").optional(),
  steps: z.string().trim().min(1, "Add at least one step, one per line."),
  expectedResult: z
    .string()
    .trim()
    .min(1, "Describe the expected result.")
    .max(500, "Keep it under 500 characters."),
  roles: z.string(),
  environments: z.string(),
});
export type TestCaseEditFormValues = z.infer<typeof testCaseEditFormSchema>;

export function parseStepsText(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
