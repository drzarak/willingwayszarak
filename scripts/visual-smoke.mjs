import fs from "node:fs/promises";
import path from "node:path";

import { chromium, devices } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.OUTPUT_DIR ?? path.join(process.cwd(), "artifacts", "visual-smoke");

const scenarios = [
  {
    name: "home-desktop-en",
    url: "/",
    viewport: { width: 1440, height: 1200 },
  },
  {
    name: "home-desktop-ur",
    url: "/",
    viewport: { width: 1440, height: 1200 },
    beforeScreenshot: async (page) => {
      await page.getByRole("button", { name: "اردو" }).first().click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: "home-mobile-en",
    url: "/",
    device: devices["iPhone 13"],
  },
  {
    name: "ai-mobile-ur",
    url: "/ai",
    device: devices["iPhone 13"],
    beforeScreenshot: async (page) => {
      await page.getByRole("button", { name: "اردو" }).last().click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: "ai-desktop-en",
    url: "/ai",
    viewport: { width: 1440, height: 1200 },
  },
  {
    name: "library-mobile-en",
    url: "/library",
    device: devices["iPhone 13"],
  },
];

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const results = [];

for (const scenario of scenarios) {
  const context = await browser.newContext(
    scenario.device
      ? { ...scenario.device }
      : { viewport: scenario.viewport },
  );
  const page = await context.newPage();

  await page.goto(`${baseUrl}${scenario.url}`, { waitUntil: "networkidle" });

  if (scenario.beforeScreenshot) {
    await scenario.beforeScreenshot(page);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  const welcomeModalVisible =
    (await page.getByText("New chat ready", { exact: false }).count()) > 0;

  const filePath = path.join(outputDir, `${scenario.name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });

  results.push({
    filePath,
    name: scenario.name,
    overflow,
    title: await page.title(),
    url: page.url(),
    welcomeModalVisible,
  });

  await context.close();
}

await browser.close();

console.log(JSON.stringify(results, null, 2));
