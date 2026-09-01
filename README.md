# Relay

Relay is a Bun-powered Next.js workspace for evidence-backed video production.

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
