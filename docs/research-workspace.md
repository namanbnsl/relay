# Research workspace implementation

Milestones
- [x] Persisted workspace/topic model and navigation
- [x] Discover sources, Exa monitoring and ingestion
- [x] Idempotent update-to-topic flows
- [x] Scheduling and existing executor integration
- [x] Regression checks and browser verification

Existing projects retain IDs and routes. Additive optional fields default to manual discovery, suggestions, and one-time topics. Research and script history is preserved.

## September 2026 UX overhaul

The workspace uses a reading surface with minimal borders. Topics open to the most recent stage of work (brief, research, or script). Brief editing is secondary. Discovery suggestions become topics with one click, carrying their source context into the topic. Workspace and topic creation preserve input after failed saves. Provider payloads, hashes, status codes, and reconciliation controls are absent from the reading flow; agents still have the MCP tools they need.

Discovery scheduling is available at **Discover → Schedule**. A daily schedule stores a local time and timezone. Relay disables Exa's creation-time interval for explicitly timed schedules and registers a Convex scheduled function that triggers the monitor. Callback generation and due-time checks prevent duplicate, paused, removed, and obsolete schedules from starting work. Existing daily interval configurations retain their behavior until the user chooses a time. Daylight saving gaps run at the next valid minute, and repeated hours run once per local date. Search completion follows the scheduled start time.

Topic research also offers on-demand, a specific date, or daily starts through **Schedule research**. These jobs collect sources; the connected MCP agent must still synthesize and save the final research. Human approval remains separate. Editing an unchanged brief does not reset its schedule.

## Verification

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
- `node_modules/.bin/vite --config tests/browser/vite.config.mjs`, then `node tests/browser/verify.mjs` (set `PLAYWRIGHT_MODULE` and `CHROME_PATH` if needed).
- The browser harness mounts the real workspace components with local sample data and no authentication. It is under `tests/browser`, outside Next's routes; production auth and backend ownership checks remain enforced.
- Browser checks cover desktop/mobile layouts, saved discovery time, dialog focus, sources, pause/resume, one-click topic creation, brief editing, agent handoff, research/script navigation, and failed save input retention. Provider network calls are mocked in backend tests; browser fixture saves do not call Exa.
- Verified the built app returns a Clerk sign-in redirect for unauthenticated `/projects` requests. Development Convex functions were synced with `convex dev --once`; no production deployment was performed.
