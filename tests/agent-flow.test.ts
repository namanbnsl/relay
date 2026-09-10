/// <reference types="vite/client" />
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    idPOAuthAccessToken: {
      verify: async (token: string) => ({
        subject: token === "owner" ? "user_owner" : "user_other",
        revoked: false,
        expired: false,
        scopes: ["openid"],
      }),
    },
  }),
}));
const modules = import.meta.glob("../convex/**/*.ts");
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("CLERK_SECRET_KEY", "fixture");
  vi.stubEnv("EXA_API_KEY", "fixture");
  vi.stubEnv("RESEARCH_ENABLED", "true");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function setup() {
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  const owner = t.withIdentity({ subject: "user_owner" });
  const project = await t.action(api.mcp.write, {
    token: "owner",
    command: { kind: "create_project", name: "Research project" },
  });
  const creation = {
    kind: "create_topic" as const,
    projectId: project.id,
    title: "Evidence",
    question: "What is known?",
    requestKey: "investigation-1",
  };
  const topic = await t.action(api.mcp.write, {
    token: "owner",
    command: creation,
  });
  const topicId = topic.id;
  const seedEvidenceId = await t.run(async (ctx) => {
    const id = ctx.db.normalizeId("topics", topicId);
    if (!id) throw new Error("Invalid topic");
    const searchId = await ctx.db.insert("workspaceSearches", {
      topicId: id,
      query: "Initial source",
      optionsJson: "{}",
    });
    const sourceId = await ctx.db.insert("workspaceSources", {
      topicId: id,
      searchId,
      url: "https://example.org/initial",
      title: "Initial source",
      excerpt: "Initial snippet",
    });
    return ctx.db.insert("workspaceEvidence", {
      topicId: id,
      sourceId,
      url: "https://example.org/initial",
      title: "Initial source",
      content: "Initial retrieved evidence",
      retrievedAt: Date.now(),
    });
  });
  const draft = {
    kind: "save_research_draft" as const,
    topicId,
    expectedRevision: 0,
    plan: "Compare primary sources",
    openQuestions: ["What conflicts?"],
    summary: "Initial sourced research",
    findings: [
      {
        id: "initial",
        text: "Initial finding",
        assessment: "supported" as const,
        note: "",
        evidenceIds: [seedEvidenceId],
      },
    ],
  };
  return { t, owner, project, creation, topicId, draft };
}
it("completes the authenticated agent exploration, draft, review and reconnect sequence with provider fixtures", async () => {
  const { t, owner, project, creation, topicId, draft } = await setup();
  const projects = await t.action(api.mcp.read, {
    token: "owner",
    command: { kind: "projects" },
  });
  expect(projects.kind === "projects" && projects.projects[0]._id).toBe(
    project.id,
  );
  expect(
    (await t.action(api.mcp.write, { token: "owner", command: creation })).id,
  ).toBe(topicId);
  const distinct = await t.action(api.mcp.write, {
    token: "owner",
    command: { ...creation, requestKey: "investigation-2" },
  });
  expect(distinct.id).not.toBe(topicId);
  await expect(
    t.action(api.mcp.write, {
      token: "owner",
      command: { ...creation, question: "Changed inputs" },
    }),
  ).rejects.toThrow("different inputs");
  // This is the same reactive query the project's topic list subscribes to.
  const projectState = await owner.query(api.relay.read, {
    command: { kind: "project", projectId: project.id },
  });
  expect(
    projectState.kind === "project" && projectState.topics.map((t) => t._id),
  ).toContain(topicId);
  await t.action(api.mcp.write, { token: "owner", command: draft });
  const fetchMock = vi.fn(
    async (url: string, init?: RequestInit) =>
      new Response(
        JSON.stringify(
          url.endsWith("/search")
            ? {
                results: [
                  {
                    url: "https://example.org/source",
                    title: "Primary source",
                    highlights: ["Search excerpt only"],
                  },
                ],
                costDollars: { total: 0.005 },
              }
            : url.endsWith("/contents")
              ? {
                  results: [
                    {
                      url: "https://example.org/source",
                      title: "Primary source",
                      text: "Retrieved page: the measured value is 42.",
                    },
                  ],
                  costDollars: { total: 0.001 },
                }
              : init?.method === "POST"
                ? { id: "focused_task" }
                : {
                    id: "focused_task",
                    status: "completed",
                    output: {
                      text: "Provider reports a value of 42.",
                      grounding: [
                        {
                          field: "text",
                          citations: [{ url: "https://example.org/source" }],
                        },
                      ],
                    },
                    costDollars: { total: 0.1 },
                  },
        ),
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const search = await t.action(api.mcp.sources, {
    token: "owner",
    command: {
      kind: "search_sources",
      topicId,
      query: "primary source",
      includeDomains: ["example.org"],
      numResults: 3,
    },
  });
  if (search.kind !== "search_excerpts")
    throw new Error("Wrong search response");
  expect(search.sources[0].excerpt).toBe("Search excerpt only");
  const read = await t.action(api.mcp.sources, {
    token: "owner",
    command: {
      kind: "read_sources",
      topicId,
      sourceIds: [search.sources[0]._id],
    },
  });
  if (read.kind !== "retrieved_content")
    throw new Error("Wrong retrieval response");
  const evidence = read.evidence[0];
  expect(evidence.content).toContain("Retrieved page");
  expect(evidence.reportedDollars).toBe(0.001);
  const calls = fetchMock.mock.calls.length;
  expect(
    (
      await t.action(api.mcp.sources, {
        token: "owner",
        command: {
          kind: "read_sources",
          topicId,
          sourceIds: [search.sources[0]._id],
        },
      })
    ).kind,
  ).toBe("retrieved_content");
  expect(fetchMock.mock.calls).toHaveLength(calls);
  const runCommand = {
    kind: "start_research" as const,
    topicId,
    requestKey: "focused-request-1",
    question: "What measurement method was used?",
  };
  const run = await t.action(api.mcp.researchWrite, {
    token: "owner",
    command: runCommand,
  });
  expect(run.state.kind).toBe("queued");
  expect(run.question).toBe(runCommand.question);
  expect(
    (
      await t.action(api.mcp.researchWrite, {
        token: "owner",
        command: runCommand,
      })
    )._id,
  ).toBe(run._id);
  for (let i = 0; i < 40; i++) {
    await vi.advanceTimersByTimeAsync(15000);
    await t.finishInProgressScheduledFunctions();
    const state = await t.query(internal.research.owned, { runId: run._id });
    if (state.state.kind === "succeeded" || state.state.kind === "failed")
      break;
  }
  const packet = await t.action(api.mcp.researchRead, {
    token: "owner",
    command: { kind: "get_research_packet", runId: run._id },
  });
  expect(packet.kind === "packet" && packet.run.state.kind).toBe("succeeded");
  if (packet.kind !== "packet") throw new Error("Wrong packet");
  const finding = {
    id: "measured-value",
    text: "The measured value is 42",
    assessment: "supported" as const,
    note: "Reported measurement",
    evidenceIds: [evidence._id, packet.evidence[0]._id],
    verification: {
      provenance: "agent_reported" as const,
      findingRevision: 2,
      model: "user-owned-model",
      verdict: "Matches quoted evidence",
      evidenceIds: [evidence._id],
    },
  };
  await t.action(api.mcp.write, {
    token: "owner",
    command: {
      ...draft,
      expectedRevision: 1,
      summary: "Sourced synthesis",
      findings: [finding],
    },
  });
  const first = await t.action(api.mcp.read, {
    token: "owner",
    command: { kind: "topic", topicId },
  });
  if (first.kind !== "topic") throw new Error("Wrong topic");
  expect(first.research).toHaveLength(2);
  expect(first.draft?.findings[0].verification?.provenance).toBe(
    "agent_reported",
  );
  await t.action(api.mcp.write, {
    token: "owner",
    command: {
      ...draft,
      expectedRevision: 2,
      summary: "Sourced synthesis",
      findings: [
        { ...finding, text: "The source reports a measured value of 42" },
      ],
    },
  });
  const revised = await t.action(api.mcp.read, {
    token: "owner",
    command: { kind: "topic", topicId },
  });
  if (revised.kind !== "topic") throw new Error("Wrong topic");
  expect(revised.draft?.findings[0]).toMatchObject({
    id: finding.id,
    revision: 3,
    evidenceIds: finding.evidenceIds,
  });
  expect(revised.draft?.findings[0].verification).toBeUndefined();
  const submit = { kind: "submit_research" as const, topicId, revision: 3 };
  const version = await t.action(api.mcp.write, {
    token: "owner",
    command: submit,
  });
  expect(
    (await t.action(api.mcp.write, { token: "owner", command: submit })).id,
  ).toBe(version.id);
  const inspected = await owner.query(api.sources.evidence, {
    topicId,
    evidenceId: evidence._id,
  });
  expect(inspected.excerpt).toContain("42");
  await owner.mutation(api.relay.write, {
    command: {
      kind: "review_research",
      versionId: version.id,
      decision: "changes_requested",
      note: "Explain the measurement uncertainty.",
    },
  });
  const reconnected = await t.action(api.mcp.read, {
    token: "owner",
    command: { kind: "topic", topicId },
  });
  if (reconnected.kind !== "topic" || !reconnected.draft)
    throw new Error("Missing draft");
  expect(reconnected.research[0].review).toMatchObject({
    kind: "changes_requested",
    note: "Explain the measurement uncertainty.",
  });
  await t.action(api.mcp.write, {
    token: "owner",
    command: {
      ...draft,
      expectedRevision: 3,
      summary: "Updated to explain uncertainty",
      findings: reconnected.draft.findings,
      openQuestions: ["How large is the uncertainty?"],
    },
  });
  expect(
    (await t.action(api.mcp.write, { token: "owner", command: submit })).id,
  ).toBe(version.id);
  const final = await owner.query(api.relay.read, {
    command: { kind: "topic", topicId },
  });
  if (final.kind !== "topic") throw new Error("Wrong topic");
  expect(final.draft?.revision).toBe(4);
  expect(final.research).toHaveLength(4);
  expect(final.research[0].summary).toBe("Updated to explain uncertainty");
  expect(final.research[0].findings?.[0].evidenceIds).toEqual(
    finding.evidenceIds,
  );
  expect(final.research[0].claims[0].evidence[0].url).toBe(evidence.url);
  expect(
    (await t.run((ctx) => ctx.db.query("researchDrafts").collect()))[1]
      .findings[0].verification?.model,
  ).toBe("user-owned-model");
});
it("rejects cross-user operations, forged evidence, stale saves and stale first submissions", async () => {
  const { t, owner, project, creation, topicId, draft } = await setup();
  for (const command of [
    creation,
    draft,
    { kind: "submit_research" as const, topicId, revision: 1 },
  ])
    await expect(
      t.action(api.mcp.write, { token: "other", command }),
    ).rejects.toThrow("not found");
  await expect(
    t.action(api.mcp.read, {
      token: "other",
      command: { kind: "topic", topicId },
    }),
  ).rejects.toThrow("not found");
  await expect(
    t.action(api.mcp.sources, {
      token: "other",
      command: { kind: "search_sources", topicId, query: "secret" },
    }),
  ).rejects.toThrow("not found");
  await t.action(api.mcp.write, { token: "owner", command: draft });
  const edits = await Promise.allSettled([
    owner.mutation(api.relay.write, {
      command: { ...draft, expectedRevision: 1, summary: "Human edit" },
    }),
    t.action(api.mcp.write, {
      token: "owner",
      command: { ...draft, expectedRevision: 1, summary: "Agent edit" },
    }),
  ]);
  expect(edits.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(edits.filter((x) => x.status === "rejected")).toHaveLength(1);
  await expect(
    t.action(api.mcp.write, {
      token: "owner",
      command: { kind: "submit_research", topicId, revision: 1 },
    }),
  ).resolves.toMatchObject({ revision: 1, status: "pending" });
  await expect(
    t.action(api.mcp.write, {
      token: "owner",
      command: {
        ...draft,
        expectedRevision: 2,
        findings: [
          {
            id: "f",
            text: "Forged",
            assessment: "supported",
            note: "",
            evidenceIds: [project.id],
          },
        ],
      },
    }),
  ).rejects.toThrow("evidence not found");
  await expect(
    owner.query(api.sources.evidence, { topicId, evidenceId: project.id }),
  ).rejects.toThrow("evidence not found");
});
it("permits distinct focused tasks on the same topic while rejecting key reuse with changed inputs", async () => {
  const { t, topicId } = await setup();
  const command = {
    kind: "start_research" as const,
    topicId,
    requestKey: "focused-run-one",
    question: "First focused question",
  };
  const first = await t.action(api.mcp.researchWrite, {
    token: "owner",
    command,
  });
  const second = await t.action(api.mcp.researchWrite, {
    token: "owner",
    command: {
      ...command,
      requestKey: "focused-run-two",
      question: "A contradiction to investigate",
    },
  });
  expect(first._id).not.toBe(second._id);
  await expect(
    t.action(api.mcp.researchWrite, {
      token: "owner",
      command: { ...command, question: "Different" },
    }),
  ).rejects.toThrow("different inputs");
  expect(
    (await t.action(api.mcp.researchWrite, { token: "owner", command }))._id,
  ).toBe(first._id);
});

it("enforces evidence ownership and topic scope, validates search bounds, and preserves approved content", async () => {
  const { t, owner, creation, topicId, draft } = await setup();
  const second = await t.action(api.mcp.write, {
    token: "owner",
    command: { ...creation, requestKey: "another-topic-key" },
  });
  const fetchMock = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.endsWith("/search")
            ? {
                results: [
                  {
                    url: "https://example.org/source",
                    title: "Source",
                    highlights: ["Untrusted excerpt"],
                  },
                ],
              }
            : {
                results: [
                  {
                    url: "https://example.org/source",
                    text: "Retrieved evidence",
                  },
                ],
                costDollars: { total: 0.001 },
              },
        ),
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    t.action(api.mcp.sources, {
      token: "owner",
      command: { kind: "search_sources", topicId, query: "x", numResults: 11 },
    }),
  ).rejects.toThrow("Invalid search");
  await expect(
    t.action(api.mcp.sources, {
      token: "owner",
      command: {
        kind: "search_sources",
        topicId,
        query: "x",
        includeDomains: ["https://example.org/"],
      },
    }),
  ).rejects.toThrow("Invalid search");
  expect(fetchMock).not.toHaveBeenCalled();
  const search = await t.action(api.mcp.sources, {
    token: "owner",
    command: { kind: "search_sources", topicId, query: "x" },
  });
  if (search.kind !== "search_excerpts") throw new Error("Wrong search");
  const sourceId = search.sources[0]._id;
  await expect(
    t.action(api.mcp.sources, {
      token: "owner",
      command: {
        kind: "read_sources",
        topicId: second.id,
        sourceIds: [sourceId],
      },
    }),
  ).rejects.toThrow("not found");
  await expect(
    t.action(api.mcp.sources, {
      token: "other",
      command: { kind: "read_sources", topicId, sourceIds: [sourceId] },
    }),
  ).rejects.toThrow("not found");
  const retrieved = await t.action(api.mcp.sources, {
    token: "owner",
    command: { kind: "read_sources", topicId, sourceIds: [sourceId] },
  });
  if (retrieved.kind !== "retrieved_content")
    throw new Error("Wrong retrieval");
  const evidenceId = retrieved.evidence[0]._id;
  const finding = {
    id: "finding-1",
    text: "Claim",
    assessment: "supported" as const,
    note: "",
    evidenceIds: [evidenceId],
  };
  await expect(
    t.action(api.mcp.write, {
      token: "owner",
      command: { ...draft, topicId: second.id, findings: [finding] },
    }),
  ).rejects.toThrow("Evidence not found");
  await expect(
    t.action(api.mcp.write, {
      token: "owner",
      command: {
        ...draft,
        findings: [{ ...finding, evidenceIds: [sourceId] }],
      },
    }),
  ).rejects.toThrow("evidence not found");
  await expect(
    t.action(api.mcp.researchRead, {
      token: "other",
      command: { kind: "get_evidence", evidenceId },
    }),
  ).rejects.toThrow("not found");
  const direct = await t.action(api.mcp.researchRead, {
    token: "owner",
    command: { kind: "get_evidence", evidenceId },
  });
  expect(
    direct.kind === "evidence" &&
      "content" in direct.evidence &&
      direct.evidence.content,
  ).toBe("Retrieved evidence");
  await t.action(api.mcp.write, {
    token: "owner",
    command: {
      ...draft,
      summary: "Original approved content",
      findings: [finding],
    },
  });
  const submit = { kind: "submit_research" as const, topicId, revision: 1 };
  const version = await t.action(api.mcp.write, {
    token: "owner",
    command: submit,
  });
  const review = {
    kind: "review_research" as const,
    versionId: version.id,
    decision: "approved" as const,
    note: "",
  };
  await expect(
    t.action(api.mcp.write, { token: "owner", command: review }),
  ).rejects.toThrow("Human review");
  await owner.mutation(api.relay.write, { command: review });
  await owner.mutation(api.relay.write, { command: review });
  await t.action(api.mcp.write, {
    token: "owner",
    command: {
      ...draft,
      expectedRevision: 1,
      summary: "Later work",
      findings: [{ ...finding, text: "Changed claim" }],
    },
  });
  expect(
    (await t.action(api.mcp.write, { token: "owner", command: submit })).status,
  ).toBe("approved");
  const state = await owner.query(api.relay.read, {
    command: { kind: "topic", topicId },
  });
  if (state.kind !== "topic") throw new Error("Wrong topic");
  expect(state.research[0]).toMatchObject({
    summary: "Later work",
    review: { kind: "pending" },
  });
  expect(state.research[1].findings?.[0].text).toBe("Claim");
  expect(state.draft?.findings[0].text).toBe("Changed claim");
  await expect(
    t.action(api.mcp.write, {
      token: "owner",
      command: {
        kind: "save_research",
        topicId,
        summary: "Bypass",
        claims: [],
      },
    }),
  ).rejects.toThrow("Research needs");
});
it("compares search date bounds chronologically across timestamp precision", async () => {
  const { t, topicId } = await setup();
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify({ results: [] })),
  );
  vi.stubGlobal("fetch", fetchMock);
  const command = {
    kind: "search_sources" as const,
    topicId,
    query: "primary source",
    startPublishedDate: "2026-01-01T00:00:00Z",
    endPublishedDate: "2026-01-01T00:00:00.100Z",
  };
  await expect(
    t.action(api.mcp.sources, { token: "owner", command }),
  ).resolves.toMatchObject({ kind: "search_excerpts" });
  await expect(
    t.action(api.mcp.sources, {
      token: "owner",
      command: {
        ...command,
        startPublishedDate: command.endPublishedDate,
        endPublishedDate: command.startPublishedDate,
      },
    }),
  ).rejects.toThrow("Invalid search");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("records known retrieval charges on empty content, rejects malformed provider data, and honors the execution switch", async () => {
  const { t, topicId } = await setup();
  const mock = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.endsWith("/search")
            ? {
                results: [
                  {
                    url: "https://example.org/source",
                    highlights: ["Excerpt"],
                  },
                ],
              }
            : { results: [], costDollars: { total: 0.003 } },
        ),
      ),
  );
  vi.stubGlobal("fetch", mock);
  const search = await t.action(api.mcp.sources, {
    token: "owner",
    command: { kind: "search_sources", topicId, query: "x" },
  });
  if (search.kind !== "search_excerpts") throw new Error("Wrong search");
  const sourceId = search.sources[0]._id;
  const result = await t.action(api.mcp.sources, {
    token: "owner",
    command: { kind: "read_sources", topicId, sourceIds: [sourceId] },
  });
  expect(result.kind === "retrieved_content" && result.evidence).toEqual([]);
  expect(result.kind === "retrieved_content" && result.failures).toHaveLength(
    1,
  );
  const source = await t.run((ctx) => ctx.db.get(sourceId));
  expect(source?.retrievalDollars).toBe(0.003);
  vi.stubEnv("RESEARCH_ENABLED", "false");
  const calls = mock.mock.calls.length;
  await expect(
    t.action(api.mcp.sources, {
      token: "owner",
      command: { kind: "search_sources", topicId, query: "x" },
    }),
  ).rejects.toThrow("paused");
  expect(mock.mock.calls).toHaveLength(calls);
  vi.stubEnv("RESEARCH_ENABLED", "true");
  mock.mockImplementation(
    async () =>
      new Response(
        JSON.stringify({ results: [{ url: "javascript:alert(1)" }] }),
      ),
  );
  await expect(
    t.action(api.mcp.sources, {
      token: "owner",
      command: { kind: "search_sources", topicId, query: "x" },
    }),
  ).rejects.toThrow("provider_invalid_search");
});
