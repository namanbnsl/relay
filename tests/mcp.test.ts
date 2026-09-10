/// <reference types="vite/client" />
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { compactResearch, compactTopic } from "../lib/research-tool-results";

// Clerk is the external OAuth boundary; database mutations and ownership checks are real Convex functions.
vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    idPOAuthAccessToken: {
      verify: async (token: string) => ({
        subject: token === "owner-fixture" ? "user_owner" : "user_other",
        revoked: token === "revoked-fixture",
        expired: false,
        scopes: ["openid"],
      }),
    },
  }),
}));
const modules = import.meta.glob("../convex/**/*.ts");
beforeEach(() => {
  vi.stubEnv("CLERK_SECRET_KEY", "fixture-secret");
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("runs the authenticated MCP research path through a persisted packet and user synthesis", async () => {
  vi.stubEnv("EXA_API_KEY", "fixture-key");
  vi.stubEnv("RESEARCH_ENABLED", "true");
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  const owner = t.withIdentity({ subject: "user_owner" });
  const token = "owner-fixture";
  const project = await t.action(api.mcp.write, {
    token,
    command: { kind: "create_project", name: "MCP research" },
  });
  const topic = await t.action(api.mcp.write, {
    token,
    command: {
      kind: "create_topic",
      projectId: project.projectId,
      title: "Source research",
      question: "What does the source report?",
    },
  });
  if (!topic.topicId) throw new Error("Missing topic");
  const fetchMock = vi.fn(
    async (url: string, init?: RequestInit) =>
      new Response(
        JSON.stringify(
          url.endsWith("/contents")
            ? {
                results: [
                  {
                    url: "https://example.org/source",
                    text: "Source evidence",
                  },
                ],
              }
            : init?.method === "POST"
              ? { id: "agent_run_mcp" }
              : {
                  id: "agent_run_mcp",
                  status: "completed",
                  request: null,
                  output: {
                    text: "Provider findings",
                    grounding: [
                      {
                        field: "text",
                        citations: [{ url: "https://example.org/source" }],
                      },
                    ],
                  },
                },
        ),
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const command = {
    kind: "start_research" as const,
    topicId: topic.topicId,
    requestKey: "mcp-research-request",
  };
  const run = await t.action(api.mcp.researchWrite, { token, command });
  expect(run.state.kind).toBe("queued");
  expect(fetchMock).not.toHaveBeenCalled();
  expect((await t.action(api.mcp.researchWrite, { token, command }))._id).toBe(
    run._id,
  );
  await expect(
    t.action(api.mcp.researchRead, {
      token: "other-fixture",
      command: { kind: "get_run", runId: run._id },
    }),
  ).rejects.toThrow("not found");
  for (let i = 0; i < 40; i++) {
    await vi.advanceTimersByTimeAsync(15000);
    await t.finishInProgressScheduledFunctions();
    const current = await t.query(internal.research.owned, { runId: run._id });
    if (current.state.kind === "succeeded" || current.state.kind === "failed")
      break;
  }
  const packet = await t.action(api.mcp.researchRead, {
    token,
    command: { kind: "get_research_packet", runId: run._id },
  });
  if (packet.kind !== "packet") throw new Error("Wrong packet result");
  expect(packet.run.state.kind).toBe("succeeded");
  expect(packet.packet?.approval).toBe("not_reviewed");
  expect(packet.packet?.verification).toBe("not_independently_verified");
  expect(packet.outputUrl).toBeTruthy();
  const compactPacket = compactResearch(packet);
  expect(compactPacket).toMatchObject({
    ready: true,
    readiness: "ready_for_synthesis",
    evidenceCounts: { retrieved: 1, pending: 0, failed: 0 },
  });
  for (const internalField of [
    "owner",
    "brief",
    "storageId",
    "groundingJson",
    "outputStorageId",
    "submission",
  ]) {
    expect(JSON.stringify(compactPacket)).not.toContain(`"${internalField}"`);
  }
  // A separately deployed older backend omits progress. This exact shape caused
  // the waiting call to throw only after its 20-second wait completed.
  const { progress, unresolvedReferences, ...legacyPacket } = packet;
  expect(progress.readiness).toBe("ready_for_synthesis");
  expect(unresolvedReferences).toEqual([]);
  expect(compactResearch(legacyPacket)).toMatchObject({
    ready: true,
    evidenceCounts: { retrieved: 1, pending: 0, failed: 0 },
  });
  expect(compactResearch({ kind: "run", run })).toMatchObject({
    ready: false,
    readiness: "unknown",
    evidenceCounts: null,
  });
  const evidence = await t.action(api.mcp.researchRead, {
    token,
    command: { kind: "get_evidence", evidenceId: packet.evidence[0]._id },
  });
  if (evidence.kind !== "evidence") throw new Error("Wrong evidence result");
  expect(evidence.contentUrl).toBeTruthy();
  await t.action(api.mcp.write, {
    token,
    command: {
      kind: "save_research",
      topicId: topic.topicId,
      summary: "User-agent synthesis",
      expectedRevision: 0,
      findings: [
        {
          id: "source-claim",
          text: "Source claim",
          assessment: "uncertain",
          note: "Needs human review",
          evidenceIds: [packet.evidence[0]._id],
        },
      ],
    },
  });
  const saved = await owner.query(api.relay.read, {
    command: { kind: "topic", topicId: topic.topicId },
  });
  if (saved.kind !== "topic") throw new Error("Wrong topic result");
  expect(saved.research).toHaveLength(1);
  expect(saved.research[0].review.kind).toBe("pending");
  expect(saved.research[0].claims[0].evidence[0].excerpt).toBe(
    "Source evidence",
  );
  expect(saved.research[0].findings?.[0].evidenceIds).toEqual([
    packet.evidence[0]._id,
  ]);
  expect(compactTopic(saved)).toMatchObject({
    expectedRevision: 1,
    research: { summary: "User-agent synthesis", review: { kind: "pending" } },
  });
  expect(
    fetchMock.mock.calls.filter(
      ([url, init]) => url.endsWith("/agent/runs") && init?.method === "POST",
    ),
  ).toHaveLength(1);
});
it("rejects revoked MCP credentials", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.action(api.mcp.read, {
      token: "revoked-fixture",
      command: { kind: "projects" },
    }),
  ).rejects.toThrow("Unauthenticated");
});

it("allows reading the end of a long source and rejects invalid evidence offsets", async () => {
  const t = convexTest(schema, modules);
  const evidenceId = await t.run(async (ctx) => {
    const projectId = await ctx.db.insert("projects", {
      owner: "user_owner",
      name: "Long evidence",
    });
    const topicId = await ctx.db.insert("topics", {
      projectId,
      title: "Long source",
      question: "Read the conclusion",
    });
    const searchId = await ctx.db.insert("workspaceSearches", {
      topicId,
      query: "long source",
      optionsJson: "{}",
    });
    const sourceId = await ctx.db.insert("workspaceSources", {
      topicId,
      searchId,
      title: "Source",
      url: "https://example.org/long",
      excerpt: "Lead",
    });
    return ctx.db.insert("workspaceEvidence", {
      topicId,
      sourceId,
      title: "Source",
      url: "https://example.org/long",
      content:
        "x".repeat(20000) + "The conclusion contradicts the introduction.",
      retrievedAt: Date.now(),
    });
  });
  const token = "owner-fixture";
  const first = await t.action(api.mcp.researchRead, {
    token,
    command: { kind: "get_evidence", evidenceId },
  });
  if (first.kind !== "evidence") throw new Error("Wrong result");
  expect(first.truncated).toBe(true);
  expect(first.nextOffset).toBe(20000);
  const last = await t.action(api.mcp.researchRead, {
    token,
    command: { kind: "get_evidence", evidenceId, offset: first.nextOffset },
  });
  expect(compactResearch(last)).toMatchObject({
    content: "The conclusion contradicts the introduction.",
    truncated: false,
  });
  for (const offset of [-1, 1.5, 30001]) {
    await expect(
      t.action(api.mcp.researchRead, {
        token,
        command: { kind: "get_evidence", evidenceId, offset },
      }),
    ).rejects.toThrow("offset");
  }
});
