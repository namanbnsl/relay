// Capture a running production landing page and count scripts in the full server response.
import { readFile, writeFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.RELAY_PLAYWRIGHT_PACKAGE || "playwright"
);
const output = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({
  executablePath: process.env.RELAY_BROWSER_EXECUTABLE,
  headless: true,
  args: ["--no-sandbox"],
});
const results = [];
for (const [label, origin, root] of [
  ["before", process.env.RELAY_BASELINE_URL, process.env.RELAY_BASELINE_DIR],
  ["after", process.env.RELAY_APP_URL, process.env.RELAY_INTEGRATION_DIR],
]) {
  if (!origin || !root) continue;
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const response = await page.goto(origin, { waitUntil: "networkidle" });
  const html = await response.text();
  const sources = [
    ...new Set(
      [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)]
        .filter((m) => !m[0].includes("noModule"))
        .map((m) => m[1])
        .filter((src) => src.startsWith("/_next/")),
    ),
  ];
  const files = await Promise.all(
    sources.map(async (src) => {
      const file = path.join(root, ".next", src.slice(7));
      return {
        file: src,
        bytes: (await stat(file)).size,
        gzipBytes: gzipSync(await readFile(file)).byteLength,
      };
    }),
  );
  let violations = [];
  if (process.env.RELAY_AXE_SCRIPT) {
    await page.addScriptTag({ path: process.env.RELAY_AXE_SCRIPT });
    violations = await page.evaluate(async () =>
      (
        await window.axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        })
      ).violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    );
  }
  const widths = [];
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    widths.push({
      width,
      scrollWidth: await page.evaluate(
        () => document.documentElement.scrollWidth,
      ),
    });
    if (width !== 320)
      await page.screenshot({
        path: path.join(
          output,
          `previews/landing-${label}-${width === 1440 ? "desktop" : "mobile"}.png`,
        ),
        fullPage: true,
      });
  }
  await page.keyboard.press("Tab");
  results.push({
    label,
    firstPartyScriptCount: files.length,
    firstPartyScriptBytes: files.reduce((n, f) => n + f.bytes, 0),
    firstPartyScriptGzipBytes: files.reduce((n, f) => n + f.gzipBytes, 0),
    files,
    violations,
    widths,
    firstFocus: await page.locator(":focus").innerText(),
  });
  await page.close();
}
await writeFile(
  path.join(output, "landing-results.json"),
  JSON.stringify(results, null, 2),
);
console.log("Landing measurements and screenshots saved.");
await browser.close();
