import { expect, test } from "@playwright/test";

import { createProject, signUp, uniqueSuffix } from "./helpers";

/**
 * Critical flow 1 (02-BUILD-PHASES.md Phase 10): sign-up → create a
 * project → land on its overview → account settings are reachable → sign
 * out → sign back in with the same credentials.
 */
test("sign-up, create a project, and sign back in", async ({ page }) => {
  const suffix = uniqueSuffix();
  const user = await signUp(page, suffix);

  const project = await createProject(page, suffix);
  await expect(page.getByRole("heading", { name: project.name })).toBeVisible();

  // Account settings is reachable from the workspace shell's account menu.
  await page.goto("/account");
  await expect(page.getByText(user.email)).toBeVisible();
  await expect(page.getByRole("link", { name: "Download export (.json)" })).toBeVisible();

  // Sign out via the account menu's form, then sign back in. The dropdown
  // is portal-rendered, so its content must actually be open (not just the
  // trigger clicked) before the item inside it is addressed — otherwise a
  // click can land between the trigger opening and the portal mounting.
  await page.goto(`/projects/${project.slug}`);
  await page.getByRole("button", { name: `Account menu for ${user.name}` }).click();
  const accountMenu = page.getByRole("menu");
  await expect(accountMenu).toBeVisible();
  await accountMenu.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(/\/sign-in/, { timeout: 10_000 });

  await page.getByLabel("Email").fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/projects/, { timeout: 10_000 });

  // The project created above is still there, owned by this account.
  await page.goto(`/projects/${project.slug}`);
  await expect(page.getByRole("heading", { name: project.name })).toBeVisible();
});

test("an unauthenticated visitor is redirected away from a project route", async ({ page }) => {
  await page.goto("/projects/does-not-exist/mcp");
  await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
});
