<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:relay-design-rules -->

# Relay interface work

`DESIGN.md` is the normative source for Relay's visual direction, interaction
taste, layout, typography, color, motion, density, and responsive behavior.

Before planning, reviewing, or editing any user-facing interface:

1. Read `DESIGN.md` completely.
2. Follow its rules in shared primitives and semantic tokens before adding
   page-local exceptions.
3. Treat explicit instructions from the current user as higher priority. Do
   not silently diverge from `DESIGN.md`; update the document when the user
   intentionally changes the system.
4. Keep `app/globals.css` genuinely global and use Tailwind utilities for page
   and component layout.
5. Inspect the rendered result in the browser. Verify alignment, interactive
   states, and horizontal overflow at 1440px, 390px, and 320px.

Older references, including `public/DESIGN_SYSTEM.html`, are historical unless
`DESIGN.md` explicitly points to them. Do not revive superseded palettes,
decorative treatments, or layout patterns from those files.

<!-- END:relay-design-rules -->
