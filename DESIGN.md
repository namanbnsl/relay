---
version: "alpha"
name: Relay Production Chain
description: "A light production workspace for moving evidence-backed video from research through approval, rendering, and publication."
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
    textColor: "{colors.on-primary}"
    typography: "{typography.heading-sm}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "#35382F"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.heading-sm}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
    height: "36px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    typography: "{typography.heading-sm}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
    height: "36px"
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

The visual language comes directly from the reference system: mineral paper, carbon ink, chalk surfaces, and a citron highlighter. Citron marks the current workflow focus, selection, or one preferred action. It is not decoration. Most screens remain nearly monochrome.

Trust is part of the interface. Every approval names an exact artifact version and content hash. Any revision invalidates the prior approval. Costly generation and public publishing name their consequence and require explicit confirmation.

## Colors

The canvas has a muted mineral-green cast rather than beige or neutral gray. The surface is a soft chalk white. Carbon ink carries the hierarchy. Citron behaves like a physical highlighter for the one thing that is selected or ready to advance.

- Use `primary` for headings, body text, and the strongest local controls.
- Use `accent` for quiet selected backgrounds.
- Use bright citron for workflow focus and one preferred action.
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

Wide workspace screens may use a 64px product rail or a 240px documentation rail. Keep the primary reading column between 640px and 760px when the window allows. Video players, review timelines, provenance diagrams, and evidence tables may use the remaining width.

Every screen has one clear focal object:

- Research: the claim and its supporting sources.
- Content: the exact script or scene being reviewed.
- Production: the active job and honest operational state.
- Review: the current video frame and nearest unresolved comment.
- Publish: the approved file, destination, visibility, and scheduled time.

Keep content aligned to shared edges. Avoid centered application layouts except for small empty states. Do not use a dashboard grid when a list-and-detail or artifact-and-decision layout explains the workflow better.

## Elevation and depth

Use borders, spacing, and surface changes before shadow. Relay is flat at rest.

Reserve shadow for temporary layers and the selected artifact inside a review frame. Use one restrained shadow: `0 12px 32px rgba(23, 24, 21, 0.12), 0 2px 8px rgba(23, 24, 21, 0.06)`.

A panel must not contain another elevated panel. Nested content uses a divider or `surface-subtle` fill.

## Shapes

Controls use a 10px radius. Content panels and media previews use 10px or 14px. Small controls may use 6px. The radius never becomes the main visual idea.

Use a full radius only for a short status mark when it materially improves scanning. Ordinary metadata, filters, versions, and navigation items are not pills.

Icons use a 1.75px stroke at 16px or 18px. Prefer familiar actions. Do not place icons inside decorative colored squares.

## Components

Buttons are 36px high by default. The carbon button confirms a local or reversible action. The citron button advances the selected artifact or confirms a consequential action after its destination and effect are clear. A view must not show carbon and citron buttons as competing calls to action.

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

## Motion

Default to stillness. A highlighter sweep may introduce the single page-defining phrase. React View Transitions may preserve continuity when an active workflow stage or selected artifact changes. Do not animate evidence that the user is reading, reveal every section on scroll, or add ambient motion.

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
- Name provider cost, public destination, and payload before confirmation.
- Keep keyboard focus visible and follow source order.

Don't:

- Add gradients, glass effects, decorative noise, or ornamental shadows.
- Turn every group into a card.
- Use color as the only sign of status.
- Hide a consequential action behind a generic “Continue” button.
- Animate evidence under review.
- Claim work is approved, rendered, or published before the durable record confirms it.
