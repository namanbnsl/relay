# Relay

Relay is a Bun-powered Next.js workspace for evidence-backed video production.

It uses Clerk for web sessions and OAuth-protected MCP access. The Streamable HTTP MCP server is mounted at `/mcp` and exposes one sample tool named `hello`; no research workflow is implemented yet.

## Clerk setup

1. Create or select a Clerk application.
2. Copy `.env.example` to `.env.local` and replace both placeholder keys with the values from Clerk's API keys page.
3. In Clerk's OAuth applications settings, enable CIMD for clients that support it and pre-register the clients you trust. Enable Dynamic Client Registration only when a client requires it.
4. Set the instance's default OAuth scope to `openid` for MCP clients that omit the `scope` parameter.

The MCP endpoint independently requires a Clerk OAuth access token with the `openid` scope. OAuth discovery is available at `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server`.

## Run locally

```bash
bun install
bun run dev
```

Open `http://localhost:3000` for the shadcn-backed design-system preview, or `http://localhost:3000/DESIGN_SYSTEM.html` for the standalone HTML reference.

## Verify

```bash
bun run typecheck
bun run lint
bun run build
```

The product direction is in `IDEA.md`; the interface rules and tokens are in `DESIGN.md`.

The reserved Relay identity mark remains at `public/relay-mark.png`; the current design-system previews intentionally do not use it.
