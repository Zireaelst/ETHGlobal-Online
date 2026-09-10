import { expect, test } from "@playwright/test";

const routes = ["/", "/how-it-works", "/proofs", "/providers", "/demo", "/docs", "/product", "/developers"];

test("all public routes render without horizontal overflow", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("landing links lead to the demo and proof pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pay AI agents for data they can verify." })).toBeVisible();
  await page.getByRole("link", { name: "Inspect the Proof" }).click();
  await expect(page).toHaveURL(/\/proofs$/);
  await expect(page.getByRole("heading", { name: "A narrow claim, made inspectable." })).toBeVisible();
});

test("simulation keeps warranty and payment receipts separate", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Simulation", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Invalid proof" }).click();
  await expect(page.getByText("Original payment receipt")).toBeVisible();
  await expect(page.getByText("Warranty receipt")).toBeVisible();
  await expect(page.getByRole("link", { name: /explorer|transaction/i })).toHaveCount(0);
});

test("mobile navigation opens and closes with Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only navigation behavior");
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.click();
  await expect(page.getByRole("dialog", { name: "Site navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Site navigation" })).toHaveCount(0);
  await expect(toggle).toBeFocused();
});
