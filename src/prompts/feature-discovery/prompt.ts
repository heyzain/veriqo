/**
 * The feature-discovery prompt (00-PRODUCT.md, "Discover product features";
 * 02-BUILD-PHASES.md Phase 4). Prompts are versioned product assets, not
 * strings embedded in a button (04-CONFIG-BLUEPRINT.md, "Prompt
 * versioning") — `id`/`version` are stamped onto every `Feature` this
 * prompt's instructions produce, by the server (see feature-service.ts),
 * never trusted from the MCP caller.
 *
 * Two modes share one renderer:
 *  - Full discovery (`focusFeature` unset): analyze the whole codebase and
 *    call `create_feature`/`update_feature` for everything found.
 *  - Targeted regeneration (`focusFeature` set): re-analyze one existing
 *    feature and call `update_feature` for that public ID only — what the
 *    "Regenerate" action in the review UI composes.
 */

export type FeatureDiscoveryContext = {
  project: {
    name: string;
    description: string;
    appUrl: string;
    environment: string;
    repository?: string;
  };
  /** Already-known features, so Claude updates instead of re-creating them. */
  existingFeatures: readonly { publicId: string; name: string; status: string }[];
  focusFeature?: { publicId: string; name: string; description: string };
};

function renderBlock(context: FeatureDiscoveryContext): string {
  const { project, existingFeatures, focusFeature } = context;
  const blocks: string[] = [];

  blocks.push(
    focusFeature
      ? `Re-analyze one feature of the "${project.name}" codebase and update its record through the connected Veriqo MCP server.`
      : `Analyze the "${project.name}" codebase and save a structured feature inventory through the connected Veriqo MCP server.`,
  );

  const projectContextLines = [
    `- Description: ${project.description}`,
    `- Application URL: ${project.appUrl}`,
    `- Environment: ${project.environment}`,
    project.repository ? `- Repository / path: ${project.repository}` : null,
  ].filter((line): line is string => Boolean(line));
  blocks.push(["Project context:", ...projectContextLines].join("\n"));

  if (existingFeatures.length > 0) {
    blocks.push(
      [
        "Features already recorded for this project — call `update_feature` for any of these you re-confirm or revise, never `create_feature` again for the same behavior:",
        ...existingFeatures.map((f) => `- ${f.publicId} (${f.status}): ${f.name}`),
      ].join("\n"),
    );
  }

  blocks.push(
    focusFeature
      ? [
          `Focus only on **${focusFeature.publicId} — ${focusFeature.name}**:`,
          `> ${focusFeature.description}`,
          "",
          `Re-inspect the parts of the codebase responsible for this behavior, then call \`update_feature\` with \`featureId: "${focusFeature.publicId}"\` and any fields that should change. Do not create new features in this pass.`,
        ].join("\n")
      : "Identify every distinct, user-visible feature. For each one you have not already recorded, call `create_feature`. For one you have already recorded and can now describe more accurately, call `update_feature`.",
  );

  blocks.push(
    [
      "For every feature, provide:",
      "- `name` — a short, specific feature name",
      "- `description` — one or two sentences of what it does",
      "- `risk` — `low`, `medium`, or `high`, based on what breaking it would cost the user",
      "- `acceptanceCriteria` — 3 to 6 concrete, testable statements",
      "- `roles` — the user roles it behaves differently for, if any (leave empty if none)",
      "- `dependencies` — the public IDs of other features it depends on, if any",
      "- `sourceReferences` — file or module paths that are evidence for this feature, each with a short note",
      "- `idempotencyKey` — a stable slug you generate for this exact call (e.g. `discover-authentication`), so re-sending the same call after a network retry does not create a duplicate",
    ].join("\n"),
  );

  blocks.push(
    "Every feature you save starts as `Needs review` — nothing you generate is auto-approved. A human reviews, edits, approves, merges, or archives it from here.",
  );

  return blocks.join("\n\n");
}

export const featureDiscoveryPrompt = {
  id: "feature-discovery",
  version: 1,
  render: renderBlock,
} as const;
