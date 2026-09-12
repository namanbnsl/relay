// Uses the real UI with local fixtures; never connects to a live account.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright-core"
);
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:4173/projects/workspace_fixture";
await mkdir("/tmp/relay-ux", { recursive: true });
async function fits() {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Horizontal overflow",
  );
}
try {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto(base + "?view=discover");
    await page
      .getByRole("heading", { name: "Discover your next story." })
      .waitFor();
    await fits();
    await page.screenshot({
      path: `/tmp/relay-ux/discover-${width}.png`,
      fullPage: true,
    });
    assert(
      !/\b(Exa|Reconcile|provider)\b/i.test(
        await page.locator("main").innerText(),
      ),
    );
    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    await page.waitForFunction(
      () => document.activeElement?.labels?.[0]?.textContent === "Check for updates",
    );
    await page.getByLabel("Check for updates").selectOption("daily");
    await page.getByLabel("Start time").fill("18:30");
    await page.getByLabel("Timezone").selectOption("Asia/Kolkata");
    await fits();
    await page.screenshot({
      path: `/tmp/relay-ux/schedule-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Save schedule", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByText("Every day at 18:30 · Asia/Kolkata").waitFor();
    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    assert.equal(await page.getByLabel("Start time").inputValue(), "18:30");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement.textContent.trim() === "Schedule",
    );
    await page.getByRole("button", { name: /Following/ }).click();
    await page.getByRole("button", { name: "Follow a source" }).click();
    await page.getByLabel("Name", { exact: true }).fill("AI research papers");
    await page
      .getByLabel("What should Relay look for?")
      .fill("Practical results from new AI research");
    await page.getByLabel("Websites (optional)").fill("example.org");
    await page
      .getByRole("button", { name: "Follow source", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("heading", { name: "AI research papers" }).waitFor();
    await fits();
    await page.screenshot({
      path: `/tmp/relay-ux/following-${width}.png`,
      fullPage: true,
    });
    const source = page
      .locator("article")
      .filter({
        has: page.getByRole("heading", { name: "AI research papers" }),
      });
    await source.getByRole("button", { name: "Pause", exact: true }).click();
    await source.getByText("Paused", { exact: true }).waitFor();
    await source.getByRole("button", { name: "Resume" }).click();
    await source.getByRole("button", { name: "Pause", exact: true }).waitFor();
    await page.getByRole("button", { name: /For you/ }).click();
    await page.getByRole("button", { name: "Make this a topic" }).click();
    await page.getByRole("heading", { name: "The direction" }).waitFor();
    await fits();
    await page.screenshot({
      path: `/tmp/relay-ux/topic-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Edit brief" }).click();
    await page
      .getByLabel("Title", { exact: true })
      .fill("A clearer video idea");
    await page.getByRole("button", { name: "Save brief", exact: true }).click();
    await page.getByRole("heading", { name: "A clearer video idea" }).waitFor();
    await page.getByRole("button", { name: "Research paused" }).click();
    await page.getByLabel("When", { exact: true }).selectOption("scheduled");
    await page
      .getByRole("button", { name: "Save schedule", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByText(/Next starts/).waitFor();
    await page.getByRole("button", { name: "Research with my agent" }).click();
    await page
      .getByRole("heading", { name: "Continue with your agent" })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "All topics" }).click();
    await page.getByRole("button", { name: "New topic", exact: true }).click();
    await page
      .getByLabel("Title", { exact: true })
      .fill("How does caching work?");
    await page
      .getByLabel("Research question")
      .fill("What makes cached responses fast?");
    await page
      .getByRole("button", { name: "Create topic", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "How does caching work?" })
      .waitFor();
    await page.getByRole("button", { name: /3.*script/i }).click();
    await page.getByRole("heading", { name: "Research comes first" }).waitFor();
    await page.getByRole("button", { name: "View research" }).click();
    await page
      .getByRole("heading", { name: "Ready for a little discovery" })
      .waitFor();
    await page.goto(base + "?topic=topic_fixture&state=review");
    await page.getByText("Approval needs attention").waitFor();
    assert(
      await page.getByRole("button", { name: "Approve" }).isDisabled(),
      "Unsupported research must not be approvable",
    );
    await page
      .getByText("Finding 1: uncertain and no attached source.")
      .waitFor();
    await fits();
    await page.goto(base + "?view=discover&state=error");
    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    await page.getByLabel("Check for updates").selectOption("daily");
    await page.getByLabel("Start time").fill("21:45");
    await page
      .getByRole("button", { name: "Save schedule", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByLabel("Start time").inputValue(), "21:45");
    await fits();
    await page.screenshot({
      path: `/tmp/relay-ux/save-error-${width}.png`,
      fullPage: true,
    });
    await page.goto(base + "?state=error");
    await page.getByRole("button", { name: "New topic", exact: true }).click();
    await page.getByLabel("Title", { exact: true }).fill("Keep my topic after failure");
    await page.getByLabel("Research question").fill("Will my question survive a failed save?");
    await page.getByRole("button", { name: "Create topic", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "Keep my topic after failure");
    assert.equal(await page.getByLabel("Research question").inputValue(), "Will my question survive a failed save?");

  }
  assert.deepEqual(errors, []);
  console.log(
    "Passed: desktop/mobile scheduling, persisted UI values, focus return, sources, pause/resume, topic creation, brief editing, agent handoff, research/script navigation, save failure retention.",
  );
} catch (e) {
  console.error({ url: page.url() });
  await page.screenshot({ path: "/tmp/relay-ux/failure.png", fullPage: true });
  throw e;
} finally {
  await browser.close();
}
