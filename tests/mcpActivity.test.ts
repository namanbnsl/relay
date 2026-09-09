/// <reference types="vite/client" />
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

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
  const other = t.withIdentity({ subject: "user_other" });
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
  expect(
    (await other.query(api.mcpActivity.get, {})).lastSuccessfulReadAt,
  ).toBeNull();
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
  const evidence = await t.action(api.mcp.researchRead, {
    token,
    command: { kind: "get_evidence", evidenceId: packet.evidence[0]._id },
  });
  if (evidence.kind !== "evidence") throw new Error("Wrong evidence result");
  expect(evidence.contentUrl).toBeTruthy();
  expect(
    (await owner.query(api.mcpActivity.get, {})).lastSuccessfulReadAt,
  ).toBe(Date.now());
  await t.action(api.mcp.write, {
    token,
    command: {
      kind: "save_research",
      topicId: topic.topicId,
      summary: "User-agent synthesis",
      claims: [
        {
          text: "Source claim",
          assessment: "uncertain",
          note: "Needs human review",
          evidence: [
            {
              url: "https://example.org/source",
              title: "Source",
              excerpt: "Source evidence",
            },
          ],
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
  expect(
    fetchMock.mock.calls.filter(
      ([url, init]) => url.endsWith("/agent/runs") && init?.method === "POST",
    ),
  ).toHaveLength(1);
});
it("records only successful authenticated MCP operations and keeps the removable marker user-scoped", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "user_owner" });
  const other = t.withIdentity({ subject: "user_other" });
  expect(await owner.query(api.mcpActivity.get, {})).toEqual({
    lastSuccessfulReadAt: null,
    lastSuccessfulWriteAt: null,
    testMarker: null,
  });
  await expect(t.query(api.mcpActivity.get, {})).rejects.toThrow(
    "Unauthenticated",
  );
  await expect(
    t.action(api.mcp.read, {
      token: "revoked-fixture",
      command: { kind: "projects" },
    }),
  ).rejects.toThrow("Unauthenticated");
  await expect(
    t.action(api.mcp.read, {
      token: "owner-fixture",
      command: { kind: "topic", topicId: "invalid-id" },
    }),
  ).rejects.toThrow();
  expect(
    (await owner.query(api.mcpActivity.get, {})).lastSuccessfulReadAt,
  ).toBeNull();
  await t.action(api.mcp.read, {
    token: "owner-fixture",
    command: { kind: "projects" },
  });
  expect(
    (await owner.query(api.mcpActivity.get, {})).lastSuccessfulReadAt,
  ).toBe(Date.now());
  await expect(
    t.action(api.mcp.write, {
      token: "owner-fixture",
      command: {
        kind: "create_topic",
        projectId: "invalid-id",
        title: "Test",
        question: "Test?",
      },
    }),
  ).rejects.toThrow();
  expect(
    (await owner.query(api.mcpActivity.get, {})).lastSuccessfulWriteAt,
  ).toBeNull();
  await t.action(api.mcp.write, {
    token: "owner-fixture",
    command: { kind: "create_project", name: "MCP fixture" },
  });
  expect(
    (await owner.query(api.mcpActivity.get, {})).lastSuccessfulWriteAt,
  ).toBe(Date.now());
  const marker = await t.action(api.mcp.testConnection, {
    token: "owner-fixture",
    operation: "create",
  });
  vi.setSystemTime(Date.now() + 1000);
  expect(
    (
      await t.action(api.mcp.testConnection, {
        token: "owner-fixture",
        operation: "create",
      })
    ).testMarker,
  ).toEqual(marker.testMarker);
  await other.mutation(api.mcpActivity.clearConnectionTest, {});
  expect((await owner.query(api.mcpActivity.get, {})).testMarker).toEqual(
    marker.testMarker,
  );
  expect((await other.query(api.mcpActivity.get, {})).testMarker).toBeNull();
  await owner.mutation(api.mcpActivity.clearConnectionTest, {});
  const cleared = await owner.query(api.mcpActivity.get, {});
  expect(cleared.testMarker).toBeNull();
  expect(cleared.lastSuccessfulReadAt).not.toBeNull();
  expect(cleared.lastSuccessfulWriteAt).not.toBeNull();
  expect(
    (
      await t.action(api.mcp.testConnection, {
        token: "owner-fixture",
        operation: "remove",
      })
    ).testMarker,
  ).toBeNull();
});
