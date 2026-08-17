import type { ProjectEnvironment } from "@/types/domain";

/**
 * Single source of truth for environment display labels
 * (03-CLAUDE-RULES.md, "No duplicated status maps in multiple files") —
 * shared by `ProjectRecordCard` and the project detail placeholder.
 */
export const projectEnvironmentLabel: Record<ProjectEnvironment, string> = {
  development: "Development",
  staging: "Staging",
  production: "Production",
};
