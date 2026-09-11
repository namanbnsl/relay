// Run against the isolated Vite fixture, never against a live account.
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright-core"
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const failures = [];
page.on("pageerror", (error) => failures.push(error.message));
const origin = "http://127.0.0.1:4173";
const output = "/tmp/relay-browser-verification";
await mkdir(output, { recursive: true });
try {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(origin);
    await page
      .getByRole("heading", { name: "Discover", exact: true })
      .waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `${output}/discover-${viewport.width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Create topic", exact: true })
      .click();
    await page
      .getByLabel("Title", { exact: true })
      .fill("An edited potential video");
    await page
      .locator("article form")
      .getByRole("button", { name: "Create topic", exact: true })
      .click();
    await page.getByRole("link", { name: "Open topic →" }).waitFor();
    await page.goto(origin);
    await page
      .getByRole("button", { name: "Attach to topic", exact: true })
      .click();
    await page.getByLabel("Existing topic").selectOption("topic_fixture");
    await page.getByRole("button", { name: "Attach context" }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    await page.getByRole("button", { name: /^sources$/i }).click();
    await page.getByRole("heading", { name: "Open model releases" }).waitFor();
    assert(await page.getByRole("button", { name: "Check now" }).isDisabled());
    await page.locator("summary").filter({ hasText: "+ Add source" }).click();
    await page
      .getByRole("textbox", { name: "Source name", exact: true })
      .fill("A monitored website");
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `${output}/sources-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto(`${origin}/?view=brief`);
    await page
      .locator("summary")
      .filter({ hasText: "Research settings" })
      .click();
    assert.equal(
      await page.getByLabel("IANA timezone").inputValue(),
      "Asia/Kolkata",
    );
    assert(await page.getByLabel("Pause daily research").isChecked());
    await page.getByLabel("Research frequency").selectOption("once");
    assert.equal(await page.getByLabel("IANA timezone").count(), 0);
    await page.getByLabel("Research frequency").selectOption("daily");
    await page.getByText("Waiting for agent", { exact: true }).waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `${output}/brief-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto(`${origin}/?state=error`);
    await page
      .locator("summary")
      .filter({ hasText: "Workspace settings" })
      .click();
    await page
      .getByLabel("Discovery brief")
      .fill("Keep these edits after a failed save");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(
      await page.getByLabel("Discovery brief").inputValue(),
      "Keep these edits after a failed save",
    );
    await page.screenshot({
      path: `${output}/error-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto(`${origin}/?state=empty`);
    await page.getByText("No updates yet", { exact: true }).waitFor();
    await page.goto(`${origin}/?state=loading`);
    await page.waitForTimeout(100);
    assert.equal(
      await page.getByRole("button", { name: "Create topic" }).count(),
      0,
    );
  }
  assert.deepEqual(failures, []);
  console.log(
    `Desktop/mobile fixture interactions passed. Screenshots: ${output}`,
  );
} catch (error) {
  console.error({
    url: page.url(),
    text: await page.locator("body").innerText(),
  });
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
}
