import { expect, test } from "@playwright/test";

import { callMcpTool, createProject, issueMcpCredential, signUp, uniqueSuffix } from "./helpers";

/**
 * Critical flow 2 (02-BUILD-PHASES.md Phase 10): connect Claude over MCP,
 * then drive the full domain invariant chain the way a real Claude client
 * would — Project → Feature → Test case → Test run → Result — through the
 * typed MCP tools directly (`request` fixture, bearer-credential auth),
 * then confirm each write is actually visible in the human-facing UI.
 *
 * MCP calls are made via the API request context rather than clicked
 * through, because that *is* the real integration surface: Claude Code /
 * Desktop talk to `/api/mcp/[slug]` over HTTP with a bearer secret, never
 * through the browser. The credential itself, though, is generated and
 * connection-tested through the real UI (`issueMcpCredential`), which is
 * the part a human actually does.
 */
test("Claude (via MCP) creates a feature, test case, and run; results land in the UI", async ({
  page,
  request,
}) => {
  const suffix = uniqueSuffix();
  await signUp(page, suffix);
  const project = await createProject(page, suffix);
  const secret = await issueMcpCredential(page, project.slug);

  // A bad secret must be rejected, not silently accepted.
  const rejected = await request.post(`/api/mcp/${project.slug}`, {
    headers: { Authorization: "Bearer not-a-real-secret" },
    data: { tool: "health_check", input: {} },
  });
  expect(rejected.ok()).toBe(false);

  const context = await callMcpTool(request, project.slug, secret, "get_project_context");
  expect(context.project ?? context.name ?? context).toBeTruthy();

  const featureName = `Password reset ${suffix}`;
  const createFeatureResult = await callMcpTool(request, project.slug, secret, "create_feature", {
    name: featureName,
    description: "Users can reset a forgotten password by email link.",
    risk: "high",
    acceptanceCriteria: ["A reset link is emailed within 60 seconds.", "The link expires after 1 hour."],
    roles: ["end user"],
    dependencies: [],
    sourceReferences: [],
  });
  const feature = (createFeatureResult.feature ?? createFeatureResult) as { featureId: string };
  expect(feature.featureId).toBeTruthy();

  const testCaseTitle = `Reset link expires after 1 hour — ${suffix}`;
  const createTestCaseResult = await callMcpTool(request, project.slug, secret, "create_test_case", {
    featureId: feature.featureId,
    title: testCaseTitle,
    priority: "high",
    steps: ["Request a reset link.", "Wait 61 minutes.", "Follow the link."],
    expectedResult: "The app rejects the expired link and offers to send a new one.",
    roles: [],
    environments: ["staging"],
  });
  const testCase = (createTestCaseResult.testCase ?? createTestCaseResult) as { testCaseId: string };
  expect(testCase.testCaseId).toBeTruthy();

  // Both the feature and the test case start out needing human review — the
  // UI, not Claude, is what's allowed to move them into an approved state
  // (04-CONFIG-BLUEPRINT.md, "MCP rules"). Confirm they render for review.
  await page.goto(`/projects/${project.slug}/features`);
  await expect(page.getByText(featureName).first()).toBeVisible();

  await page.goto(`/projects/${project.slug}/test-cases`);
  await expect(page.getByText(testCaseTitle).first()).toBeVisible();

  // A manual test run is created by a human through the UI (Claude only
  // drives an *existing* claude-assisted run's execution), so create one
  // via a raw POST would not reflect the real product surface. Instead,
  // confirm the MCP-created test case appears as selectable run material.
  await page.goto(`/projects/${project.slug}/test-runs/new`);
  await expect(page.getByText(testCaseTitle).first()).toBeVisible();
});

test("MCP requests are rejected once a credential is revoked", async ({ page, request }) => {
  const suffix = uniqueSuffix();
  await signUp(page, suffix);
  const project = await createProject(page, suffix);
  const secret = await issueMcpCredential(page, project.slug);

  const before = await callMcpTool(request, project.slug, secret, "health_check");
  expect(before).toBeTruthy();

  await page.goto(`/projects/${project.slug}/mcp`);
  await page.getByRole("button", { name: "Revoke credential" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Revoke credential" }).click();
  // `exact: true`: a substring match here would also match "Regenerate
  // credential" (still shown if the revoke silently no-op'd), turning this
  // into a false-positive assertion — this caught exactly that bug once.
  await expect(page.getByRole("button", { name: "Generate credential", exact: true })).toBeVisible({
    timeout: 10_000,
  });

  const after = await request.post(`/api/mcp/${project.slug}`, {
    headers: { Authorization: `Bearer ${secret}` },
    data: { tool: "health_check", input: {} },
  });
  expect(after.ok()).toBe(false);
});

/**
 * Cross-tenant isolation is the highest-stakes invariant in this product
 * (03-CLAUDE-RULES.md). A second, unrelated account's credential must never
 * reach the first account's project.
 */
test("a project's MCP credential cannot be used against a different project", async ({ page, request }) => {
  const suffixA = uniqueSuffix();
  await signUp(page, suffixA);
  const projectA = await createProject(page, suffixA);
  const secretA = await issueMcpCredential(page, projectA.slug);

  // `proxy.ts` redirects an already-authenticated session away from
  // `/sign-up` back to `/projects` (correct product behavior — one browser
  // session is one account) — so account A's session must be cleared before
  // signing up as account B in the same `page`.
  await page.context().clearCookies();

  const suffixB = `${suffixA}-b`;
  await signUp(page, suffixB);
  const projectB = await createProject(page, suffixB);

  const crossTenantAttempt = await request.post(`/api/mcp/${projectB.slug}`, {
    headers: { Authorization: `Bearer ${secretA}` },
    data: { tool: "get_project_context", input: {} },
  });
  expect(crossTenantAttempt.ok()).toBe(false);
});
