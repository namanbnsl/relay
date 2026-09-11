/// <reference types="vite/client" />
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { defaultDiscovery } from "../convex/model/discoveryContracts";
import { nextStart } from "../convex/model/schedule";
import { parseCandidates, remoteRun } from "../convex/model/monitorExa";
import { verifySignature } from "../convex/monitorActions";
import { createHmac } from "node:crypto";
const modules = import.meta.glob("../convex/**/*.ts");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-11T10:00:00Z"));
  vi.stubEnv("MONITORING_ENABLED", "false");
  vi.stubEnv("RESEARCH_ENABLED", "false");
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
  const other = t.withIdentity({ subject: "user_other" });
  const p = await owner.mutation(api.relay.write, {
    command: { kind: "create_project", name: "AI Explained" },
  });
  const topic = await owner.mutation(api.relay.write, {
    command: {
      kind: "create_topic",
      projectId: p.id,
      title: "Can X replace my subscription?",
      question: "How does X compare?",
    },
  });
  const monitorId = await t.run(async (ctx) => {
    const projectId = ctx.db.normalizeId("projects", p.id);
    if (!projectId) throw new Error("Missing ID");
    return ctx.db.insert("monitors", {
      projectId,
      requestKey: "fixture-monitor",
      name: "Models",
      query: "new models",
      domains: ["example.org"],
      paused: false,
      removed: false,
      generation: 1,
      sync: "ready",
      remoteId: "mon_fixture",
      secret: "secret",
    });
  });
  const candidate = {
    title: "Can Y replace my subscription?",
    question: "How does Y compare?",
    angle: "Costs",
    explanation: "A new model has been released.",
    links: ["https://example.org/model-y"],
  };
  const ingest = (runId = "run_fixture") =>
    t.mutation(internal.discovery.ingest, {
      monitorId,
      remoteId: "mon_fixture",
      runId,
      at: Date.now(),
      status: "completed",
      candidates: [candidate],
    });
  return {
    t,
    owner,
    other,
    projectId: p.id,
    topicId: topic.id,
    monitorId,
    candidate,
    ingest,
  };
}
describe("workspace discovery persistence and authority", () => {
  it("defaults legacy workspaces/topics safely and never exposes signing secrets", async () => {
    const { owner, other, projectId, topicId } = await setup();
    const state = await owner.query(api.discovery.read, { projectId });
    expect(state.config).toEqual(defaultDiscovery);
    expect(state.monitors[0]).not.toHaveProperty("secret");
    const topic = await owner.query(api.relay.read, {
      command: { kind: "topic", topicId },
    });
    expect(topic.kind === "topic" && topic.runs).toEqual([]);
    await expect(
      other.query(api.discovery.read, { projectId }),
    ).rejects.toThrow("not found");
    await expect(
      other.query(api.discovery.topicContext, { topicId }),
    ).rejects.toThrow("not found");
    await expect(
      other.mutation(api.discovery.write, {
        command: {
          kind: "configure_discovery",
          projectId,
          config: defaultDiscovery,
        },
      }),
    ).rejects.toThrow("not found");
  });
  it("deduplicates deliveries and topic creation atomically, preserves attachments and dismissals", async () => {
    const { t, owner, other, projectId, topicId, ingest } = await setup();
    await ingest();
    await ingest();
    await ingest("second-run");
    const state = await owner.query(api.discovery.read, { projectId });
    expect(state.updates).toHaveLength(1);
    const update = state.updates[0];
    const command = {
      kind: "topic_from_update" as const,
      updateId: update._id,
      title: update.title,
      question: update.question,
      angle: update.angle,
    };
    await expect(
      other.mutation(api.discovery.write, { command }),
    ).rejects.toThrow("not found");
    const ids = await Promise.all([
      owner.mutation(api.discovery.write, { command }),
      owner.mutation(api.discovery.write, { command }),
    ]);
    expect(ids[0]).toBe(ids[1]);
    const attach = {
      kind: "attach_update" as const,
      topicId,
      updateId: update._id,
    };
    await owner.mutation(api.discovery.write, { command: attach });
    await owner.mutation(api.discovery.write, { command: attach });
    expect(
      (await owner.query(api.discovery.topicContext, { topicId })).updates,
    ).toHaveLength(1);
    expect(
      await t.run((ctx) => ctx.db.query("researchRuns").collect()),
    ).toHaveLength(0);
    expect(
      await t.run((ctx) => ctx.db.query("topicUpdates").collect()),
    ).toHaveLength(2);
    await owner.mutation(api.discovery.write, {
      command: { kind: "dismiss_update", updateId: update._id },
    });
    await ingest("third-run");
    expect(
      (await owner.query(api.discovery.read, { projectId })).updates[0]
        .dismissed,
    ).toBe(true);
  });
  it("automatic candidates become one-time topics without paid research, and reuse existing questions", async () => {
    const { owner, t, projectId, topicId, monitorId, candidate, ingest } =
      await setup();
    await owner.mutation(api.discovery.write, {
      command: {
        kind: "configure_discovery",
        projectId,
        config: {
          ...defaultDiscovery,
          cadence: "daily",
          candidates: "automatic",
        },
      },
    });
    await ingest();
    await t.mutation(internal.discovery.ingest, {
      monitorId,
      remoteId: "mon_fixture",
      runId: "existing",
      at: Date.now(),
      status: "completed",
      candidates: [
        {
          ...candidate,
          title: "A revised video title",
          question: "How does X compare?",
        },
      ],
    });
    const state = await owner.query(api.discovery.read, { projectId });
    expect(
      state.updates.find((u) => u.title === "A revised video title")
        ?.createdTopicId,
    ).toBe(topicId);
    const topics = await t.run((ctx) => ctx.db.query("topics").collect());
    expect(topics).toHaveLength(2);
    expect(topics.find((t) => t.title === candidate.title)?.frequency).toEqual({
      kind: "once",
    });
    expect(
      await t.run((ctx) => ctx.db.query("researchRuns").collect()),
    ).toHaveLength(0);
  });
  it("rejects cross-workspace attachments and monitor ownership forgery", async () => {
    const { owner, other, monitorId, projectId, ingest } = await setup();
    await ingest();
    const second = await owner.mutation(api.relay.write, {
      command: { kind: "create_project", name: "Other channel" },
    });
    const target = await owner.mutation(api.relay.write, {
      command: {
        kind: "create_topic",
        projectId: second.id,
        title: "Elsewhere",
        question: "Why?",
      },
    });
    const update = (await owner.query(api.discovery.read, { projectId }))
      .updates[0];
    await expect(
      owner.mutation(api.discovery.write, {
        command: {
          kind: "attach_update",
          updateId: update._id,
          topicId: target.id,
        },
      }),
    ).rejects.toThrow("another workspace");
    await expect(
      other.mutation(api.discovery.write, {
        command: { kind: "monitor_action", monitorId, action: "remove" },
      }),
    ).rejects.toThrow("not found");
  });
  it("validates domains and makes source creation retry safe", async () => {
    const { owner, projectId, t } = await setup();
    const command = {
      kind: "save_monitor" as const,
      projectId,
      requestKey: "create-source-1",
      name: "Costs",
      query: "Inference costs",
      domains: ["example.com"],
      paused: true,
    };
    expect(await owner.mutation(api.discovery.write, { command })).toBe(
      await owner.mutation(api.discovery.write, { command }),
    );
    await expect(
      owner.mutation(api.discovery.write, {
        command: { ...command, query: "changed" },
      }),
    ).rejects.toThrow("different source settings");
    await expect(
      owner.mutation(api.discovery.write, {
        command: {
          ...command,
          requestKey: "different",
          domains: ["file:///etc/passwd"],
        },
      }),
    ).rejects.toThrow("website domains");
    expect(
      await t.run((ctx) => ctx.db.query("monitors").collect()),
    ).toHaveLength(2);
  });
});
describe("daily investigation dispatch", () => {
  async function scheduled() {
    const s = await setup();
    await s.owner.mutation(api.discovery.write, {
      command: {
        kind: "save_brief",
        topicId: s.topicId,
        title: "Topic",
        question: "Question?",
        angle: "Costs",
        coverage: "Limits",
        status: "active",
        frequency: {
          kind: "daily",
          time: "09:00",
          timezone: "Asia/Kolkata",
          paused: false,
        },
      },
    });
    const topic = await s.t.run(async (ctx) => {
      const id = ctx.db.normalizeId("topics", s.topicId);
      if (!id) throw new Error("ID");
      return ctx.db.get(id);
    });
    if (!topic?.nextResearchAt || !topic.scheduleGeneration)
      throw new Error("No schedule");
    return {
      ...s,
      args: {
        topicId: topic._id,
        generation: topic.scheduleGeneration,
        due: topic.nextResearchAt,
      },
    };
  }
  it("dispatches at most one catch-up and ignores duplicate/stale schedule deliveries", async () => {
    const { t, owner, projectId, args, topicId } = await scheduled();
    vi.setSystemTime(args.due + 5 * 86400000);
    await t.mutation(internal.schedules.cycle, args);
    await t.mutation(internal.schedules.cycle, args);
    let state = await owner.query(api.discovery.read, { projectId });
    expect(state.investigations).toHaveLength(1);
    expect(state.investigations[0].state.kind).toBe("unavailable");
    const topic = await t.run((ctx) => ctx.db.get(args.topicId));
    expect(topic?.nextResearchAt).toBeGreaterThan(Date.now());
    await owner.mutation(api.discovery.write, {
      command: {
        kind: "save_brief",
        topicId,
        title: "Topic",
        question: "Question?",
        angle: "",
        coverage: "",
        status: "active",
        frequency: {
          kind: "daily",
          time: "14:00",
          timezone: "America/New_York",
          paused: true,
        },
      },
    });
    await t.mutation(internal.schedules.cycle, {
      ...args,
      due: topic?.nextResearchAt ?? 0,
    });
    state = await owner.query(api.discovery.read, { projectId });
    expect(state.investigations).toHaveLength(1);
    expect(
      (await t.run((ctx) => ctx.db.get(args.topicId)))?.nextResearchAt,
    ).toBeUndefined();
  });
  it("reuses Workflow executor and blocks overlapping cycles while synthesis is pending", async () => {
    const { t, owner, args, projectId } = await scheduled();
    vi.stubEnv("EXA_API_KEY", "fixture-key");
    vi.stubEnv("RESEARCH_ENABLED", "true");
    vi.setSystemTime(args.due);
    await t.mutation(internal.schedules.cycle, args);
    const runs = await t.run((ctx) => ctx.db.query("researchRuns").collect());
    expect(runs).toHaveLength(1);
    expect(runs[0].workflowId).toBeDefined();
    const topic = await t.run((ctx) => ctx.db.get(args.topicId));
    vi.setSystemTime(topic?.nextResearchAt ?? args.due);
    await t.mutation(internal.schedules.cycle, {
      ...args,
      due: topic?.nextResearchAt ?? args.due,
    });
    expect(
      await t.run((ctx) => ctx.db.query("researchRuns").collect()),
    ).toHaveLength(1);
    const state = await owner.query(api.discovery.read, { projectId });
    expect(state.investigations).toHaveLength(1);
    await expect(
      owner.mutation(api.discovery.write, {
        command: {
          kind: "finish_investigation",
          investigationId: state.investigations[0]._id,
          expectedRevision: 0,
          outcome: "no_material_update",
          explanation: "There were no monitoring results today.",
        },
      }),
    ).rejects.toThrow("completed provider investigation");
  });
  it("archives pause research independently of workspace monitoring", async () => {
    const { owner, t, topicId, args, monitorId } = await scheduled();
    await owner.mutation(api.discovery.write, {
      command: {
        kind: "save_brief",
        topicId,
        title: "Topic",
        question: "Question?",
        angle: "",
        coverage: "",
        status: "archived",
        frequency: {
          kind: "daily",
          time: "09:00",
          timezone: "Asia/Kolkata",
          paused: false,
        },
      },
    });
    expect(
      (await t.run((ctx) => ctx.db.get(args.topicId)))?.frequency,
    ).toMatchObject({ paused: true });
    expect((await t.run((ctx) => ctx.db.get(monitorId)))?.paused).toBe(false);
  });
});
describe("Exa monitor boundary", () => {
  it("validates timestamped signatures, rejecting tampering and replay", () => {
    const body = '{"id":"event_1"}';
    const t = Math.floor(Date.now() / 1000);
    const secret = "fixture";
    const signature = createHmac("sha256", secret)
      .update(`${t}.${body}`)
      .digest("hex");
    expect(verifySignature(body, `t=${t},v1=${signature}`, secret)).toBe(true);
    expect(verifySignature(body + " ", `t=${t},v1=${signature}`, secret)).toBe(
      false,
    );
    expect(
      verifySignature(
        body,
        `t=${t},v1=${signature}`,
        secret,
        Date.now() + 301000,
      ),
    ).toBe(false);
  });
  it("accepts actual structured output and refuses missing/invalid output or unsupported links", () => {
    const base = {
      id: "run",
      monitorId: "mon",
      status: "completed",
      updatedAt: "2026-09-11T10:00:00Z",
    };
    const c = {
      title: "Video",
      question: "Why?",
      angle: "Costs",
      explanation: "New data",
      links: ["https://example.org/report", "https://unsupported.org/"],
    };
    expect(
      parseCandidates(
        remoteRun.parse({
          ...base,
          output: {
            results: [{ url: "https://example.org/report" }],
            content: { candidates: [c] },
          },
        }),
      )[0].links,
    ).toEqual(["https://example.org/report"]);
    expect(() => parseCandidates(remoteRun.parse(base))).toThrow("no output");
    expect(() =>
      parseCandidates(
        remoteRun.parse({
          ...base,
          output: { results: [], content: "broken" },
        }),
      ),
    ).toThrow("invalid candidate JSON");
    expect(
      parseCandidates(
        remoteRun.parse({
          ...base,
          output: { results: [], content: { candidates: [] } },
        }),
      ),
    ).toEqual([]);
  });
  it("uses local dates across DST gaps, repeated hours and timezone changes", () => {
    expect(
      new Date(
        nextStart(
          Date.parse("2026-03-08T05:00:00Z"),
          "02:30",
          "America/New_York",
        ),
      ).toISOString(),
    ).toBe("2026-03-08T07:00:00.000Z");
    expect(
      new Date(
        nextStart(
          Date.parse("2026-11-01T05:30:00Z"),
          "01:30",
          "America/New_York",
        ),
      ).toISOString(),
    ).toBe("2026-11-02T06:30:00.000Z");
    expect(
      new Date(
        nextStart(Date.parse("2026-09-11T10:00:00Z"), "09:00", "Asia/Kolkata"),
      ).toISOString(),
    ).toBe("2026-09-12T03:30:00.000Z");
    expect(() => nextStart(Date.now(), "09:00", "not-a-timezone")).toThrow();
  });
});

describe("provider operations and delivery recovery", () => {
  function enabled() {
    vi.stubEnv("MONITORING_ENABLED", "true");
    vi.stubEnv("EXA_API_KEY", "fixture-key");
    vi.stubEnv("CONVEX_SITE_URL", "https://fixture.convex.site");
  }
  it("verifies signed delivery ownership, fetches authoritative output, and retries failed ingestion", async () => {
    const { t, owner, projectId, candidate } = await setup();
    enabled();
    const body = JSON.stringify({
      id: "evt1",
      type: "monitor.run.completed",
      data: {
        id: "run_hook",
        monitorId: "mon_fixture",
        metadata: { owner: "user_other" },
      },
    });
    const time = Math.floor(Date.now() / 1000);
    const signature = `t=${time},v1=${createHmac("sha256", "secret").update(`${time}.${body}`).digest("hex")}`;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("failure", { status: 500 }))
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              id: "run_hook",
              monitorId: "mon_fixture",
              status: "completed",
              updatedAt: new Date().toISOString(),
              output: {
                results: candidate.links.map((url) => ({ url })),
                content: { candidates: [candidate] },
              },
            }),
          ),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(
      await t.action(internal.monitorActions.webhook, {
        body,
        signature: "invalid",
      }),
    ).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      await t.action(internal.monitorActions.webhook, { body, signature }),
    ).toBe(503);
    expect(
      await t.run((ctx) => ctx.db.query("discoveryDeliveries").collect()),
    ).toHaveLength(0);
    expect(
      await t.action(internal.monitorActions.webhook, { body, signature }),
    ).toBe(200);
    expect(
      await t.action(internal.monitorActions.webhook, { body, signature }),
    ).toBe(200);
    expect(
      (await owner.query(api.discovery.read, { projectId })).updates,
    ).toHaveLength(1);
  });
  it("never duplicates an ambiguous monitor creation and does not configure a recurring interval on create", async () => {
    const { t, owner, projectId } = await setup();
    enabled();
    const value = await owner.mutation(api.discovery.write, {
      command: {
        kind: "save_monitor",
        projectId,
        requestKey: "ambiguous-create",
        name: "Monitor",
        query: "new models",
        domains: [],
        paused: false,
      },
    });
    const monitorId = await t.run(async (ctx) =>
      ctx.db.normalizeId("monitors", value),
    );
    if (!monitorId) throw new Error("ID");
    const fetcher = vi.fn(async () => {
      throw new Error("Connection lost after submission");
    });
    vi.stubGlobal("fetch", fetcher);
    await t.action(internal.monitorActions.sync, { monitorId });
    await t.action(internal.monitorActions.sync, { monitorId });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const stored = await t.run((ctx) => ctx.db.get(monitorId));
    expect(stored?.error).toContain("Creation outcome uncertain");
  });
  it("persists a one-time signing secret, reconciles actual state, and retry-safe removal accepts provider 404", async () => {
    const { t, owner, projectId } = await setup();
    enabled();
    const value = await owner.mutation(api.discovery.write, {
      command: {
        kind: "save_monitor",
        projectId,
        requestKey: "working-create",
        name: "Monitor",
        query: "new models",
        domains: [],
        paused: false,
      },
    });
    const monitorId = await t.run(async (ctx) =>
      ctx.db.normalizeId("monitors", value),
    );
    if (!monitorId) throw new Error("ID");
    const requests: Array<{ method: string; body: unknown }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        requests.push({
          method: init.method ?? "GET",
          body: init.body ? JSON.parse(String(init.body)) : null,
        });
        if (init.method === "DELETE")
          return new Response("Gone", { status: 404 });
        return new Response(
          JSON.stringify(
            url.includes("/runs?")
              ? { data: [] }
              : {
                  id: "mon_new",
                  status: "active",
                  webhookSecret: "new-secret",
                  nextRunAt: null,
                },
          ),
        );
      }),
    );
    await t.action(internal.monitorActions.sync, { monitorId });
    expect(requests[0].body).not.toHaveProperty("trigger");
    expect((await t.run((ctx) => ctx.db.get(monitorId)))?.secret).toBe(
      "new-secret",
    );
    expect((await t.run((ctx) => ctx.db.get(monitorId)))?.sync).toBe("ready");
    await owner.mutation(api.discovery.write, {
      command: { kind: "monitor_action", monitorId, action: "remove" },
    });
    await t.action(internal.monitorActions.sync, { monitorId });
    expect((await t.run((ctx) => ctx.db.get(monitorId)))?.providerStatus).toBe(
      "removed",
    );
  });
  it("deduplicates manual checks and rejects stale queued checks after pausing", async () => {
    const { t, owner, monitorId } = await setup();
    enabled();
    const command = {
      kind: "monitor_action" as const,
      monitorId,
      action: "check" as const,
      requestKey: "check-fixture",
    };
    await owner.mutation(api.discovery.write, { command });
    await owner.mutation(api.discovery.write, { command });
    const checks = await t.run((ctx) =>
      ctx.db.query("monitorChecks").collect(),
    );
    expect(checks).toHaveLength(1);
    await owner.mutation(api.discovery.write, {
      command: { kind: "monitor_action", monitorId, action: "pause" },
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await t.action(internal.monitorActions.check, { checkId: checks[0]._id });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

it("closes investigated no-change cycles without moving approval, and keeps scripts on exact research versions", async () => {
  const { t, owner, other, topicId, projectId } = await setup();
  const evidenceId = await t.run(async (ctx) => {
    const id = ctx.db.normalizeId("topics", topicId);
    if (!id) throw new Error("ID");
    const searchId = await ctx.db.insert("workspaceSearches", {
      topicId: id,
      query: "primary",
      optionsJson: "{}",
    });
    const sourceId = await ctx.db.insert("workspaceSources", {
      topicId: id,
      searchId,
      url: "https://example.org/source",
      title: "Primary",
      excerpt: "Lead",
    });
    return ctx.db.insert("workspaceEvidence", {
      topicId: id,
      sourceId,
      url: "https://example.org/source",
      title: "Primary",
      content: "The model costs less to run.",
      retrievedAt: Date.now(),
    });
  });
  const first = await owner.mutation(api.relay.write, {
    command: {
      kind: "save_research",
      topicId,
      expectedRevision: 0,
      summary: "Initial sourced research",
      findings: [
        {
          id: "cost",
          text: "The model costs less to run.",
          assessment: "supported",
          note: "",
          evidenceIds: [evidenceId],
        },
      ],
    },
  });
  await owner.mutation(api.relay.write, {
    command: {
      kind: "review_research",
      versionId: first.id,
      decision: "approved",
      note: "",
    },
  });
  const script = await owner.mutation(api.relay.write, {
    command: {
      kind: "save_script",
      researchVersionId: first.id,
      title: "Video",
      scenes: [{ narration: "Here are the costs.", visual: "Cost chart" }],
    },
  });
  await owner.mutation(api.discovery.write, {
    command: {
      kind: "save_brief",
      topicId,
      title: "Topic",
      question: "What changed?",
      angle: "Costs",
      coverage: "Deployment",
      status: "active",
      frequency: {
        kind: "daily",
        time: "09:00",
        timezone: "UTC",
        paused: false,
      },
    },
  });
  vi.stubEnv("EXA_API_KEY", "fixture");
  vi.stubEnv("RESEARCH_ENABLED", "true");
  async function completeCycle() {
    const topic = await t.run(async (ctx) => {
      const id = ctx.db.normalizeId("topics", topicId);
      if (!id) throw new Error("ID");
      return ctx.db.get(id);
    });
    if (!topic?.nextResearchAt || !topic.scheduleGeneration)
      throw new Error("Schedule");
    vi.setSystemTime(topic.nextResearchAt);
    await t.mutation(internal.schedules.cycle, {
      topicId: topic._id,
      generation: topic.scheduleGeneration,
      due: topic.nextResearchAt,
    });
    const investigation = (await owner.query(api.discovery.read, { projectId }))
      .investigations[0];
    if (investigation.state.kind !== "provider")
      throw new Error("Provider state");
    const runId = investigation.state.runId;
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["The model costs less to run."])),
    );
    await t.mutation(internal.researchSteps.storePacket, {
      packet: {
        runId,
        findings: "Completed investigation",
        outputStorageId: storageId,
        groundingJson: "[]",
        gaps: [],
        createdAt: Date.now(),
        provenance: "exa_agent",
        verification: "not_independently_verified",
        approval: "not_reviewed",
        providerStatus: "completed",
      },
      sources: [{ url: "https://example.org/source" }],
    });
    await t.run(async (ctx) => {
      const e = await ctx.db
        .query("researchEvidence")
        .withIndex("by_run", (q) => q.eq("runId", runId))
        .first();
      if (!e) throw new Error("Evidence");
      await ctx.db.patch(e._id, {
        outcome: {
          kind: "retrieved",
          storageId,
          hash: "fixture",
          retrievedAt: Date.now(),
          characters: 28,
        },
      });
    });
    await t.mutation(internal.researchSteps.finish, { runId });
    expect(
      (await owner.query(api.discovery.read, { projectId })).investigations[0]
        .state.kind,
    ).toBe("waiting_for_agent");
    return investigation._id;
  }
  const investigationId = await completeCycle();
  const finish = {
    kind: "finish_investigation" as const,
    investigationId,
    expectedRevision: 1,
    outcome: "no_material_update" as const,
    explanation:
      "The completed investigation and retrieved cost evidence support the existing findings; no material change was found.",
  };
  await expect(
    other.mutation(api.discovery.write, { command: finish }),
  ).rejects.toThrow("not found");
  await owner.mutation(api.discovery.write, { command: finish });
  await owner.mutation(api.discovery.write, { command: finish });
  const nextInvestigationId = await completeCycle();
  await owner.mutation(api.relay.write, {
    command: {
      kind: "save_research",
      topicId,
      expectedRevision: 1,
      summary: "Updated coverage of deployment costs",
      findings: [
        {
          id: "cost",
          text: "The model costs less to run.",
          assessment: "supported",
          note: "Costs remain supported; coverage expanded",
          evidenceIds: [evidenceId],
        },
      ],
    },
  });
  await expect(
    owner.mutation(api.discovery.write, {
      command: {
        ...finish,
        investigationId: nextInvestigationId,
        outcome: "updated",
      },
    }),
  ).rejects.toThrow("revision conflict");
  await owner.mutation(api.discovery.write, {
    command: {
      ...finish,
      investigationId: nextInvestigationId,
      expectedRevision: 2,
      outcome: "updated",
    },
  });
  const result = await owner.query(api.relay.read, {
    command: { kind: "topic", topicId },
  });
  if (result.kind !== "topic") throw new Error("Topic");
  expect(result.research[0].review.kind).toBe("pending");
  expect(result.research.find((r) => r._id === first.id)?.review.kind).toBe(
    "approved",
  );
  expect(
    result.scripts.find((s) => s._id === script.id)?.researchVersionId,
  ).toBe(first.id);
  const history = await owner.query(api.relay.history, {
    topicId,
    kind: "research",
    paginationOpts: { numItems: 1, cursor: null },
  });
  expect(history.page).toHaveLength(1);
  expect(history.isDone).toBe(false);
  await expect(
    other.query(api.relay.history, {
      topicId,
      kind: "research",
      paginationOpts: { numItems: 1, cursor: null },
    }),
  ).rejects.toThrow("not found");
});
