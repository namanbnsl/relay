# Frontend implementation and integration

## Integration status

The UI has been integrated into `research-tools-monitor` in `/home/namanb/code/relay` at the user’s request. The updated workspace is at `/projects`. The public landing page is shown to signed-out visitors. Existing uncommitted backend changes were preserved. The original isolated-worktree and temporary-copy validation notes below are retained as implementation history. No production deployment was performed by this merge.

Worktree: `/home/namanb/.t3/worktrees/relay/t3code-39100f40`

Branch: `t3code/cohesive-relay-ui`

Base: `dd9599b`

The frontend is implemented. This UI task performed no deployment, merge, or backend-file edits. The research agent has now reported Phase 1 deployed to **Convex development**. The research agent's component was copied from their working tree and adapted to the shared presentation conventions.

## Integrate both changes together

This frontend intentionally depends on the research agent’s new Convex schema and generated API. The isolated frontend branch still contains the original backend, so it cannot typecheck alone until those backend changes are integrated. Do not paper over that dependency with casts or handwritten API types.

Validation used `/tmp/relay-integration`: a copy of the backend agent’s working tree with this branch’s `app/**` and `components/**` overlaid, restoring the backend-owned `app/mcp/route.ts`. This was a filesystem test copy, not a Git merge. Existing backend dependencies and environment configuration were reused without exposing their values.

When combining the work:

1. Retain the research agent’s `convex/**`, `app/mcp/route.ts`, generated API, dependency/lockfile, test, and setup changes.
2. Use this branch’s frontend files. In the two shared-file conflicts, use this `live-projects.tsx` and `research-execution.tsx`: the research component is already mounted once in the research tab.
3. Point development at the reported Phase 1 Convex deployment. Provider execution still requires `EXA_API_KEY` and `RESEARCH_ENABLED=true`; effort defaults to medium. Production promotion remains a separate reviewed action.
4. Run lint, typecheck, build, and the backend suite again on the final combined commit. Complete the live OAuth checks below before releasing.

## Contracts used

- `api.research.read`: `topic_runs`, `get_research_packet`, `get_evidence`. The current setup response exposes `kind` and `effort`; the UI does **not** assume a `reserve` value.
- `api.research.write`: `start_research` with a stable request key, `cancel_run`, and `retry_run`. Actual returned states control completion; submission feedback does not imply research completion.


## Important files

- `app/globals.css`, `components/ui/button-variants.ts`: shared visual and interaction tokens.
- `app/page.tsx`, `app/layout.tsx`: concise public narrative, illustrative HTML/CSS workflow, corrected metadata, lighter public provider tree.
- `app/(app)/layout.tsx`: workspace-only providers.
- `components/projects/project-frame.tsx`: shared navigation, mobile menu, connection feedback without vertical layout shifts.
- `components/projects/live-projects.tsx`: project/topic lists, explicit labels, stable editors, evidence assessments, review/version preservation.
- `components/projects/workspace-interactions.tsx`: modal focus restoration for external triggers.
- `components/projects/research-execution.tsx`: provider state, retries, packets, evidence access and usage presentation.

See [design conventions](frontend-design.md) and [validation evidence](frontend-validation/README.md).

## Phase 1 follow-up

The backend checkout’s 21 tests were rerun and all pass. The earlier two workflow failures occur only in the temporary copy with symlinked dependencies and are no longer recorded as a backend blocker. Both app and backend typechecks and lint pass against the combined source. Phase 1 includes request receipts without a legacy migration, replay/race protections, and no global caps; the UI does not add its own caps or imply automatic approval.

Outstanding smoke tests remain a real authenticated browser/OAuth connection and live Exa execution. Neither test was simulated as a successful integration, and no paid call was made by the UI work.
