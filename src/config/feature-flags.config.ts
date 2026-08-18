/**
 * Static feature flags for MVP scope control (04-CONFIG-BLUEPRINT.md).
 * Remove a flag once its rollout is stable — do not use flags to keep
 * abandoned code paths indefinitely.
 */
export const featureFlags = {
  darkMode: false,
  teamWorkspaces: false,
  billing: false,
  ciIntegrations: false,
  browserAutomation: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
