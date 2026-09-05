# Relay interface

The research workspace is a minimal, light, neutral product UI. The document and its next action carry the hierarchy. Preserve the research flow; remove presentation that competes with it.

## Palette

The `.research-workspace` scope in `app/globals.css` owns the product palette. Landing pages retain their existing tokens.

| Role | Value |
| --- | --- |
| Canvas | `#ffffff` |
| Primary text and action | `#202020` |
| Secondary text | `#6b6b6b` |
| Sidebar | `#fafafa` |
| Hover surface | `#f7f7f7` |
| Secondary action | `#f4f4f4` |
| Selected navigation | `#eeeeee` |
| Separator | `#e9e9e9` |
| Control boundary | `#d4d4d4` |
| Focus | `#202020` |

Use semantic tokens, never a second neutral or accent palette in a component. Set the scope's foreground explicitly: inherited body text retains its computed color even when a child overrides the token. Portaled mobile navigation must receive the same scope.

Primary and secondary text on white were measured at 16.29:1 and 5.33:1 respectively. Recheck rendered pairs when surfaces change.

## Hierarchy

- Keep the project name once in the 56px application header.
- Use short, functional page titles: Discover, Topics, Sources.
- Put the page action beside the heading. Do not give it another toolbar row.
- Keep sample limitations behind the persistent **Sample workspace** disclosure.
- Show evidence only when a finding is selected. Do not fill an empty evidence column with instructions.
- Put templates and format settings behind a disclosure.
- Represent status as plain text attached to the relevant version or claim. No badges, pills, decorative counters, or colored statuses.
- Do not repeat a question as both the topic title and subtitle.

## Typography and space

Use Instrument Sans. Page headings are 24px semibold; list headings 14–16px; UI text 13–14px; metadata 12px; research and draft prose 15px with a 28px line height. This is a compact reading and editing tool, so avoid marketing-scale headings.

Use `workspacePageClass`, `WorkspaceHeading`, and `ViewButton` from `components/projects/workspace-ui.tsx` for shared page structure. The content container is 1040px including padding; reading content is at most 720px. Desktop content has 48px inline padding, medium screens 40px, and narrow screens 20px.

Use 8px between a label and its description, 20–28px within content rows, and 32px between sections. Align titles, tabs, and list content to the same leading edge. Keep one quiet separator between rows when it helps scanning. Avoid card shells around documents, forms, settings, and explanatory text.

Tabs use a text label and underline. Navigation uses a quiet neutral selection fill. Controls use a consistent 6–8px radius and 36px height. Mobile inputs and selects use 16px text to avoid input zoom.

## Interaction and performance

- Retain native buttons, forms, selects, and disclosures.
- Give controls an accessible name and a visible focus ring.
- Keep actions keyboard reachable; return focus to the mobile navigation trigger when the drawer closes.
- No entrance animation, new animation library, decorative blur, gradients, or layout animation.
- Routine transitions last at most 150ms and name the changing property.
- Preserve reduced-motion behavior.
- Do not replace working local interactions with fake loading states.
- Preserve versioned approvals and flag drafts based on older research.

## Verification

Check Discover, Topics, Sources, evidence review, and the draft editor in the browser. Include empty states, a flagged claim, corrected evidence, approval, and edited drafts. Inspect computed colors as well as screenshots. Test narrow widths, long titles, control reachability, and 200% zoom. Treat tool-reported dimensions as unverified until measured in the page; do not call a source check a browser check.
