import { z } from "zod";

import { evidenceConfig, isAllowedEvidenceType } from "@/config/evidence.config";

/**
 * Shared shapes for the Test run domain (Phase 6) — the same split
 * `features/test-cases/schemas.ts` uses (03-CLAUDE-RULES.md, "Forms —
 * Shared Zod schema where client/server validation align").
 */

// ---- Create-run form (native FormData; values stay strings so a ----
// ---- recoverable failure can repopulate the form via ActionState). ----

export const executionModeSchema = z.enum(["manual", "claudeAssisted"]);

export const testRunCreateFormSchema = z.object({
  name: z.string().trim().min(2, "Give the run a name.").max(120, "Keep it under 120 characters."),
  build: z.string().trim().min(1, "Enter a build or release identifier.").max(60, "Keep it under 60 characters."),
  environment: z.string().trim().min(1, "Choose an environment."),
  browser: z.string().trim().min(1, "Enter a browser or device.").max(60, "Keep it under 60 characters."),
  assigneeName: z.string().trim().max(80, "Keep it under 80 characters.").optional(),
  notes: z.string().trim().max(500, "Keep it under 500 characters.").optional(),
  testCaseIds: z.string().trim().min(1, "Select at least one test case to include in this run."),
  executionMode: executionModeSchema.default("manual"),
});
export type TestRunCreateFormValues = z.infer<typeof testRunCreateFormSchema>;

export function parseCommaIds(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ---- Result submission from the focused runner (invoked directly from a ----
// ---- client component, not bound to a <form> — see features/test-runs/actions.ts). ----

export const testEvidenceInputSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200),
  type: z.string().refine(isAllowedEvidenceType, { message: "Unsupported file type." }),
  size: z
    .number()
    .int()
    .positive()
    .max(evidenceConfig.maxFileSizeBytes, `File must be ${evidenceConfig.maxFileSizeBytes / (1024 * 1024)} MB or smaller.`),
  dataUrl: z.string().startsWith("data:", "Evidence must be an uploaded file."),
});
export type TestEvidenceInput = z.infer<typeof testEvidenceInputSchema>;

export const submitTestResultSchema = z
  .object({
    status: z.enum(["pass", "fail", "partial", "blocked"]),
    actualResult: z.string().trim().max(2000, "Keep it under 2000 characters.").optional(),
    evidence: z.array(testEvidenceInputSchema).max(evidenceConfig.maxFilesPerResult, "Too many evidence files.").default([]),
  })
  .superRefine((value, ctx) => {
    if (value.status !== "pass" && !value.actualResult) {
      ctx.addIssue({
        code: "custom",
        path: ["actualResult"],
        message: "Describe what happened before recording this result.",
      });
    }
  });
export type SubmitTestResultValues = z.infer<typeof submitTestResultSchema>;

// ---- MCP tool input (Phase 8, "Claude-assisted execution") ----
// (04-CONFIG-BLUEPRINT.md, "MCP rules — Typed tool inputs")

export const mcpStartTestRunSchema = z.object({
  testRunId: z.string().trim().min(1, "testRunId (the run's public ID) is required."),
});
export type McpStartTestRunInput = z.infer<typeof mcpStartTestRunSchema>;

export const mcpSubmitTestResultSchema = z
  .object({
    testRunId: z.string().trim().min(1, "testRunId (the run's public ID) is required."),
    testCaseId: z.string().trim().min(1, "testCaseId (the test case's public ID) is required."),
    status: z.enum(["pass", "fail", "partial", "blocked"]),
    actualResult: z.string().trim().max(2000, "actualResult must be 2000 characters or fewer.").optional(),
    needsHumanReview: z.boolean().optional(),
    idempotencyKey: z.string().trim().max(120).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status !== "pass" && !value.actualResult) {
      ctx.addIssue({ code: "custom", path: ["actualResult"], message: "actualResult is required unless status is pass." });
    }
  });
export type McpSubmitTestResultInput = z.infer<typeof mcpSubmitTestResultSchema>;

export const mcpCompleteTestRunSchema = z.object({
  testRunId: z.string().trim().min(1, "testRunId (the run's public ID) is required."),
  summary: z.string().trim().max(500, "summary must be 500 characters or fewer.").optional(),
});
export type McpCompleteTestRunInput = z.infer<typeof mcpCompleteTestRunSchema>;
