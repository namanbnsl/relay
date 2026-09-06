# Relay

Relay stores research, scripts, and human approvals. Your connected agent supplies inference through MCP; Relay does not run or pay for a model.

## Current workflow

Sign in at `/projects`, create a project, and add a topic. Ask your MCP client to read the topic, research it, and save its findings. The page updates from Convex. Inspect evidence, revise wording, submit for review, and approve the exact research version in Relay. Your agent can then save a script with narration and a visual plan for each scene. Review and approve scripts in Relay too.

Five tables: `users`, `projects`, `topics`, `researchVersions`, `scriptVersions`. Evidence is embedded in claims. Each investigation has its own research version sequence; each topic has one script sequence. Saved content is immutable; review state can transition from draft to in review, then approved or changes requested. Changes requested require a new version. A script pins an exact research version; superseding that research blocks new script approval until the script is revised against approved research.

Project and topic lists return up to 100 recent records; version history returns up to 10 per section. Version payloads are capped at 200 KB to bound database reads. `get_topic` can scope research history by investigation ID. Full pagination, monitoring, discovery ingestion, teams, generation, rendering, and publishing are deferred. The earlier fictional sample components remain in the source tree but are not mounted on live project pages.

## Setup

```bash
bun install
bun run convex:dev
bun run dev
```

Configure `.env.local` using `.env.example`. Keep the existing Clerk application and Convex deployment. Activate Clerk's Convex integration and configure the Convex deployment with:

- `CLERK_JWT_ISSUER_DOMAIN`: the Clerk Frontend API URL, for browser JWT verification.
- `CLERK_SECRET_KEY`: the same Clerk instance's backend secret, for independent OAuth token verification in Convex. Set this through the Convex dashboard or `bunx convex env set CLERK_SECRET_KEY` using stdin. Never commit the secret.

The MCP backend fails closed when its secret is not configured. OAuth access tokens are used only for verification, never written to Relay tables. The verification action checks revocation, expiration, `openid`, and user identity before calling internal database functions. All database access checks project ownership. Browser JWTs and OAuth access tokens use separate entry points; OAuth cannot invoke human review operations.

Project routes require a Clerk web session in both the proxy and route. Public landing and OAuth metadata routes remain accessible. Use Clerk's canonical URL consistently (typically `localhost`, not `127.0.0.1`, in development).

## MCP

Connect your OAuth-capable client to `/mcp`. Configure Clerk OAuth clients with `openid`; prefer CIMD or pre-registration. Enable dynamic registration only if your client needs it. Discovery endpoints:

- `/.well-known/oauth-protected-resource/mcp`
- `/.well-known/oauth-authorization-server`

Tools:

- `list_projects`, `get_project`, `get_topic`
- `create_topic`
- `save_research`, `submit_research_for_review`
- `save_script`, `submit_script_for_review`

Create projects in Relay. Read saved state before revising. For a new investigation, choose a stable `investigationId` and use `expectedVersion: 0`; revisions reuse the investigation ID and pass the current version. Script revisions likewise pass their current version. Every save supplies a `requestId`: reuse it only for retries of the identical request. Conflicting writes are rejected. Write results contain saved IDs, version, status, next action, and a relative Relay path.

Evidence includes an HTTP(S) URL, title, exact excerpt, retrieval time in Unix milliseconds, and `provenance: "agent"`. Relay labels this as agent-supplied; it does not claim to have independently captured or verified it. Review submission requires a nonempty summary and evidence-backed claims assessed as supported. Agent assessment never substitutes for human approval.

## Verification

```bash
bun run test
bun run typecheck
bun run lint
bun run build
bunx convex dev --once
```

Tests exercise ownership, anonymous access, immutable versions, retry behavior, conflicts, review transitions, stale scripts, and the MCP identity boundary. The OAuth provider is mocked in the identity-boundary tests; a real external client OAuth round trip is a separate integration check.

Product direction: `IDEA.md`. Interface rules: `DESIGN.md`.
