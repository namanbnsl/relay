/// <reference types="vite/client" />
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  exaRun,
  contentsResponse,
  startExa,
  getExa,
  sourceList,
} from "../convex/model/exa";
const modules = import.meta.glob("../convex/**/*.ts");
const provider = {
  id: "agent_run_fixture",
  status: "completed",
  stopReason: "schema_satisfied",
  output: {
    text: "Provider findings",
    grounding: [
      {
        field: "text",
        citations: [{ url: "https://example.org/source", title: "Source" }],
      },
    ],
  },
  costDollars: { total: 0.1 },
};
async function setup() {
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  const owner = t.withIdentity({ subject: "user_owner" });
  const other = t.withIdentity({ subject: "user_other" });
  const project = await owner.mutation(api.relay.write, {
    command: { kind: "create_project", name: "Research" },
  });
  const topic = await owner.mutation(api.relay.write, {
    command: {
      kind: "create_topic",
      projectId: project.projectId,
      title: "Topic",
      question: "What does the source report?",
    },
  });
  if (!topic.topicId) throw new Error("No topic");
  return {
    t,
    owner,
    other,
    topicId: topic.topicId,
    projectId: project.projectId,
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("EXA_API_KEY", "fixture-key");
  vi.stubEnv("RESEARCH_ENABLED", "true");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("research ownership and lifecycle using Convex", () => {
  it("reports 18 references as one retrieved and 17 pending, including after interrupted retrieval", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "failed-session-counts",
      },
    });
    const outputStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["Provider report"])),
    );
    await t.mutation(internal.researchSteps.storePacket, {
      packet: {
        runId: run._id,
        findings: "Report with 18 references",
        outputStorageId,
        groundingJson: "[]",
        gaps: [],
        createdAt: Date.now(),
        provenance: "exa_agent",
        verification: "not_independently_verified",
        approval: "not_reviewed",
        providerStatus: "completed",
      },
      sources: Array.from({ length: 18 }, (_, i) => ({
        url: `https://example.org/${i}`,
      })),
    });
    const rows = await t.run((ctx) =>
      ctx.db.query("researchEvidence").collect(),
    );
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["Inspected source text"])),
    );
    await t.run((ctx) =>
      ctx.db.patch(rows[0]._id, {
        outcome: {
          kind: "retrieved",
          storageId,
          hash: "fixture",
          retrievedAt: Date.now(),
          characters: 21,
        },
      }),
    );
    const before = await owner.query(api.research.read, {
      command: { kind: "get_research_packet", runId: run._id },
    });
    if (before.kind !== "packet") throw new Error("Wrong result");
    expect(before.progress).toMatchObject({
      total: 18,
      retrieved: 1,
      pending: 17,
      failed: 0,
      readiness: "running",
      recommendedRetryAfterMs: 20000,
    });
    expect(before.unresolvedReferences).toHaveLength(17);
    expect(before.unresolvedReferences[0]).toMatchObject({
      evidenceId: rows[1]._id,
      status: "pending",
      nextAction: expect.stringContaining("Wait"),
    });
    await t.mutation(internal.researchSteps.fail, {
      runId: run._id,
      reason: "Interrupted retrieval",
    });
    const after = await owner.query(api.research.read, {
      command: { kind: "get_run", runId: run._id },
    });
    if (after.kind !== "run") throw new Error("Wrong result");
    expect(after.run.state.kind).toBe("partial");
    expect(after.progress).toMatchObject({
      retrieved: 1,
      pending: 17,
      readiness: "needs_attention",
      recommendedRetryAfterMs: 0,
    });
    const unresolved = await owner.query(api.research.read, {
      command: { kind: "get_evidence", evidenceId: rows[1]._id },
    });
    if (unresolved.kind !== "evidence") throw new Error("Wrong result");
    expect(unresolved.contentUrl).toBeNull();
    expect(unresolved.nextAction).toContain("retry_run");
    for (const offset of [-1, 0.5, 30001]) {
      await expect(
        owner.query(api.research.read, {
          command: {
            kind: "get_evidence",
            evidenceId: rows[0]._id,
            offset,
          },
        }),
      ).rejects.toThrow("offset must be an integer");
    }
  });
  it("anchors current research to the request date without requiring a plan", async () => {
    const { owner, topicId } = await setup();
    vi.setSystemTime(new Date("2026-09-10T10:00:00Z"));
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "current-research",
        question: "OpenAI's current mathematical reasoning work",
      },
    });
    expect(run.brief).toContain("2026-09-10");
    expect(run.brief).toContain("Interpret current/latest as of this date");
    expect(run.brief).toContain("individually attributable findings");
    expect(run.effort).toBe("medium");
  });
  it("remembers deduplicated request keys after the original run finishes", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: { kind: "start_research", topicId, requestKey: "original-key" },
    });
    const command = {
      kind: "start_research" as const,
      topicId,
      requestKey: "deduplicated-key",
      plan: { scope: "Second submission", subquestions: [] },
    };
    expect((await owner.mutation(api.research.write, { command }))._id).toBe(
      run._id,
    );
    await owner.mutation(api.research.write, {
      command: { kind: "cancel_run", runId: run._id },
    });
    await t.action(internal.researchActions.cancelRemote, { runId: run._id });
    expect((await owner.mutation(api.research.write, { command }))._id).toBe(
      run._id,
    );
    await expect(
      owner.mutation(api.research.write, {
        command: { ...command, plan: { scope: "Changed", subquestions: [] } },
      }),
    ).rejects.toThrow("different inputs");
    expect(
      await t.run((ctx) => ctx.db.query("researchRuns").collect()),
    ).toHaveLength(1);
  });
  it("keeps recovery occupied when a delayed cancellation response arrives", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "cancellation-race",
      },
    });
    await t.mutation(internal.researchSteps.claim, { runId: run._id });
    await t.mutation(internal.researchSteps.accepted, {
      runId: run._id,
      remoteId: provider.id,
    });
    await t.mutation(internal.researchSteps.fail, {
      runId: run._id,
      reason: "Execution paused",
    });
    await owner.mutation(api.research.write, {
      command: { kind: "retry_run", runId: run._id },
    });
    await t.mutation(internal.researchSteps.cancellation, {
      runId: run._id,
      terminal: true,
      outcome: "Delayed remote cancellation",
    });
    const recovered = await t.query(internal.research.owned, {
      runId: run._id,
    });
    expect(recovered.state.kind).toBe("running");
    expect(recovered.occupied).toBe(true);
    expect(recovered.remoteTerminal).toBe(true);
    expect(
      (
        await owner.mutation(api.research.write, {
          command: {
            kind: "start_research",
            topicId,
            requestKey: "after-cancellation",
          },
        })
      )._id,
    ).toBe(run._id);
  });
  it("cancels a late accepted task after failure without overwriting its failure stage", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "late-acceptance",
      },
    });
    await t.mutation(internal.researchSteps.claim, { runId: run._id });
    await t.mutation(internal.researchSteps.fail, {
      runId: run._id,
      reason: "Submission response lost",
    });
    await t.mutation(internal.researchSteps.accepted, {
      runId: run._id,
      remoteId: provider.id,
    });
    await t.mutation(internal.researchSteps.progress, {
      runId: run._id,
      stage: "provider_running",
    });
    const failed = await t.query(internal.research.owned, { runId: run._id });
    expect(failed.state.kind).toBe("failed");
    expect(failed.stage).toBe("needs_attention");
    expect(failed.occupied).toBe(true);
    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(
      scheduled.some((job) => job.name === "researchActions:cancelRemote"),
    ).toBe(true);
  });
  it("authorizes starts, direct IDs, packets and evidence; deduplicates keys and concurrent starts", async () => {
    const { t, owner, other, topicId } = await setup();
    await expect(
      other.mutation(api.research.write, {
        command: {
          kind: "start_research",
          topicId,
          requestKey: "request-other",
        },
      }),
    ).rejects.toThrow("not found");
    const run = await owner.mutation(api.research.write, {
      command: { kind: "start_research", topicId, requestKey: "request-one" },
    });
    const duplicate = await owner.mutation(api.research.write, {
      command: { kind: "start_research", topicId, requestKey: "request-one" },
    });
    const concurrent = await owner.mutation(api.research.write, {
      command: { kind: "start_research", topicId, requestKey: "request-two" },
    });
    expect(duplicate._id).toBe(run._id);
    expect(concurrent._id).toBe(run._id);
    for (const kind of ["get_run", "get_research_packet"] as const)
      await expect(
        other.query(api.research.read, { command: { kind, runId: run._id } }),
      ).rejects.toThrow("not found");
    for (const kind of ["cancel_run", "retry_run"] as const)
      await expect(
        other.mutation(api.research.write, {
          command: { kind, runId: run._id },
        }),
      ).rejects.toThrow("not found");
    const evidenceId = await t.run((ctx) =>
      ctx.db.insert("researchEvidence", {
        runId: run._id,
        originalUrl: "https://example.org",
        canonicalUrl: "https://example.org/",
        outcome: { kind: "pending" },
        attempts: 0,
      }),
    );
    await expect(
      other.query(api.research.read, {
        command: { kind: "get_evidence", evidenceId },
      }),
    ).rejects.toThrow("not found");
    await expect(
      owner.mutation(api.research.write, {
        command: {
          kind: "start_research",
          topicId,
          requestKey: "request-one",
          plan: { scope: "changed", subquestions: [] },
        },
      }),
    ).rejects.toThrow("different inputs");
    expect(
      await t.run((ctx) => ctx.db.query("researchRuns").collect()),
    ).toHaveLength(1);
    expect(run.state.kind).toBe("queued");
    expect(run.workflowId).toBeTruthy();
  });
  it("persists useful output as partial when source retrieval fails, preserving review history", async () => {
    const { t, owner, topicId } = await setup();
    await t.run(async (ctx) => {
      const id = ctx.db.normalizeId("topics", topicId);
      if (!id) throw new Error("Invalid topic");
      const searchId = await ctx.db.insert("workspaceSearches", {
        topicId: id,
        query: "Claim",
        optionsJson: "{}",
      });
      const sourceId = await ctx.db.insert("workspaceSources", {
        topicId: id,
        searchId,
        url: "https://example.org",
        title: "Source",
        excerpt: "Claim",
      });
      await ctx.db.insert("workspaceEvidence", {
        topicId: id,
        sourceId,
        url: "https://example.org",
        title: "Source",
        content: "Claim",
        retrievedAt: Date.now(),
      });
    });
    const saved = await owner.mutation(api.relay.write, {
      command: {
        kind: "save_research",
        topicId,
        summary: "User synthesis",
        claims: [
          {
            text: "Claim",
            assessment: "supported",
            note: "Source assertion",
            evidence: [
              { url: "https://example.org", title: "Source", excerpt: "Claim" },
            ],
          },
        ],
      },
    });
    await owner.mutation(api.relay.write, {
      command: {
        kind: "review_research",
        versionId: saved.id,
        decision: "approved",
        note: "",
      },
    });
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "request-packet",
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("/contents"))
          return new Response(JSON.stringify({ results: [] }));
        if (init?.method === "POST")
          return new Response(JSON.stringify({ id: provider.id }));
        return new Response(JSON.stringify(provider));
      }),
    );
    expect(
      await t.action(internal.researchActions.advance, { runId: run._id }),
    ).toBe("wait");
    await t.action(internal.researchActions.advance, { runId: run._id });
    await t.action(internal.researchActions.advance, { runId: run._id });
    await t.action(internal.researchActions.advance, { runId: run._id });
    const packet = await owner.query(api.research.read, {
      command: { kind: "get_research_packet", runId: run._id },
    });
    if (packet.kind !== "packet") throw new Error("Wrong result");
    expect(packet.run.state.kind).toBe("partial");
    expect(packet.packet?.verification).toBe("not_independently_verified");
    expect(packet.evidence[0].outcome.kind).toBe("failed");
    expect(packet.packet?.gaps.length).toBeGreaterThan(0);
    const topic = await owner.query(api.relay.read, {
      command: { kind: "topic", topicId },
    });
    if (topic.kind !== "topic") throw new Error("Wrong topic");
    expect(topic.research).toHaveLength(1);
    expect(topic.research[0].review.kind).toBe("approved");
    await expect(
      t.mutation(internal.relay.writeFromMcp, {
        subject: "user_owner",
        command: {
          kind: "review_research",
          versionId: saved.id,
          decision: "approved",
          note: "",
        },
      }),
    ).rejects.toThrow();
  });
  it("retrieves four sources concurrently without marking pending evidence complete", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "parallel-sources",
      },
    });
    const urls = Array.from(
      { length: 5 },
      (_, i) => `https://example.org/${i}`,
    );
    const remote = {
      ...provider,
      output: {
        text: "Five sources",
        grounding: [{ field: "text", citations: urls.map((url) => ({ url })) }],
      },
    };
    let active = 0;
    let peak = 0;
    const releases: (() => void)[] = [];
    let signalBatch: () => void = () => {};
    const batchStarted = new Promise<void>((resolve) => {
      signalBatch = resolve;
    });
    let block = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (!url.endsWith("/contents"))
          return new Response(
            JSON.stringify(
              init?.method === "POST" ? { id: provider.id } : remote,
            ),
          );
        active++;
        peak = Math.max(peak, active);
        if (block)
          await new Promise<void>((resolve) => {
            releases.push(resolve);
            if (releases.length === 4) signalBatch();
          });
        active--;
        return new Response(
          JSON.stringify({
            results: [{ url: "https://example.org/source", text: "Evidence" }],
          }),
        );
      }),
    );
    await t.action(internal.researchActions.advance, { runId: run._id });
    expect(
      await t.action(internal.researchActions.advance, { runId: run._id }),
    ).toBe("continue");
    await t.mutation(internal.researchSteps.finish, { runId: run._id });
    expect(
      (await t.query(internal.research.owned, { runId: run._id })).state.kind,
    ).toBe("running");
    const fetching = t.action(internal.researchActions.advance, {
      runId: run._id,
    });
    await batchStarted;
    expect(peak).toBe(4);
    block = false;
    releases.forEach((release) => release());
    expect(await fetching).toBe("continue");
    const evidence = await t.run((ctx) =>
      ctx.db.query("researchEvidence").collect(),
    );
    expect(
      evidence.filter((entry) => entry.outcome.kind === "retrieved"),
      JSON.stringify(
        evidence.map((entry) => ({ id: entry._id, outcome: entry.outcome })),
      ),
    ).toHaveLength(4);
    expect(
      evidence.filter((entry) => entry.outcome.kind === "pending"),
    ).toHaveLength(1);
    await t.action(internal.researchActions.advance, { runId: run._id });
    await t.action(internal.researchActions.advance, { runId: run._id });
    expect(
      (await t.query(internal.research.owned, { runId: run._id })).state.kind,
    ).toBe("succeeded");
  });
  it("stores successful source content, hashes and dates with provenance", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "request-success",
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (url: string, init?: RequestInit) =>
          new Response(
            JSON.stringify(
              url.endsWith("/contents")
                ? {
                    results: [
                      {
                        url: "https://example.org/source",
                        text: "Original retrieved text",
                        publishedDate: "2026-09-01",
                        title: "Source",
                      },
                    ],
                  }
                : init?.method === "POST"
                  ? { id: provider.id }
                  : provider,
            ),
          ),
      ),
    );
    for (let i = 0; i < 4; i++)
      await t.action(internal.researchActions.advance, { runId: run._id });
    const packet = await owner.query(api.research.read, {
      command: { kind: "get_research_packet", runId: run._id },
    });
    if (packet.kind !== "packet") throw new Error("Wrong result");
    expect(packet.run.state.kind).toBe("succeeded");
    expect(packet.progress).toMatchObject({
      readiness: "ready_for_synthesis",
      retrieved: 1,
      pending: 0,
      failed: 0,
    });
    expect(packet.evidence[0].excerpt).toBe("Original retrieved text");
    expect(packet.evidence[0].publicationProvenance).toBe("exa_contents");
    const outcome = packet.evidence[0].outcome;
    if (outcome.kind !== "retrieved") throw new Error("Not retrieved");
    expect(outcome.hash).toHaveLength(64);
    expect(
      await t.run(async (ctx) =>
        (await ctx.storage.get(outcome.storageId))?.text(),
      ),
    ).toBe("Original retrieved text");
  });
  it("does not repeat a paid submission after a lost response; reconciliation recovers the same run", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "request-ambiguous",
      },
    });
    const fetchMock = vi.fn(async () => {
      throw new Error("lost response");
    });
    vi.stubGlobal("fetch", fetchMock);
    await t.action(internal.researchActions.advance, { runId: run._id });
    await t.action(internal.researchActions.advance, { runId: run._id });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      (await t.query(internal.research.owned, { runId: run._id })).submission
        .kind,
    ).toBe("uncertain");
    await owner.mutation(api.research.write, {
      command: { kind: "retry_run", runId: run._id },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (url: string) =>
          new Response(
            JSON.stringify(
              url.includes("?limit=")
                ? {
                    data: [
                      {
                        id: provider.id,
                        request: { metadata: { relayRunId: run._id } },
                      },
                    ],
                  }
                : provider,
            ),
          ),
      ),
    );
    await t.action(internal.researchActions.advance, { runId: run._id });
    const recovered = await t.query(internal.research.owned, {
      runId: run._id,
    });
    expect(recovered.submission).toEqual({
      kind: "accepted",
      remoteId: provider.id,
    });
    expect(recovered.attempts).toBe(1);
  });
  it("honors cancellation before submission and late provider acceptance", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "request-cancel",
      },
    });
    await owner.mutation(api.research.write, {
      command: { kind: "cancel_run", runId: run._id },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await t.action(internal.researchActions.advance, { runId: run._id });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (await t.query(internal.research.owned, { runId: run._id })).occupied,
    ).toBe(false);
    await t.mutation(internal.researchSteps.accepted, {
      runId: run._id,
      remoteId: provider.id,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ...provider, status: "cancelled" })),
      ),
    );
    await t.action(internal.researchActions.cancelRemote, { runId: run._id });
    expect(
      (await t.query(internal.research.owned, { runId: run._id })).state.kind,
    ).toBe("cancelled");
  });
  it("executes the real durable Workflow through scheduled steps after the start returns", async () => {
    const { t, owner, topicId } = await setup();
    const fetchMock = vi.fn(
      async (url: string, init?: RequestInit) =>
        new Response(
          JSON.stringify(
            url.endsWith("/contents")
              ? {
                  results: [
                    {
                      url: "https://example.org/source",
                      text: "Stored evidence",
                    },
                  ],
                }
              : init?.method === "POST"
                ? { id: provider.id }
                : provider,
          ),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "request-durable",
      },
    });
    expect(run.state.kind).toBe("queued");
    expect(fetchMock).not.toHaveBeenCalled();
    // No browser or MCP action participates after the initial mutation.
    for (let i = 0; i < 40; i++) {
      await vi.advanceTimersByTimeAsync(15000);
      await t.finishInProgressScheduledFunctions();
      const state = await t.query(internal.research.owned, { runId: run._id });
      if (state.state.kind === "succeeded" || state.state.kind === "failed")
        break;
    }
    const completed = await t.query(internal.research.owned, {
      runId: run._id,
    });
    expect(completed.state.kind).toBe("succeeded");
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => url.endsWith("/agent/runs") && init?.method === "POST",
      ),
    ).toHaveLength(1);
  });
  it("bounds status and retrieval retries and preserves unknown actual usage", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: { kind: "start_research", topicId, requestKey: "request-retry" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === "POST"
          ? new Response(JSON.stringify({ id: provider.id }))
          : new Response("unavailable", { status: 503 }),
      ),
    );
    await t.action(internal.researchActions.advance, { runId: run._id });
    expect(
      await t.action(internal.researchActions.advance, { runId: run._id }),
    ).toBe("retry");
    expect(
      await t.action(internal.researchActions.advance, { runId: run._id }),
    ).toBe("done");
    const failed = await t.query(internal.research.owned, { runId: run._id });
    expect(failed.state.kind).toBe("failed");
    expect(failed.actualDollars).toBeUndefined();
    await owner.mutation(api.research.write, {
      command: { kind: "retry_run", runId: run._id },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/contents")
          ? new Response("unavailable", { status: 503 })
          : new Response(JSON.stringify(provider)),
      ),
    );
    await t.action(internal.researchActions.advance, { runId: run._id });
    expect(
      await t.action(internal.researchActions.advance, { runId: run._id }),
    ).toBe("retry");
    await t.action(internal.researchActions.advance, { runId: run._id });
    await t.action(internal.researchActions.advance, { runId: run._id });
    const packet = await owner.query(api.research.read, {
      command: { kind: "get_research_packet", runId: run._id },
    });
    if (packet.kind !== "packet") throw new Error("Wrong packet");
    expect(packet.evidence[0].attempts).toBe(2);
    expect(packet.run.state.kind).toBe("partial");
  });
  it("rejects missing credentials and rechecks ownership during background processing", async () => {
    const { t, owner, topicId, projectId } = await setup();
    vi.stubEnv("EXA_API_KEY", "");
    await expect(
      owner.mutation(api.research.write, {
        command: {
          kind: "start_research",
          topicId,
          requestKey: "request-missing",
        },
      }),
    ).rejects.toThrow("EXA_API_KEY");
    vi.stubEnv("EXA_API_KEY", "fixture-key");
    const run = await owner.mutation(api.research.write, {
      command: { kind: "start_research", topicId, requestKey: "request-owner" },
    });
    await t.run(async (ctx) => {
      const id = ctx.db.normalizeId("projects", projectId);
      if (!id) throw new Error("Invalid fixture project ID");
      await ctx.db.patch(id, { owner: "user_other" });
    });
    await expect(
      t.action(internal.researchActions.advance, { runId: run._id }),
    ).rejects.toThrow("not found");
  });
  it("admits runs across topics without deployment quotas and still deduplicates topics", async () => {
    const { owner, projectId } = await setup();
    for (let i = 0; i < 22; i++) {
      const topic = await owner.mutation(api.relay.write, {
        command: {
          kind: "create_topic",
          projectId,
          title: `Topic ${i}`,
          question: `Question ${i}`,
        },
      });
      if (!topic.topicId) throw new Error("No topic");
      const run = await owner.mutation(api.research.write, {
        command: {
          kind: "start_research",
          topicId: topic.topicId,
          requestKey: `request-topic-${i}`,
        },
      });
      expect(run.state.kind).toBe("queued");
      const duplicate = await owner.mutation(api.research.write, {
        command: {
          kind: "start_research",
          topicId: topic.topicId,
          requestKey: `duplicate-topic-${i}`,
        },
      });
      expect(duplicate._id).toBe(run._id);
    }
  });
  it("enforces deadline and kill switch", async () => {
    const { t, owner, topicId } = await setup();
    vi.stubEnv("RESEARCH_ENABLED", "false");
    await expect(
      owner.mutation(api.research.write, {
        command: {
          kind: "start_research",
          topicId,
          requestKey: "request-kill",
        },
      }),
    ).rejects.toThrow("paused");
    vi.stubEnv("RESEARCH_ENABLED", "true");
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "request-deadline",
      },
    });
    await t.run((ctx) => ctx.db.patch(run._id, { deadline: Date.now() - 1 }));
    vi.stubGlobal("fetch", vi.fn());
    await t.action(internal.researchActions.advance, { runId: run._id });
    expect(
      (await t.query(internal.research.owned, { runId: run._id })).state.kind,
    ).toBe("failed");
    expect(fetch).not.toHaveBeenCalled();
  });
});
describe("retrieval attempt accounting", () => {
  it("does not lower the paid-attempt counter when an older action completes late", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "request-attempt-race",
      },
    });
    const fields = {
      runId: run._id,
      originalUrl: "https://example.org",
      canonicalUrl: "https://example.org/",
      attempts: 0,
    };
    const evidenceId = await t.run((ctx) =>
      ctx.db.insert("researchEvidence", {
        ...fields,
        outcome: { kind: "pending" },
      }),
    );
    expect(
      await t.mutation(internal.researchSteps.claimEvidence, { evidenceId }),
    ).toBe(true);
    expect(
      await t.mutation(internal.researchSteps.claimEvidence, { evidenceId }),
    ).toBe(true);
    await t.mutation(internal.researchSteps.storeEvidence, {
      evidenceId,
      fields: {
        ...fields,
        attempts: 1,
        outcome: {
          kind: "failed",
          at: Date.now(),
          reason: "late first response",
        },
      },
    });
    expect((await t.run((ctx) => ctx.db.get(evidenceId)))?.attempts).toBe(2);
    expect(
      await t.mutation(internal.researchSteps.claimEvidence, { evidenceId }),
    ).toBe(false);
  });
});
describe("definitive submission rejections", () => {
  it("allows explicit retry only when the provider definitively rejected creation", async () => {
    const { t, owner, topicId } = await setup();
    const run = await owner.mutation(api.research.write, {
      command: {
        kind: "start_research",
        topicId,
        requestKey: "request-rejected",
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unauthorized", { status: 401 })),
    );
    await t.action(internal.researchActions.advance, { runId: run._id });
    const rejected = await t.query(internal.research.owned, { runId: run._id });
    expect(rejected.state.kind).toBe("failed");
    expect(rejected.occupied).toBe(false);
    expect(rejected.submission.kind).toBe("not_submitted");
    await owner.mutation(api.research.write, {
      command: { kind: "retry_run", runId: run._id },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: provider.id }))),
    );
    await t.action(internal.researchActions.advance, { runId: run._id });
    expect(
      (await t.query(internal.research.owned, { runId: run._id })).submission
        .kind,
    ).toBe("accepted");
  });
});
describe("provider boundary fixtures (not live validation)", () => {
  it("retrieves report citations omitted from grounding without duplicating shared URLs", () => {
    const sources = sourceList(
      exaRun.parse({
        ...provider,
        output: {
          ...provider.output,
          text: "[Source](https://example.org/source) and [Another](https://example.org/another)",
        },
      }),
    );
    expect(sources.map((source) => source.url)).toEqual([
      "https://example.org/source",
      "https://example.org/another",
    ]);
  });
  it("accepts documented nullable request metadata without retaining unrelated fields", () => {
    expect(exaRun.parse({ ...provider, request: null }).request).toBeNull();
    expect(
      exaRun.parse({
        ...provider,
        request: { metadata: { privateField: "ignored" } },
      }).request,
    ).toEqual({ metadata: {} });
  });
  it("rejects malformed statuses and unsafe citation URLs", () => {
    expect(exaRun.safeParse({ ...provider, status: "approved" }).success).toBe(
      false,
    );
    expect(
      exaRun.safeParse({
        ...provider,
        output: {
          text: "x",
          grounding: [
            { field: "text", citations: [{ url: "javascript:alert(1)" }] },
          ],
        },
      }).success,
    ).toBe(false);
    expect(
      contentsResponse.safeParse({
        results: [{ url: "https://example.org", text: 10 }],
      }).success,
    ).toBe(false);
  });
  it("preserves an accepted ID even if other create-response fields are malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ id: "agent_run_fixture", output: 12 })),
      ),
    );
    expect(
      await startExa({
        brief: "Question",
        effort: "medium",
        runId: "relay-fixture",
      }),
    ).toBe("agent_run_fixture");
  });
  it("classifies rate limits and malformed JSON without exposing provider payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("sensitive response", { status: 429 })),
    );
    await expect(getExa("agent_run_fixture")).rejects.toMatchObject({
      code: "provider_http_429",
      retryable: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("invalid")),
    );
    await expect(getExa("agent_run_fixture")).rejects.toMatchObject({
      code: "provider_invalid_json",
    });
  });
});
