import type { Page, APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";

/** A fresh, collision-free email/project name per test run. */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type SignedUpUser = {
  name: string;
  email: string;
  password: string;
};

/**
 * Signs up a brand-new user through the real form. `signUp` creates a
 * session immediately (see `src/server/services/auth-service.ts`), so no
 * email-verification step is required to continue — this matches the
 * product's own "Skip for now" affordance on `/verify-email`.
 */
export async function signUp(page: Page, suffix: string): Promise<SignedUpUser> {
  const user: SignedUpUser = {
    name: "Riley QA",
    email: `riley+${suffix}@example.com`,
    password: "Correcthorse1",
  };

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();

  // Session cookie is set on success; land somewhere authenticated.
  await page.waitForURL(/\/(verify-email|projects)/, { timeout: 10_000 });
  return user;
}

export type CreatedProject = {
  name: string;
  slug: string;
};

/**
 * Drives the two-step create-project wizard end to end and waits for the
 * redirect to the new project's overview page, reading the slug back out of
 * the resulting URL (`/projects/{slug}`).
 */
export async function createProject(page: Page, suffix: string): Promise<CreatedProject> {
  const name = `LinkVault E2E ${suffix}`;

  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(name);
  await page
    .getByLabel("Description")
    .fill("A QA workspace project created end-to-end by the Playwright suite.");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Application URL").fill("https://staging.example.com");
  await page.getByLabel("Repository or local path").fill("github.com/example/linkvault");
  await page.getByRole("button", { name: "Create project" }).click();

  // Note: `/projects/new` itself matches a naive `/projects/[^/]+$/` pattern
  // (the wizard's own URL, before it navigates anywhere), so `waitForURL`
  // must explicitly rule that value out or it resolves immediately against
  // the pre-submit page instead of waiting for the real redirect.
  await page.waitForURL((current) => /^\/projects\/[^/]+$/.test(current.pathname) && current.pathname !== "/projects/new", {
    timeout: 10_000,
  });
  const url = new URL(page.url());
  const slug = url.pathname.split("/").filter(Boolean).pop()!;
  return { name, slug };
}

/**
 * Generates an MCP credential through the real reveal-once dialog, runs the
 * UI's own "Test connection now" round trip (a genuine `health_check` MCP
 * call), and returns the plaintext secret for use in direct MCP simulation
 * of Claude's tool calls.
 */
export async function issueMcpCredential(page: Page, slug: string): Promise<string> {
  await page.goto(`/projects/${slug}/mcp`);
  await page.getByRole("button", { name: "Generate credential" }).click();

  const dialog = page.getByRole("dialog", { name: "Save this credential now" });
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  const secret = (await dialog.locator("pre").textContent())?.trim();
  if (!secret) throw new Error("MCP credential dialog did not render a secret.");

  await dialog.getByRole("button", { name: "Test connection now" }).click();
  await expect(dialog.getByRole("status")).toContainText("Connection verified", { timeout: 10_000 });

  await dialog.getByRole("button", { name: "I've saved it" }).click();
  await expect(dialog).toBeHidden();

  return secret;
}

/** One typed round trip to the MCP HTTP endpoint, simulating a Claude tool call. */
export async function callMcpTool(
  request: APIRequestContext,
  slug: string,
  secret: string,
  tool: string,
  input: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await request.post(`/api/mcp/${slug}`, {
    headers: { Authorization: `Bearer ${secret}` },
    data: { tool, input },
  });
  const body = (await response.json()) as { ok: boolean; error?: string; result?: Record<string, unknown> };
  if (!response.ok() || !body.ok) {
    throw new Error(`MCP tool "${tool}" failed (${response.status()}): ${body.error ?? "unknown error"}`);
  }
  return body.result ?? {};
}
