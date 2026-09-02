---
version: "alpha"
name: Relay Production Chain
description: "A light production workspace for moving evidence-backed video from research through approval, rendering, and publication."
implementation:
  styling: "Tailwind CSS v4 utilities"
  primitives: "shadcn/ui"
  globalCss: "Semantic tokens, base typography, accessibility defaults, and scrollbar styling only"
colors:
  primary: "#20221D"
  on-primary: "#FCFCF7"
  canvas: "#F1F2E9"
  surface: "#FCFCF7"
  surface-subtle: "#E7E9DE"
  text-secondary: "#62665B"
  border: "#CED1C4"
  border-strong: "#999E8E"
  accent: "#DDF45B"
  accent-subtle: "#F2F8C9"
  focus: "#56660A"
  danger: "#A64035"
  danger-subtle: "#F4DFD9"
  success: "#256248"
typography:
  display:
    fontFamily: "Instrument Sans, Aptos, sans-serif"
    fontSize: 2.75rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.05em
  heading-lg:
    fontFamily: "Instrument Sans, Aptos, sans-serif"
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.035em
  heading-sm:
    fontFamily: "Instrument Sans, Aptos, sans-serif"
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.018em
  body:
    fontFamily: "Instrument Sans, Aptos, sans-serif"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.012em
  label:
    fontFamily: "Instrument Sans, Aptos, sans-serif"
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.008em
  caption:
    fontFamily: "Instrument Sans, Aptos, sans-serif"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: -0.006em
  mono:
    fontFamily: "IBM Plex Mono, Cascadia Mono, monospace"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: -0.01em
rounded:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  full: 999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
components:
  app-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.5}"
  panel-subtle:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "{spacing.4}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    borderColor: "{colors.primary}"
    typography: "{typography.heading-sm}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 2px 0 #090A08"
    transition: "200ms cubic-bezier(0.22, 1, 0.36, 1)"
  button-primary-hover:
    backgroundColor: "#35382F"
    textColor: "#FFFFFF"
    borderColor: "#35382F"
    transform: "translateY(-1px)"
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 3px 0 #090A08"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    borderColor: "{colors.border-strong}"
    typography: "{typography.heading-sm}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 1px 0 rgba(32,34,29,0.06)"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    borderColor: "{colors.primary}"
    typography: "{typography.heading-sm}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 2px 0 {colors.primary}"
  text-selection:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "40px"
  focus-ring:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.focus}"
    rounded: "{rounded.md}"
  destructive-action:
    backgroundColor: "{colors.danger-subtle}"
    textColor: "{colors.danger}"
    typography: "{typography.heading-sm}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  success-status:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "0"
  divider:
    backgroundColor: "{colors.border}"
    textColor: "{colors.primary}"
    height: "1px"
  selection-boundary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    width: "2px"
  keycap:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.mono}"
    rounded: "{rounded.xs}"
    padding: "2px 5px"
  metadata:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: "2px 6px"
  tooltip:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  heading:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.heading-lg}"
  display-copy:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.display}"
  border-preview:
    backgroundColor: "{colors.border-strong}"
    textColor: "{colors.primary}"
    rounded: "{rounded.xs}"
---

## Overview

Relay should feel like a well-made production tool that keeps every handoff legible. Research, content, generated media, review decisions, and publishing records remain connected without turning the workspace into a generic dashboard.

`public/DESIGN_SYSTEM.html` remains the visual source for Relay's palette, typography, grid, and control construction. This document is the current normative specification. The reference's decorative hero highlighter is deprecated and must not be carried into product or marketing screens.

The visual language comes directly from the reference system: mineral paper, carbon ink, and chalk surfaces. Citron marks the current workflow focus, selection, or one preferred action. It is never decorative emphasis. Most screens remain nearly monochrome.

Trust is part of the interface. Every approval names an exact artifact version and content hash. Any revision invalidates the prior approval. Costly generation and public publishing name their consequence and require explicit confirmation.

## Colors

The canvas has a muted mineral-green cast rather than beige or neutral gray. The surface is a soft chalk white. Carbon ink carries the hierarchy. Citron is a functional signal for the one thing that is selected or ready to advance.

- Use `primary` for headings, body text, and the strongest local controls.
- Use `accent` for quiet selected backgrounds.
- Use bright citron for workflow focus and one preferred action.
- The landing page may use citron for its single preferred call to action.
- Native text selection uses citron with carbon text.
- Use `focus` for keyboard rings. Citron is too light to form an accessible outline.
- Use `danger` only for destructive actions, failed jobs, and irreversible consequences.
- Use `success` for completed approvals, renders, or publication. Pair color with exact text.
- Prefer `border` for dividers. Use `border-strong` for interactive boundaries.

Large reading surfaces use `canvas`. Small interactive surfaces use `surface`. Do not stack multiple white panels merely to create hierarchy.

## Typography

Use Instrument Sans throughout the interface. Its compact forms and open counters keep dense operational controls readable without resembling default system UI. Bundle the variable font so Relay never fetches it at runtime. Use IBM Plex Mono for content hashes, version IDs, timestamps, provider job IDs, and short technical identifiers only.

Headings are compact and slightly tightened. Body copy stays at 14px with a 1.5 line height. Do not shrink supporting text below 12px. Sentence case is the default for every heading, label, and button.

Use the display role once on onboarding, an empty state, or a design-system introduction. Product screens normally start with `heading-lg`. Use weight to establish hierarchy before adding size.

## Layout

Build on a 4px base unit. Common gaps are 8px within a control, 12px within a compact group, 16px within a panel, 24px between related groups, and 32px between sections.

The reference layout uses a 12-column grid with 24px gutters inside a 1120px maximum-width main region. Documentation pages use 56px horizontal padding and 72px initial vertical padding; section bands use 64px vertical padding and one `border` divider. At 900px use 32px page padding. At 660px use 20px page padding, stack all grid regions, and reduce section padding to 48px.

Reference introductions place primary copy across eight columns and compact metadata in columns ten through twelve. Display headings use `clamp(42px, 6vw, 68px)`, `0.98` line height, and `-0.055em` letter spacing. Supporting ledes use 17px type, `1.55` line height, and a maximum width of 640px.

Wide workspace screens may use a 64px product rail or a 240px documentation rail. Keep the primary reading column between 640px and 760px when the window allows. Video players, review timelines, provenance diagrams, and evidence tables may use the remaining width.

Every screen has one clear focal object:

- Research: the claim and its supporting sources.
- Content: the exact script or scene being reviewed.
- Production: the active job and honest operational state.
- Review: the current video frame and nearest unresolved comment.
- Publish: the approved file, destination, visibility, and scheduled time.

Keep content aligned to shared edges. Avoid centered application layouts except for small empty states. Do not use a dashboard grid when a list-and-detail or artifact-and-decision layout explains the workflow better.

## Tailwind implementation

Build page and component layout with Tailwind CSS v4 utilities directly in React markup. Keep `app/globals.css` limited to semantic theme variables, font and rendering defaults, reduced-motion behavior, selection color, and native scrollbar styling. Do not recreate page-specific class systems in global CSS.

Use semantic utilities such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, and `ring-ring`. Arbitrary values are appropriate when encoding an exact system value that is not part of Tailwind's default scale, such as the 68px display cap, 0.98 line height, or 24px twelve-column gutter. Shared interactive behavior belongs in the shadcn primitive, not duplicated across pages.

## Elevation and depth

Use borders, spacing, and surface changes before shadow. Relay is flat at rest except for the shallow tactile edge on buttons shown in the canonical reference.

Buttons use only their specified 1–3px edge shadows. Reserve larger shadow for temporary layers and the selected artifact inside a review frame. Use one restrained floating shadow: `0 14px 36px rgba(32, 34, 29, 0.12), 0 2px 8px rgba(32, 34, 29, 0.06)`.

A panel must not contain another elevated panel. Nested content uses a divider or `surface-subtle` fill.

## Shapes

Controls use a 10px radius. Content panels and media previews use 10px or 14px. Small controls may use 6px. The radius never becomes the main visual idea.

Use a full radius only for a short status mark when it materially improves scanning. Ordinary metadata, filters, versions, and navigation items are not pills.

Icons use a 1.75px stroke at 16px or 18px. Prefer familiar actions. Do not place icons inside decorative colored squares.

## Components

Buttons are 36px high, use 13px semibold text, a 10px radius, a 1px boundary, 14px horizontal padding, and a 7px internal gap. The surface button has a `border-strong` boundary and shallow white/ink edge. On hover it moves up 1px, changes to `#F4F5ED`, and strengthens its boundary to `#7F8475`. Active buttons return to rest and remove the edge shadow. Color, border, shadow, and transform transitions use `200ms cubic-bezier(0.22, 1, 0.36, 1)`.

The carbon button confirms a local or reversible action and uses the exact primary shadows declared above. The citron button advances the selected artifact, confirms a consequential action after its destination and effect are clear, or serves as the landing page's single preferred call to action. A view must not show carbon and citron buttons as competing calls to action. Ghost and destructive buttons remain flat.

Renderer primitives come from shadcn and are themed through semantic variables in `app/globals.css`. Map carbon to `primary`, mineral paper to `background`, chalk to `card` and `popover`, soft citron to `accent`, and dark olive to `ring`. Bright citron has its own `signal` token and Button variant. Do not replace these mappings with arbitrary color utilities in product components.

Inputs are 40px high with a visible label. Placeholder text cannot replace the label. Focus uses a 2px dark olive ring with a 2px offset.

### Workflow state

Use these exact concepts where applicable: Draft, In review, Changes requested, Approved, Queued, Running, Failed, Scheduled, and Published. Status is aligned text within its owning row. Add a small dot only when it materially improves scanning; do not turn routine metadata into badge rows.

### Evidence and versions

Claims show their exact statement, confidence, source count, caveats, and scene usage. Content artifacts show version and approval state. Technical hashes use Mono and remain subordinate until a verification or publishing decision needs them.

### Approval surfaces

Keep the artifact and its approval decision inside one coherent frame. The decision panel names the exact version and explains what approval locks. Any action that starts generation, incurs provider cost, or publishes publicly states that consequence before confirmation.

### Empty states

Empty states explain the next input in one sentence. Research may ask for a topic; Production may ask for approved content; Review may state that no render exists. They do not need illustrations, marketing copy, or grids of possibilities.

## Product pattern

Use an artifact-and-decision split for consequential review:

- The wider side shows the sourced claim, script passage, storyboard scene, render frame, or publish payload.
- The decision side shows the exact version, evidence or cost summary, caveats, and available action.
- On narrow screens, stack the artifact before the decision so source order remains the reading order.
- Keep the preferred action at the end of the decision panel, after the evidence that earns it.

The system source of truth is the immutable artifact record. Editing an approved artifact creates a new version and removes the old approval from the current path. Publishing verifies that the uploaded video hash matches the approved video hash.

## Scrolling

Use the browser's native scrolling behavior with `scroll-behavior: smooth` for same-page navigation. The scrollbar is narrow and quiet: a transparent track, a `border-strong` thumb, a full radius, and a 3px canvas-colored inset border. Hover changes the thumb to `text-secondary`. Firefox uses `scrollbar-width: thin` and the same semantic colors. Do not replace native scrolling with a JavaScript scroll engine.

## Motion

Default to stillness. Do not use marker sweeps, text highlights, ambient motion, or decorative entrance animation. Hover and focus transitions use `200ms cubic-bezier(0.22, 1, 0.36, 1)`; button hover may use the reference's 1px tactile lift. React View Transitions may preserve continuity when an active workflow stage or selected artifact changes. Do not animate evidence that the user is reading or reveal every section on scroll.

Respect reduced-motion preferences by removing animation and transition duration. Unsupported View Transition browsers must retain the complete interaction without motion.

## Accessibility

Use landmarks, one descriptive `h1`, ordered headings, visible focus, native controls, useful labels, semantic tables, figures, captions, and live regions for asynchronous state. Source order is reading order. Meet WCAG AA and never rely on color alone.

At narrow widths, stack the grid before shrinking text. Long tables may scroll within a labelled region. Keep consequential controls at least 36px high and primary touch targets at least 40px where the interface is touch-oriented.

## Do's and don'ts

Do:

- Put the artifact before operational metadata.
- Keep claims linked to sources and scenes.
- Make every approval name a version.
- Use citron to show where the current workflow action will happen.
- Use Tailwind utilities for page layout and keep global CSS genuinely global.
- Name provider cost, public destination, and payload before confirmation.
- Keep keyboard focus visible and follow source order.

Don't:

- Add gradients, glass effects, decorative noise, or shadows beyond the specified tactile button edge and floating-layer shadow.
- Use citron markers, text highlights, or accent backgrounds as decoration.
- Introduce a JavaScript smooth-scroll engine or hide the native scrollbar.
- Turn every group into a card.
- Use color as the only sign of status.
- Hide a consequential action behind a generic “Continue” button.
- Animate evidence under review.
- Claim work is approved, rendered, or published before the durable record confirms it.
