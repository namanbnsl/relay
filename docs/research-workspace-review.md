# Research workspace design review

## Scope and coverage

Reviewed the local research workspace: Discover, Topics, Sources, research evidence, and drafts. Stack: Next.js 16.3.4, React, Tailwind v4, existing shadcn/Radix primitives. Read AGENTS.md, CLAUDE.md, DESIGN.md, and the accessibility, layout, writing, typography, colors, and UI skills. This was an implementation and screen review; landing pages and authentication flows were excluded.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Native controls, labels, live region, heading/main landmarks, mobile drawer DOM and evidence focus | Source fixes complete; full keyboard and screen-reader traversal not verified |
| Layout | Shared page structure; live desktop and narrow-page bounds | No horizontal overflow in measured states; exact 320px and 200% zoom not verified |
| Writing | Workspace, source, research, and draft copy | Repeated explanations removed; essential sample disclosure retained |
| Typography | Live Discover headings, source/editor styles, content widths | 24px page heading and 16px story headings confirmed; shared leading edge confirmed |
| Colors | Live computed text/background pairs and mobile drawer foreground | Primary 16.29:1; secondary 5.33:1 on white; neutral drawer foreground confirmed |
| UI | Tabs, source rows, evidence panel, draft preview, native controls | Shared control treatment; contextual content replaces permanent help panels |

## Findings addressed

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| MEDIUM | Colors | `app/globals.css:87`, `components/app-shell.tsx:70` | Computed body foreground remained tinted despite local token overrides | Scope paints its own neutral foreground and also reaches mobile navigation | A token override alone does not change an inherited computed color |
| MEDIUM | Layout | `components/projects/research-workspace.tsx:204`, `components/projects/topic-detail.tsx:389` | Permanent explanatory columns and several competing containers | Shared list/document canvas; evidence appears when selected | Keep attention on the active task |
| MEDIUM | Writing | `components/app-shell.tsx:165`, `components/projects/workspace-draft.tsx:60` | Repeated sample banners, editorial instructions, and template explanations | One sample disclosure; contextual format settings | Explain once, where the information matters |
| MEDIUM | UI | `components/ui/input.tsx:11` | Undefined `border-input` token and a separate shadow/focus treatment | Existing border token and consistent neutral focus styling | Controls now use the product's actual token system |
| MEDIUM | Accessibility | `components/ui/sidebar.tsx:194` | Focus restoration depended on how the drawer was closed | Restore through the dialog's close-auto-focus lifecycle | Covers destination selection as well as dismissal; full keyboard verification remains pending |
| LOW | Typography | `components/projects/workspace-ui.tsx:8` | Several page-heading sizes and repeated metadata layers | Shared heading, spacing, and underline navigation | Prevent presentation from drifting between views |

## Verification

Passed:

- `bun run typecheck`
- `bun run lint`
- `bun run build` (production webpack build)
- `bun test components/projects/workspace-model.test.ts` (four tests)
- `git diff --check`
- Live browser DOM activation: open permissions research → inspect flagged claim → apply qualified wording → approve v2 → create draft from v2 → approve draft. The disputed state blocked approval; the correction enabled it.
- Live evidence selection focused the evidence panel at a narrow width.
- Mobile drawer opened at 272px wide with a neutral foreground. Selecting Sources changed the page and closed the drawer.
- Measured no horizontal overflow on Discover at 1402px, research/evidence/drafts at 427px, and Sources at 351px. Measurements used `innerWidth` and `documentElement.scrollWidth` rather than trusting requested preview dimensions.
- Discover's page heading and all story headings shared the same measured leading edge. Page and story heading sizes measured 24px and 16px.
- Computed primary/secondary text on white: 16.2933:1 and 5.3292:1. The inspected page had one main landmark and one h1.

Not verified:

- Reliable pointer automation, full keyboard navigation, screen-reader traversal, and final focus restoration after the source fix. The browser transport intermittently failed; workflow checks used DOM activation of real controls.
- Exact 320px/390px viewport and 200% browser zoom. Resize requests intermittently timed out or produced different measured dimensions.
- Consistent final screenshots across every state. Screenshot capture was intermittent; rendered DOM/style evidence was used where images were unavailable.
- Clipboard access on the preview's non-secure HTTP address. The existing manual-copy fallback remains.

## Verdict

Approve for the inspected presentation and workflow states. No confirmed HIGH finding remains in that coverage. This is not a complete accessibility or cross-viewport sign-off; the unverified checks above remain explicit.
