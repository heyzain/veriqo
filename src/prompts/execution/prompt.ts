/**
 * The Claude-assisted execution prompt (00-PRODUCT.md, "Claude-assisted:
 * prompt-based assistance with incoming results and human-review flags";
 * 02-BUILD-PHASES.md Phase 8). Scoped to one run and its selected test
 * cases, in run order. Prompts are versioned product assets, not strings
 * embedded in a button (04-CONFIG-BLUEPRINT.md, "Prompt versioning").
 */

export type ExecutionContext = {
  project: {
    name: string;
    description: string;
    appUrl: string;
    environment: string;
    repository?: string;
  };
  testRun: {
    publicId: string;
    name: string;
    build: string;
    environment: string;
    browser: string;
  };
  testCases: readonly {
    publicId: string;
    title: string;
    preconditions?: string;
    steps: readonly string[];
    expectedResult: string;
    roles: readonly string[];
  }[];
};

function renderBlock(context: ExecutionContext): string {
  const { project, testRun, testCases } = context;
  const blocks: string[] = [];

  blocks.push(
    `Execute ${testRun.publicId} — "${testRun.name}" — against "${project.name}" and submit each result through the connected Veriqo MCP server as you go, not all at once at the end.`,
  );

  const projectContextLines = [
    `- Description: ${project.description}`,
    `- Application URL: ${project.appUrl}`,
    project.repository ? `- Repository / path: ${project.repository}` : null,
  ].filter((line): line is string => Boolean(line));
  blocks.push(["Project context:", ...projectContextLines].join("\n"));

  blocks.push(
    [
      "Run context — test against exactly this target, and say so in your results if you can't:",
      `- Build: ${testRun.build}`,
      `- Environment: ${testRun.environment}`,
      `- Browser / device: ${testRun.browser}`,
    ].join("\n"),
  );

  blocks.push(
    [
      `Test cases in run order (${testCases.length} total):`,
      ...testCases.map((tc) =>
        [
          `- ${tc.publicId}: ${tc.title}${tc.roles.length ? ` (roles: ${tc.roles.join(", ")})` : ""}`,
          tc.preconditions ? `  Preconditions: ${tc.preconditions}` : null,
          ...tc.steps.map((step, index) => `  ${index + 1}. ${step}`),
          `  Expected: ${tc.expectedResult}`,
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
      ),
    ].join("\n"),
  );

  blocks.push(
    [
      "Steps to take:",
      `1. Call \`start_test_run\` with \`testRunId: "${testRun.publicId}"\` once, before your first result.`,
      "2. For each test case, execute its steps against the running application, then call `submit_test_result` with:",
      "   - `testRunId` and `testCaseId` (public IDs)",
      "   - `status` — `pass`, `fail`, `partial`, or `blocked`",
      "   - `actualResult` — what actually happened; required unless `status` is `pass`",
      "   - `needsHumanReview: true` when you're not confident in the result — ambiguous UI behavior, a step you couldn't complete as written, or an outcome you could only partly verify. Leave it `false` (or omit it) when you're confident.",
      "   - `idempotencyKey` — a stable slug you generate per test case (e.g. `" +
        (testCases[0] ? `${testRun.publicId.toLowerCase()}-${testCases[0].publicId.toLowerCase()}` : "run-case") +
        "`), so a retried call after a network error never double-submits",
      `3. Call \`complete_test_run\` with \`testRunId: "${testRun.publicId}"\` and a one- or two-sentence \`summary\` once you've gone through every case, even if some still need human review.`,
      "4. Do not mark anything Verified or otherwise close out an issue yourself — that only happens after a human reviews the run and, for a rerun, only if the case actually passes.",
    ].join("\n"),
  );

  return blocks.join("\n\n");
}

export const executionPrompt = {
  id: "execution",
  version: 1,
  render: renderBlock,
} as const;
