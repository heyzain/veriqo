import { z } from "zod";

/**
 * Shared shapes for the Feature domain (Phase 4): MCP tool input validation
 * and the human-facing edit form. Client/server validation intentionally
 * share these schemas (03-CLAUDE-RULES.md, "Forms — Shared Zod schema where
 * client/server validation align").
 */

export const featureRiskSchema = z.enum(["low", "medium", "high"]);

export const featureSourceReferenceSchema = z.object({
  path: z.string().trim().min(1, "Add a file or module path.").max(300, "Keep it under 300 characters."),
  note: z.string().trim().max(300, "Keep it under 300 characters.").optional(),
});

// ---- MCP tool input (04-CONFIG-BLUEPRINT.md, "MCP rules — Typed tool inputs") ----

export const mcpCreateFeatureSchema = z.object({
  name: z.string().trim().min(2, "name must be at least 2 characters.").max(120, "name must be 120 characters or fewer."),
  description: z.string().trim().min(1, "description is required.").max(2000, "description must be 2000 characters or fewer."),
  risk: featureRiskSchema,
  acceptanceCriteria: z
    .array(z.string().trim().min(1).max(300))
    .min(1, "acceptanceCriteria must include at least one item.")
    .max(20, "acceptanceCriteria must include 20 items or fewer."),
  roles: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  dependencies: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  sourceReferences: z.array(featureSourceReferenceSchema).max(20).default([]),
  idempotencyKey: z.string().trim().max(120).optional(),
});
export type McpCreateFeatureInput = z.infer<typeof mcpCreateFeatureSchema>;

export const mcpUpdateFeatureSchema = z.object({
  featureId: z.string().trim().min(1, "featureId (the feature's public ID) is required."),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  risk: featureRiskSchema.optional(),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(300)).min(1).max(20).optional(),
  roles: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  dependencies: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  sourceReferences: z.array(featureSourceReferenceSchema).max(20).optional(),
});
export type McpUpdateFeatureInput = z.infer<typeof mcpUpdateFeatureSchema>;

export const featureStatusFilterSchema = z.enum([
  "draft",
  "needsReview",
  "approved",
  "changed",
  "archived",
]);

export const mcpListFeaturesSchema = z.object({
  status: featureStatusFilterSchema.optional(),
});
export type McpListFeaturesInput = z.infer<typeof mcpListFeaturesSchema>;

// ---- Human-facing edit form (native FormData; values stay strings so a ----
// ---- recoverable failure can repopulate the form via ActionState).     ----

export const featureEditFormSchema = z.object({
  name: z.string().trim().min(2, "Give the feature a name.").max(120, "Keep it under 120 characters."),
  description: z
    .string()
    .trim()
    .min(1, "Describe what this feature does.")
    .max(2000, "Keep it under 2000 characters."),
  risk: featureRiskSchema,
  acceptanceCriteria: z.string().trim().min(1, "Add at least one acceptance criterion, one per line."),
  roles: z.string(),
  dependencies: z.string(),
});
export type FeatureEditFormValues = z.infer<typeof featureEditFormSchema>;

export function parseAcceptanceCriteriaText(value: string): string[] {
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
