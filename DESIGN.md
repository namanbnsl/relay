---
version: "beta"
name: Relay
description: "A calm, evidence-first workspace for research and content production."
implementation:
  framework: "Next.js App Router"
  styling: "Tailwind CSS v4 utilities"
  primitives: "shadcn/ui and Radix"
  globalCss: "Semantic tokens, typography defaults, selection, scrollbar, and reduced-motion behavior only"
colors:
  ink: "#20221D"
  canvas: "#FFFFFF"
  surface: "#FFFFFF"
  sidebar: "rgb(32 34 29 / 0.025)"
  surface-subtle: "rgb(32 34 29 / 0.035)"
  hover: "rgb(32 34 29 / 0.05)"
  selected: "rgb(32 34 29 / 0.06)"
  text-secondary: "rgb(32 34 29 / 0.62)"
  border: "rgb(32 34 29 / 0.12)"
  border-strong: "rgb(32 34 29 / 0.22)"
  focus: "#20221D"
typography:
  family: "Instrument Sans, Aptos, sans-serif"
  technical: "IBM Plex Mono, Cascadia Mono, monospace"
  page-title: "24px / 1.2 / 600 / -0.035em"
  section-title: "14px / 1.3 / 600"
  body: "14px / 1.5 / 400"
  navigation: "13px / 1.35 / 500"
  caption: "12px / 1.4 / 400"
shape:
  control: "8px"
  navigation: "6px"
  panel: "10px"
  focus-ring: "2px"
spacing:
  base: "4px"
  control-gap: "8px"
  group-gap: "12px"
  section-gap: "24px"
  page-gap: "32px"
layout:
  content-width: "1120px"
  reading-column: "680px max"
  context-column: "260px"
  sidebar-width: "240px"
  sidebar-mobile-width: "272px"
motion:
  interactive: "150ms cubic-bezier(0.2, 0, 0, 1)"
  overlay: "200ms cubic-bezier(0.2, 0, 0, 1)"
---

# Relay interface system

Relay is a restrained professional tool. It should feel closer to Linear or Notion than a marketing dashboard: compact navigation, clear writing, quiet surfaces, and enough space to understand the current task. The interface earns hierarchy through alignment, typography, and proximity—not decoration.

This file is the normative visual specification. When an older reference conflicts with it, follow this file and the current semantic tokens in `app/globals.css`.

## Direction

- Use one hue: Ink `#20221D`.
- Use white as the canvas and surface.
- Derive muted text, borders, hover fills, selected fills, and overlays from Ink with opacity.
- Keep product screens compact and left-aligned.
- Prefer a list, document, or artifact view over a dashboard grid.
- Delete copy, borders, icons, and containers that do not improve comprehension.
- Keep one filled primary action per view.

Relay does not use gradients, glow, colored accents, decorative textures, glass effects, oversized cards, badge rows, or ambient motion.

## Taste and decision-making

Relay's taste is quiet, exact, and work-oriented. The product should feel composed after hours of use, not merely impressive for the first screenshot. Take inspiration from Linear's disciplined density and Notion's document calm without copying either product's chrome.

When several treatments are valid, choose in this order:

1. Remove the element if it repeats information or carries no action.
2. Use alignment and space to establish the relationship.
3. Use a low-opacity Ink fill when a bounded interactive region needs to be discoverable.
4. Add a border only when the boundary would otherwise be ambiguous.
5. Add an icon only when it improves recognition or names an action more quickly than text.

The interface should look intentional without looking styled. A screen is successful when the task, current context, and next action are obvious at a glance and no element asks for attention without earning it.

### What feels right

- Compact navigation beside a generous reading canvas.
- One strong title, one quiet description, and one concise metadata line.
- Rows that reveal interactivity through a subtle hover fill.
- Contextual information grouped into one quiet surface.
- Familiar icons with consistent size and stroke.
- Immediate feedback that settles quickly and can be interrupted.
- Empty space that separates decisions rather than filling the screen.

### What feels wrong

- Dashboard card grids for linear work.
- A border around every group or a divider between every row.
- Repeating the same project, topic, or status in nearby regions.
- Eyebrows, badges, counters, and helper copy competing with the title.
- Large headings inside the authenticated product.
- Floating panels, dramatic shadows, glass, gradients, or colored glow.
- Tiny controls placed loosely instead of aligned to their owning row.
- Motion whose only purpose is to make the interface feel animated.

## Color roles

Ink carries every foreground and interactive role. A new hue needs a functional requirement that Ink and text cannot express; it must not be added for decoration.

- `background` and `card` are white.
- `foreground`, `primary`, `ring`, and `inverse` use Ink.
- `muted-foreground` uses Ink at 62% opacity.
- `secondary`, `accent`, and `surface-subtle` are low-opacity Ink fills.
- `border` uses Ink at 12%; `border-strong` is reserved for control boundaries.
- The sidebar uses a 2.5% Ink tint to distinguish persistent navigation from the document canvas.
- Selected and status states always include text, weight, or structure; color is never the only cue.

Do not create separate gray, blue, green, red, or accent ramps. Destructive actions may remain monochrome until a real destructive flow needs a measured semantic treatment.

## Typography

Use Instrument Sans for the interface. Use IBM Plex Mono only for hashes, version identifiers, timestamps that benefit from fixed-width digits, and technical IDs.

- Product pages start with a 24px semibold title.
- Section headings are 14px semibold.
- Body text is 14px with a 1.5 line height.
- Dense navigation and row titles may use 13px at weight 500 or 600.
- Captions and metadata are 12px; do not go smaller.
- Use sentence case for headings, labels, buttons, and navigation.
- Use `text-wrap: balance` for short headings and `text-wrap: pretty` for descriptions.
- Cap reading text at roughly 60–75 characters.
- Use tabular numerals for changing counts and times.

## Layout and density

The main content region is at most 1120px wide. Use 40px horizontal padding on wide product screens, 32px on medium screens, and 20px on narrow screens.

Group with space before adding a line. The gap between groups must be at least twice the gap within a group. Shared alignment edges matter more than symmetry.

At wide widths, project detail views may use:

- a primary reading column no wider than 680px;
- a 260px contextual column;
- at least 48px between them.

At narrow widths, stack the primary content before contextual content. Never preserve a desktop split by shrinking text. The document must reflow at 320px without horizontal page scrolling.

## Alignment

Alignment is part of the product's finish, not a final cleanup step.

- Establish one leading edge per hierarchy level and reuse it across headings, rows, and controls.
- Use logical inset properties (`start` and `end`) for directional placement. Do not mix `right` with `end` or `left` with `start` on the same component.
- Center icons geometrically inside their hit area first. Apply an optical nudge only after measuring the rendered boxes.
- An icon beside text follows the text's optical weight: use a 1.75px stroke beside medium text and 2px beside semibold text.
- Keep text and icons on one visual baseline. Do not compensate with arbitrary top margins on individual SVGs.
- Trailing actions align with the outer edge of the rows they govern, not the text inset.
- Adjacent controls share height, radius, and baseline.
- Do not use negative margins to create hover bleeds inside constrained columns; they produce local overflow and fragile edges.

The project-group add button is the reference for compact icon actions: a 28px hit area, 14px icon, 2px stroke, 6px radius, and a 2px inset from the top and trailing edge of its 32px label row.

## Sidebar

The sidebar is persistent product chrome inspired by the density and calm of Linear and Notion; it is not a card rail.

- Desktop width is 240px. Mobile drawer width is 272px.
- Use the subtle sidebar tint and one structural divider on its trailing edge.
- Brand, navigation, and project groups align to the same 8px inset.
- Navigation rows are 32px high with a 6px radius and 8px inline padding.
- Use one familiar 16px outline icon per navigation row at a 1.75px stroke.
- The active row uses the selected Ink fill and medium weight. Do not add a leading bar, colored icon, outline, or pill.
- Counts are plain tabular text at the trailing edge, not badges.
- A project name is the group label. Do not repeat it in a separate project card or breadcrumb block.
- Separate groups with 16–24px of space, not rules.
- The account area sits at the bottom without a divider unless multiple account actions require one.

## Project index

The project index is a compact list, not a gallery.

- Put the page title and `New project` action on one line when space permits.
- Each project is one rounded hover row with a title, one-line description, a short operational value, and a directional cue.
- Do not use project icons, card outlines, shadows, multi-column statistics, or status badges.
- Rows wrap naturally on narrow screens.

## Project detail

The selected topic is the focal object.

- Show the topic title, one-sentence research question, one metadata line, and one primary action.
- Do not repeat the project name in a breadcrumb when the sidebar already establishes project context.
- Use compact segmented tabs below the topic summary. Tabs do not need a full-width divider.
- The default content view shows one primary list and at most one quiet contextual surface.
- Signal rows use spacing and a hover fill instead of permanent separators.
- Source coverage and run history may use `surface-subtle` without a border or shadow.
- Empty states are left-aligned, one sentence long, and free of illustrations.

## Borders and surfaces

Borders communicate boundaries, not decoration.

Keep borders for:

- persistent chrome against the document canvas;
- input and button boundaries;
- focus state;
- tables or data structures where row alignment would otherwise be lost;
- temporary overlays.

Do not place a divider on both a section container and its first or last child. Do not underline a header, tabs, every row, and a side panel in the same view. If spacing or a subtle fill can group the content, delete the line.

Surfaces are flat at rest. Do not use shadows on page content. Temporary overlays may use one restrained shadow when the border alone does not separate them from the page.

## Controls

Buttons are 36px high, use 13px semibold text, an 8px radius, a 1px boundary, 14px horizontal padding, and a 7px internal gap.

- Primary buttons use Ink with white text.
- Secondary buttons use white with a strong Ink boundary.
- Ghost buttons use no resting fill and are reserved for compact contextual actions.
- Hover changes opacity, fill, or boundary only. Buttons do not jump, bounce, or scale.
- Focus uses a 2px Ink ring with a 2px offset.
- Use verb-first labels that name the action.

Tabs use a low-opacity Ink track, a white active segment, 28px tab height, and a 6px radius. Active text uses Ink and medium or semibold weight. Do not combine the segmented treatment with an underline.

## Motion

Default to stillness. High-frequency hover, selection, and focus transitions use only the changing properties and last 150ms with `cubic-bezier(0.2, 0, 0, 1)`.

Drawers and overlays may use a 200ms enter transition. Exits may use the same duration with a stronger ease-in curve. All movement must be interruptible and the final state must remain clear without motion.

Under `prefers-reduced-motion: reduce`, transitions and animations finish immediately. Do not animate page content, evidence, or route changes for decoration.

## Delight and speed

Delight comes from precision and responsiveness: a hover state appearing immediately, a selected topic changing without layout shift, a drawer returning focus to its trigger, and navigation feeling predictable. It does not come from adding more visual material.

- Keep high-frequency feedback at 150ms or faster.
- Animate only `color`, `background-color`, `border-color`, `opacity`, or a small contextual icon translation.
- Avoid blur, filter, large shadow, layout, and height animation in persistent product UI.
- Never delay content with entrance animation.
- Use `next/link` for internal navigation and keep its default prefetch behavior unless measurement proves it wasteful.
- Keep static data and JSX outside render functions when practical.
- Keep client-component boundaries as narrow as the interaction allows; static pages remain server components.
- Do not add an animation library for routine interface motion.
- Do not add memoization, deferred state, or loading UI to trivial local interactions. Immediate work is faster than orchestration overhead.
- Prevent layout shift by keeping control dimensions and selected-state weight stable.
- Prefer native scrolling and platform focus behavior over JavaScript replacements.

A delightful detail must be quiet, fast, reversible, and useful. If removing it does not make the interface less clear or responsive, it probably does not belong.

## Copy

Copy is neutral, direct, and brief.

- Use consistent terms: project, topic, signal, source, research, content, approval.
- Buttons begin with a verb: `New project`, `Start research`, `Add source`.
- Metadata stays on one concise line where it fits.
- Empty states explain what is missing and what action unlocks the next step.
- Do not add promotional copy inside the product workspace.

## Accessibility and responsive checks

- Use one visible `main` landmark and one descriptive `h1` per page.
- Use native links for navigation and native buttons for actions.
- Every icon-only control has an accessible name.
- Every keyboard-reachable control has a visible `focus-visible` indicator.
- Restore focus to the sidebar trigger after the mobile drawer closes.
- Preserve a logical heading order and source order.
- Maintain WCAG AA contrast against the rendered background.
- Keep touch-oriented primary targets at least 40px where density permits; never go below the 24px WCAG target.

Before shipping interface changes, inspect 1440px, 390px, and 320px widths. Check `documentElement.scrollWidth` against `clientWidth`, long topic names, tab reachability, drawer focus restoration, and 200% zoom. Ignore intentional clipping inside `sr-only` accessibility utilities when auditing overflow.

## Final taste check

Before calling an interface finished, ask:

- Is anything repeated that could be removed?
- Can spacing replace any visible line?
- Does every icon explain an action or object?
- Do compact actions align with the row that owns them?
- Is there exactly one obvious primary action?
- Does the page remain calm when every real label is at its longest?
- Do hover, focus, active, and selected states feel immediate and related?
- Does the layout work at 320px without clipping or hidden controls?
- Did the implementation preserve the Ink-only system?
- Would the screen still feel professional after eight hours of use?
