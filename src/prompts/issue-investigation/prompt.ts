/**
 * The issue-investigation prompt (00-PRODUCT.md, "Turn failure into a
 * verified resolution"; 02-BUILD-PHASES.md Phase 7). Scoped to exactly one
 * issue — unlike feature discovery or test generation, investigation is
 * never a bulk pass. Prompts are versioned product assets, not strings
 * embedded in a button (04-CONFIG-BLUEPRINT.md, "Prompt versioning").
 */

export type IssueInvestigationContext = {
  project: {
    name: string;
    description: string;
    appUrl: string;
    environment: string;
    repository?: string;
  };
  issue: {
    publicId: string;
    title: string;
    severity: string;
    status: string;
  };
  feature: { publicId: string; name: string } | null;
  testCase: {
    publicId: string;
    title: string;
    steps: readonly string[];
    expectedResult: string;
  } | null;
  originResult: {
    actualResult: string | null;
    evidenceCount: number;
    build: string | null;
    environment: string | null;
    browser: string | null;
  } | null;
};

function renderBlock(context: IssueInvestigationContext): string {
  const { project, issue, feature, testCase, originResult } = context;
  const blocks: string[] = [];

  blocks.push(
    `Investigate ${issue.publicId} — "${issue.title}" — in the "${project.name}" codebase, then record what you find through the connected Veriqo MCP server.`,
  );

  const projectContextLines = [
    `- Description: ${project.description}`,
    `- Application URL: ${project.appUrl}`,
    `- Environment: ${project.environment}`,
    project.repository ? `- Repository / path: ${project.repository}` : null,
  ].filter((line): line is string => Boolean(line));
  blocks.push(["Project context:", ...projectContextLines].join("\n"));

  if (feature) {
    blocks.push(`Feature: ${feature.publicId} — ${feature.name}`);
  }

  if (testCase) {
    blocks.push(
      [
        `Failing test case: ${testCase.publicId} — ${testCase.title}`,
        "Steps:",
        ...testCase.steps.map((step, index) => `${index + 1}. ${step}`),
        `Expected result: ${testCase.expectedResult}`,
      ].join("\n"),
    );
  }

  if (originResult) {
    const originLines = [
      originResult.actualResult ? `- Actual result observed: ${originResult.actualResult}` : null,
      originResult.build ? `- Build: ${originResult.build}` : null,
      originResult.environment ? `- Environment: ${originResult.environment}` : null,
      originResult.browser ? `- Browser/device: ${originResult.browser}` : null,
      originResult.evidenceCount > 0
        ? `- ${originResult.evidenceCount} evidence file${originResult.evidenceCount === 1 ? "" : "s"} attached in Veriqo — review them there.`
        : null,
    ].filter((line): line is string => Boolean(line));
    if (originLines.length > 0) blocks.push(["What failed:", ...originLines].join("\n"));
  }

  blocks.push(
    [
      "Steps to take:",
      `1. Call \`update_issue_status\` with \`issueId: "${issue.publicId}"\` and \`status: "investigating"\` when you start.`,
      "2. Find the root cause in the codebase — trace the expected result above back to the responsible code.",
      "3. Apply a fix, or describe precisely what fix is needed if you can't apply it directly.",
      `4. Call \`record_issue_fix\` with \`issueId: "${issue.publicId}"\` and a \`fixNote\` explaining the root cause and what changed. This also moves the issue to Fix in progress.`,
      "5. Stop there — a human marks the issue ready for retest and creates the rerun. Verification only happens after that rerun passes; do not claim the issue is fixed or verified yourself.",
    ].join("\n"),
  );

  return blocks.join("\n\n");
}

export const issueInvestigationPrompt = {
  id: "issue-investigation",
  version: 1,
  render: renderBlock,
} as const;
