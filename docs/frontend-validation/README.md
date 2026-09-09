# Frontend validation

## Scope and limits

The public landing page was inspected in a real running production Next.js build. Workspace screenshots use the actual React components in an isolated browser harness with explicitly fictional local fixtures. The harness replaces only Clerk, navigation, and Convex transport; it never contacts a backend or writes workspace data. These screenshots demonstrate presentation, not completed research or a real authenticated connection.

No authenticated browser session or external-agent OAuth session was available. Live sign-in, actual MCP read/write/cleanup, paid provider execution, and ownership enforcement through the deployed service still need an end-to-end smoke test after the two branches are integrated. No WCAG certification or Lighthouse score is claimed.

## Checks

- `bun run lint`: passed for the frontend tree.
- `bun run typecheck` and `bun run build`: passed in the combined filesystem copy at `/tmp/relay-integration`. The frontend branch requires the other agent’s new backend API and schema; see the [integration instructions](../frontend-handoff.md).
- Axe 4.10.2: zero A/AA violations in tested public/workspace screens and checked dialogs. Test tags: WCAG 2 A/AA, 2.1 AA, 2.2 AA. Automated checks do not cover all success criteria.
- Playwright keyboard checks: skip link; initial project-name focus; Escape dismissal and return to the creating button; request-changes focus trapping; mobile-menu Escape behavior.
- Component behavior: continuous research/script typing retains focus; failed saves retain the editor and draft; save requests retain the base-version ID; project search/empty results; history expansion; source dialog; observed-activity state; test-marker removal; disconnected transport state.
- Reflow: landing and workspace checked at 1440px, 390px, and 320px without horizontal overflow. Reduced-motion suppression is retained in shared CSS. Real assistive-technology and browser-zoom testing remain release checks.
- Manual contrast review: dark text and muted text on paper surfaces; primary green with white text; opaque `#858d7e` control borders against the background (3.34:1). Muted text measures 5.64:1; primary-button text 8.31:1. Status meaning is also expressed in words.

Follow-up validation against the completed Phase 1 checkout: **all 21 tests pass** when running `bun run test` in `/home/namanb/code/relay`. App/backend typechecks and lint also pass in the combined frontend/backend copy. The previously reported `process is not defined` failures reproduce only in `/tmp/relay-integration`, which shares dependencies through a symlink; they do not reproduce in the actual backend checkout. The precise test-runner/path interaction has not been isolated. Do not treat that temporary-copy result as a confirmed backend defect. No backend code was changed to alter the test result.

The research agent reports Phase 1 deployed to **Convex development**, with deployed authentication checks and local HTTP checks passing. These deployment checks are reported by the other agent, not rerun by the frontend validation harness. Live Exa execution and authenticated browser/OAuth interaction remain unverified. No paid research call was made.

## Performance evidence

Before/after production measurements count unique first-party script references in the complete server HTML, excluding the legacy `noModule` polyfill. Gzip sizes are computed per file with Node’s gzip, not presented as measured network transfer or user-experienced latency. Third-party Clerk scripts, RSC payloads, CSS and fonts are outside this particular metric.

The final comparison is **802,049 → 646,534 raw bytes** and **242,079 → 191,733 gzip bytes** (20.8% smaller compressed), with 13 → 10 initial first-party script references. `landing-results.json` records the files and exact values. Transient DOM script-node counts were discarded because React removes script nodes during hydration, making that method inconsistent.

Changes responsible: Convex, tooltip, and toast providers moved into the authenticated layout; the public narrative remains server-rendered; the mono font uses one weight and is not preloaded. Editor findings no longer remount on every character, and dirty checking no longer serializes all source excerpts per keystroke. Packet and evidence subscriptions remain conditional on inspection. No broad memoization, virtualization, new runtime UI dependency, or fabricated timing score was added.

## Re-run

Use an environment with the project dependencies, Playwright, Chromium, and axe installed. The scripts also accept paths to existing installations so no new runtime dependency is required.

```sh
RELAY_INTEGRATION_DIR=/path/to/combined/build \
RELAY_PLAYWRIGHT_PACKAGE=/path/to/playwright-core/index.mjs \
RELAY_BROWSER_EXECUTABLE=/path/to/chromium \
RELAY_AXE_SCRIPT=/path/to/axe.min.js \
node docs/frontend-validation/check-ui.mjs
```

Build the baseline and combined work with `bun run build`, then serve them on separate ports using `next start`. For the public comparison:

```sh
RELAY_BASELINE_DIR=/path/to/baseline \
RELAY_BASELINE_URL=http://localhost:3103 \
RELAY_INTEGRATION_DIR=/path/to/combined/build \
RELAY_APP_URL=http://localhost:3104 \
RELAY_PLAYWRIGHT_PACKAGE=/path/to/playwright-core/index.mjs \
RELAY_BROWSER_EXECUTABLE=/path/to/chromium \
RELAY_AXE_SCRIPT=/path/to/axe.min.js \
node docs/frontend-validation/check-landing.mjs
```

Both scripts write results and screenshots beside this document. The UI harness has no production route and is not bundled into the app.

## Previews

- [Landing, desktop](previews/landing-after-desktop.png) · [mobile](previews/landing-after-mobile.png)
- [Projects, desktop](previews/projects-desktop.png) · [mobile](previews/projects-mobile.png)
- [Research, desktop](previews/research-desktop.png) · [mobile](previews/research-mobile.png)
- [Script, desktop](previews/script-desktop.png) · [mobile](previews/script-mobile.png)
- [Onboarding, desktop](previews/onboarding-desktop.png) · [mobile](previews/onboarding-mobile.png)

Workspace previews are local presentation fixtures. The landing preview is a capture of the actual public route; its embedded example is explicitly labeled illustrative in the product.
