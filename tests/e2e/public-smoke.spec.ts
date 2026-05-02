import { expect, test } from "playwright/test";

test.describe("Willing Ways public smoke", () => {
  test("homepage renders the voice-first entry points", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Willing Ways AI Counselor/i);
    await expect(
      page.getByRole("heading", {
        name: /Talk now, settle the moment, and get the next right step/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Start the Willing Ways AI call/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /family coaching modules/i }),
    ).toBeVisible();
  });

  test("login page exposes staff sign-in controls", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: /Sign in to Willing Ways operations/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sign in$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send magic link/i })).toBeVisible();
  });

  test("booking page renders the intake request form", async ({ page }) => {
    await page.goto("/book-session");

    await expect(
      page.getByRole("heading", { name: /Request a session, admission callback/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Your name")).toBeVisible();
    await expect(page.getByLabel("Phone number")).toBeVisible();
    await expect(page.getByLabel("Short summary")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send booking request/i }),
    ).toBeVisible();
  });

  test("family training page renders coaching modules", async ({ page }) => {
    await page.goto("/family-training");

    await expect(
      page.getByRole("heading", { name: /Short family practice sessions/i }),
    ).toBeVisible();
    await expect(page.getByText(/Use coaching for practice/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Start training call/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Start practice/i }).first(),
    ).toBeVisible();
  });

  test("staff login API returns a controlled JSON response without secrets", async ({
    request,
  }) => {
    const response = await request.post("/api/staff/login", {
      data: {},
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect([400, 429, 503]).toContain(response.status());
    expect(response.headers()["content-type"]).toContain("application/json");

    const body = (await response.json()) as { error?: unknown };
    expect(body.error).toEqual(expect.any(String));
  });
});
