import { z } from "zod";

import type { ProjectEnvironment } from "@/types/domain";

export const projectEnvironments: readonly ProjectEnvironment[] = [
  "development",
  "staging",
  "production",
];

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Give the project a name.").max(80, "Keep it under 80 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Add a sentence describing what this project does.")
    .max(400, "Keep it under 400 characters."),
  appUrl: z.url("Enter a valid URL, including https://."),
  environment: z.enum(["development", "staging", "production"] as const, {
    error: "Choose an environment.",
  }),
  repository: z
    .string()
    .trim()
    .max(200, "Keep it under 200 characters.")
    .optional()
    .or(z.literal("")),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema;
export type UpdateProjectFormValues = z.infer<typeof updateProjectSchema>;

