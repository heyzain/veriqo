/**
 * The test-generation prompt (00-PRODUCT.md, "Generate test cases";
 * 02-BUILD-PHASES.md Phase 5). Prompts are versioned product assets, not
 * strings embedded in a button (04-CONFIG-BLUEPRINT.md, "Prompt
 * versioning") — `id`/`version` are stamped onto every `TestCase` this
 * prompt's instructions produce, by the server (see test-case-service.ts),
 * never trusted from the MCP caller.
 *
 * Two scopes share one renderer (00-PRODUCT.md, "Generate test cases"):
 *  - `full`: every approved feature in the project.
 *  - `selected`: a human-chosen subset of approved features.
 * Either way the prompt is scoped by risk, roles, environments, and
 * existing coverage so Claude extends rather than repeats what's already
 * recorded (Phase 5 Build: "Prompt composition based on scope, risk,
 * existing coverage, roles, and environments").
 */

export type TestGenerationScope = "full" | "selected";

export type TestGenerationContext = {
  project: {
    name: string;
    description: string;
    appUrl: string;
    environment: string;
    repository?: string;
  };
  scope: TestGenerationScope;
  /** The approved features in scope for this generation pass. */
  features: readonly {
    publicId: string;
    name: string;
    description: string;
    risk: string;
    roles: readonly string[];
    acceptanceCriteria: readonly string[];
  }[];
  /** Already-recorded cases for the in-scope features, so Claude extends rather than repeats coverage. */
  existingTestCases: readonly { publicId: string; featureId: string; title: string; status: string }[];
  /** Candidate execution environments, e.g. from the project's configured environment plus common browsers. */
  environments: readonly string[];
};

function renderBlock(context: TestGenerationContext): string {
  const { project, scope, features, existingTestCases, environments } = context;
  const blocks: string[] = [];

  blocks.push(
    scope === "full"
      ? `Generate test-case coverage for every approved feature of "${project.name}" and save it through the connected Veriqo MCP server.`
      : `Generate test-case coverage for ${features.length} selected feature${features.length === 1 ? "" : "s"} of "${project.name}" and save it through the connected Veriqo MCP server.`,
  );

  const projectContextLines = [
    `- Description: ${project.description}`,
    `- Application URL: ${project.appUrl}`,
    `- Environment: ${project.environment}`,
    project.repository ? `- Repository / path: ${project.repository}` : null,
  ].filter((line): line is string => Boolean(line));
  blocks.push(["Project context:", ...projectContextLines].join("\n"));

  if (features.length === 0) {
    blocks.push(
      "No approved features are in scope yet. Approve features on the Features page before generating test cases for them.",
    );
    return blocks.join("\n\n");
  }

  blocks.push(
    [
      "Features in scope — cover every acceptance criterion with at least one test case, and weight coverage depth by risk (more cases for `high` risk, fewer for `low`):",
      ...features.map((f) =>
        [
          `- ${f.publicId} (${f.risk} risk)${f.roles.length ? ` — roles: ${f.roles.join(", ")}` : ""}: ${f.name}`,
          ...f.acceptanceCriteria.map((c) => `  · ${c}`),
        ].join("\n"),
      ),
    ].join("\n"),
  );

  if (existingTestCases.length > 0) {
    blocks.push(
      [
        "Test cases already recorded for these features — call `update_test_case` for any of these you re-confirm or revise, never `create_test_case` again for the same behavior:",
        ...existingTestCases.map((t) => `- ${t.publicId} on ${t.featureId} (${t.status}): ${t.title}`),
      ].join("\n"),
    );
  }

  blocks.push(
    [
      "Candidate environments to distribute coverage across (not every case needs every environment):",
      ...environments.map((env) => `- ${env}`),
    ].join("\n"),
  );

  blocks.push(
    [
      "For every test case, provide:",
      "- `featureId` — the public ID of the feature it belongs to, e.g. `FEAT-07`",
      "- `title` — a short, specific description of the scenario",
      "- `priority` — `critical`, `high`, `medium`, or `low`, based on the acceptance criterion's importance and the feature's risk",
      "- `preconditions` — any required starting state, if not obvious (optional)",
      "- `steps` — the concrete, ordered steps to execute",
      "- `expectedResult` — the single, verifiable outcome that determines pass or fail",
      "- `roles` — the user role(s) this case exercises, if the feature varies by role (leave empty if none)",
      "- `environments` — which of the candidate environments above this case targets (leave empty if environment-independent)",
      "- `idempotencyKey` — a stable slug you generate for this exact call (e.g. `pv-07-vault-relock`), so a retried call after a network error never creates a duplicate",
    ].join("\n"),
  );

  blocks.push(
    "Every test case you save starts as `In review` — nothing you generate is auto-approved. A human reviews, edits, approves, duplicates, or archives it from here.",
  );

  return blocks.join("\n\n");
}

export const testGenerationPrompt = {
  id: "test-generation",
  version: 1,
  render: renderBlock,
} as const;
