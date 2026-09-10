// Local presentation checks. Fixtures never contact Clerk, Convex, or research providers.
// Set RELAY_PLAYWRIGHT_PACKAGE and RELAY_BROWSER_EXECUTABLE if not installed normally.
import { build } from "esbuild";
import { mkdtemp, readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.RELAY_PLAYWRIGHT_PACKAGE || "playwright"
);
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const output = path.join(root, "docs/frontend-validation");
const integration = process.env.RELAY_INTEGRATION_DIR || root;
const temp = await mkdtemp(path.join(tmpdir(), "relay-ui-"));
const fixtures = `
const project={_id:'project-test',name:'The weekly explainer',_creationTime:1788912000000};
const topic={_id:'topic-test',projectId:project._id,title:'Why pages load faster the second time',question:'Explain browser caching to a curious nontechnical audience.',_creationTime:1788912000000};
const research={_id:'research-test',topicId:topic._id,_creationTime:1788912000000,summary:'A browser can reuse a saved response instead of downloading the same resource again. Cache rules determine whether a saved response is still fresh.',review:{kind:'pending'},claims:[{text:'Fresh cached responses can be reused without contacting the origin.',assessment:'supported',note:'Review the scope of the freshness rules.',evidence:[{url:'https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching',title:'HTTP caching · MDN',excerpt:'Illustrative source excerpt for UI testing only.',retrievedAt:1788912000000}]}]};
const script={_id:'script-test',topicId:topic._id,researchVersionId:research._id,_creationTime:1788912000000,title:'The second visit',review:{kind:'pending'},scenes:[{narration:'The first visit takes a journey. The next one might take a shortcut.',visual:'Show a request path, then a saved response.'}]};
window.fixture={project,topic,research,script};window.commands=[];
`;
const mockedData = `
import {useSyncExternalStore} from 'react';
const subscribe=cb=>{window.addEventListener('fixture',cb);return ()=>window.removeEventListener('fixture',cb)};
const version=()=>window.fixtureVersion??0;
export const useConvexAuth=()=>({isAuthenticated:true});
export const useConvexConnectionState=()=>({isWebSocketConnected:new URLSearchParams(location.search).get('state')!=='offline'});
export function useQuery(api,args){
 useSyncExternalStore(subscribe,version,version);
 if(args==='skip')return;
 const state=new URLSearchParams(location.search).get('state');
 const f=window.fixture;
 switch(args.command.kind){
 case 'projects':return {kind:'projects',projects:state==='empty'?[]:[f.project]};
 case 'project':return {kind:'project',project:f.project,topics:state==='empty'?[]:[f.topic]};
 case 'topic':return {kind:'topic',topic:f.topic,research:[f.research],scripts:[f.script]};
 case 'topic_runs':return {kind:'topic_runs',setup:{kind:'unavailable',reason:'Research is not configured for this fixture.'},runs:[]};
 }
}
export const useMutation=()=>async args=>{
 window.commands.push(args.command);
 if(window.failWrite)throw new Error('Test failure');
 return {id:'topic-test'};
};`;
await writeFile(
  path.join(temp, "entry.jsx"),
  `
import React from 'react';import {createRoot} from 'react-dom/client';
import {Projects,Project,Research,ScriptDocument,TopicHistory} from '${root}/components/projects/live-projects.tsx';
import {ProjectFrame} from '${root}/components/projects/project-frame.tsx';
${fixtures}
const mode=new URLSearchParams(location.search).get('view');
createRoot(document.getElementById('root')).render(mode==='research'?<ProjectFrame title={topic.title}><h1>Research review</h1><TopicHistory tab="research" research={[research]} scripts={[]}/><div className="workspace-document"><Research row={research}/></div></ProjectFrame>:mode==='script'?<ProjectFrame title={topic.title}><h1>Script review</h1><div className="workspace-document"><ScriptDocument row={script} research={[{...research,review:{kind:'approved'}}]}/></div></ProjectFrame>:mode==='project'?<Project projectId={project._id}/>:<Projects/>);
`,
);
await build({
  entryPoints: [path.join(temp, "entry.jsx")],
  outfile: path.join(temp, "app.js"),
  bundle: true,
  format: "iife",
  jsx: "automatic",
  tsconfig: path.join(root, "tsconfig.json"),
  nodePaths: [path.join(root, "node_modules")],
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "presentation-fixtures",
      setup(builder) {
        builder.onResolve(
          {
            filter:
              /^(convex\/react|@clerk\/nextjs|next\/link|next\/navigation)$/,
          },
          (args) => ({ path: args.path, namespace: "fixtures" }),
        );
        builder.onLoad({ filter: /.*/, namespace: "fixtures" }, (args) => ({
          loader: "jsx",
          resolveDir: root,
          contents:
            args.path === "convex/react"
              ? mockedData
              : args.path === "@clerk/nextjs"
                ? `import React from 'react';export const UserButton=()=> <button aria-label="Account settings" className="workspace-mark">N</button>;`
                : args.path === "next/link"
                  ? `import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`
                  : `export const usePathname=()=>'/projects';export const useSearchParams=()=>new URLSearchParams(location.search);`,
        }));
        builder.onLoad({ filter: /live-projects\.tsx$/ }, async (args) => ({
          loader: "tsx",
          contents:
            (await readFile(args.path, "utf8")) +
            "\nexport { Research, ScriptDocument, TopicHistory };",
        }));
      },
    },
  ],
});
const cssDir = path.join(integration, ".next/static/css");
const cssFiles = (await readdir(cssDir)).filter((f) => f.endsWith(".css"));
await writeFile(
  path.join(temp, "style.css"),
  (
    await Promise.all(
      cssFiles.map((f) => readFile(path.join(cssDir, f), "utf8")),
    )
  ).join("\n"),
);
await writeFile(
  path.join(temp, "index.html"),
  '<!doctype html><html lang="en" class="__variable_3d9088 __variable_13aeb3"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relay · Isolated presentation fixtures</title><link rel="stylesheet" href="style.css"></head><body><div id="root"></div><script src="app.js"></script></body></html>',
);
await mkdir(path.join(output, "previews"), { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.RELAY_BROWSER_EXECUTABLE,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("http://relay-ui.test/**", async (route) => {
  const url = new URL(route.request().url());
  const file = url.pathname.startsWith("/_next/")
    ? path.join(integration, ".next", url.pathname.slice(7))
    : path.join(
        temp,
        url.pathname === "/" ? "index.html" : url.pathname.slice(1),
      );
  await route.fulfill({
    path: file,
    contentType: file.endsWith(".js")
      ? "application/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : file.endsWith(".woff2")
          ? "font/woff2"
          : "text/html",
  });
});
const results = [];
const checkAxe = async (label) => {
  if (!process.env.RELAY_AXE_SCRIPT) return;
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))));
  await page.addScriptTag({ path: process.env.RELAY_AXE_SCRIPT });
  const violations = await page.evaluate(async () =>
    (
      await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      })
    ).violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => ({ target: n.target, reason: n.failureSummary })),
    })),
  );
  results.push({ label, violations });
  assert.deepEqual(violations, []);
};
for (const view of [
  "projects",
  "project",
  "research",
  "script",
]) {
  await page.goto("http://relay-ui.test/?view=" + view);
  await page.waitForSelector("h1");
  await page.evaluate(() => document.fonts.ready);
  await checkAxe(view);
  await page.screenshot({
    path: path.join(output, `previews/${view}-desktop.png`),
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `${view} overflow at ${width}`,
    );
    if (width === 390)
      await page.screenshot({
        path: path.join(output, `previews/${view}-mobile.png`),
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (view === "projects") {
    await page
      .getByRole("button", { name: "New project", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.locator(":focus").getAttribute("name"), "name");
    await page.getByLabel("Name", { exact: true }).fill("A new project");
    await checkAxe("create project dialog");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await page.locator(":focus").innerText(), "New project");
    await page.getByRole("searchbox").fill("No match");
    assert.equal(
      await page.getByRole("heading", { name: "No matching projects" }).count(),
      1,
    );
  }
  if (view === "research" || view === "script") {
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const field = page.getByLabel(
      view === "research" ? "Finding 1" : "Scene 1 narration",
      { exact: true },
    );
    await field.focus();
    await page.keyboard.press("End");
    await page.keyboard.type(" Testing continuous typing.", { delay: 10 });
    assert.equal(
      await field.evaluate((el) => el === document.activeElement),
      true,
    );
    assert.match(await field.inputValue(), /Testing continuous typing\.$/);
    await page.evaluate(() => {
      window.failWrite = true;
    });
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(await field.count(), 1);
    assert.equal(
      await page.evaluate(() => window.commands.at(-1).baseId),
      view === "research" ? "research-test" : "script-test",
    );
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "Request changes", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    assert.equal(
      await page
        .locator(":focus")
        .evaluate((el) => !!el.closest('[role="dialog"]')),
      true,
    );
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
  if (view === "research") {
    await page.getByRole("button", { name: "Document history" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("dialog").locator("summary").click();
    assert.equal(
      await page.getByRole("dialog").getByText("Key findings").count(),
      1,
    );
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "1 source", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await checkAxe("source dialog");
    await page.keyboard.press("Escape");
  }
  results.push({
    view,
    checks:
      "desktop and 390/320px layouts; applicable editing, search, dialogs, history and error checks passed",
  });
}
await page.goto("http://relay-ui.test/?view=projects&state=empty");
await page
  .getByRole("heading", { name: "A home for your next idea" })
  .waitFor();
await page.setViewportSize({ width: 320, height: 844 });
await page.getByText("Menu", { exact: true }).click();
await page.keyboard.press("Escape");
assert.equal(await page.locator("details").getAttribute("open"), null);
await page.goto("http://relay-ui.test/?view=projects&state=offline");
await page.getByRole("status").filter({ hasText: "Reconnecting" }).waitFor();
results.push({
  states:
    "empty projects and disconnected workspace passed",
});
assert.deepEqual(errors, []);
await writeFile(
  path.join(output, "workspace-results.json"),
  JSON.stringify({ results, errors }, null, 2),
);
await browser.close();
console.log("Workspace presentation checks passed.");
