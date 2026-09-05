# Relay

Relay is a Bun-powered Next.js workspace for evidence-backed video production.

It uses Clerk for web sessions and OAuth-protected MCP access. The research workspace at `/projects/ai-industry-brief` is an interactive sample with session-only state. The Streamable HTTP MCP server is mounted at `/mcp` and still exposes only the sample `hello` tool.

## Research workspace sample

Discover includes fictional developments and research ideas. Research an item directly or add it as a new investigation in an existing topic. Topics support editable outlines, one-time or daily cadence, separate investigations, brief editing, evidence review, and version-specific approvals. Sources is a shared reading list with website entry, suggestions, and pause/resume controls.

Try the permissions story in Discover: open the flagged claim, inspect its fictional source excerpt, apply qualified wording, and approve the brief. Then create, edit, approve, and copy a WhatsApp post or written video script. Editing approved research preserves the earlier approval and flags existing drafts as using an older research version. Approved draft text is preserved in its history.

Open the existing AI coding agents topic and choose **Try sample daily update** to compare two dated investigations. Custom topics open blank investigations for manually written notes.

All research, benchmark figures, and reviewer notes in the permissions story are fictional fixtures. Draft creation uses a local text template, not an LLM. There are no live monitor checks, scheduled tasks, model calls, Google integrations, asset generation, rendering, or publishing. Changes survive workspace navigation but reset on reload or when leaving the workspace route. The existing app layout currently leaves authentication protection disabled for UI preview; this prototype introduces no persisted project data.

## Clerk setup

1. Create or select a Clerk application.
2. Copy `.env.example` to `.env.local` and replace both placeholder keys with the values from Clerk's API keys page.
3. In Clerk's OAuth applications settings, enable CIMD for clients that support it and pre-register the clients you trust. Enable Dynamic Client Registration only when a client requires it.
4. Set the instance's default OAuth scope to `openid` for MCP clients that omit the `scope` parameter.

The MCP endpoint independently requires a Clerk OAuth access token with the `openid` scope. OAuth discovery is available at `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server`.

## Convex setup

1. Run `bun run convex:dev` and create or select Relay's development project. Convex writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.
2. In the Clerk Dashboard, activate the Convex integration for this Clerk application and copy its Frontend API URL.
3. Set that public issuer URL on the Convex development deployment:

   ```bash
   bunx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-instance.clerk.accounts.dev
   ```

4. Keep `bun run convex:dev` running while developing against Convex. The current project UI does not read or write project data yet.

## Run locally

```bash
bun install
bun run dev
```

Open `http://localhost:3000` for the public introduction. Signed-in users can open `http://localhost:3000/projects` for the project and research-workspace UI. The standalone design reference remains at `http://localhost:3000/DESIGN_SYSTEM.html`.

## Verify

```bash
bun run typecheck
bun run lint
bun run build
bun test components/projects/workspace-model.test.ts
```

The product direction is in `IDEA.md`; the interface rules and tokens are in `DESIGN.md`.

The reserved Relay identity mark remains at `public/relay-mark.png`; the current design-system previews intentionally do not use it.
