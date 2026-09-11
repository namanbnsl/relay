import { ConvexError, v, type Infer } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requireIdentity } from "./model/auth";
import { projectFor, topicFor, writeWorkflow } from "./model/workflow";
import {
  discoveryCommand,
  discoveryInput,
  defaultDiscovery,
  candidate,
} from "./model/discoveryContracts";
import { nextStart, sameFrequency } from "./model/schedule";
import { latestDraft } from "./model/drafts";

export function monitoringSetup() {
  return process.env.MONITORING_ENABLED === "true" &&
    process.env.EXA_API_KEY &&
    process.env.CONVEX_SITE_URL
    ? { available: true, reason: "" }
    : {
        available: false,
        reason:
          "Exa monitoring unavailable. Operator configuration is required; sources can still be saved.",
      };
}
function publicMonitor({ secret, ...row }: Doc<"monitors">) {
  void secret;
  return row;
}
export async function monitorFor(
  ctx: Pick<QueryCtx, "db">,
  subject: string,
  value: string,
) {
  const id = ctx.db.normalizeId("monitors", value);
  const row = id ? await ctx.db.get(id) : null;
  if (!row) throw new ConvexError("Monitor not found.");
  await projectFor(ctx, subject, row.projectId);
  return row;
}
async function updateFor(
  ctx: Pick<QueryCtx, "db">,
  subject: string,
  value: string,
) {
  const id = ctx.db.normalizeId("discoveryUpdates", value);
  const row = id ? await ctx.db.get(id) : null;
  if (!row) throw new ConvexError("Update not found.");
  await projectFor(ctx, subject, row.projectId);
  return row;
}
export async function readOwned(
  ctx: QueryCtx,
  subject: string,
  projectId: string,
) {
  const project = await projectFor(ctx, subject, projectId);
  const [monitors, updates, investigations] = await Promise.all([
    ctx.db
      .query("monitors")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect(),
    ctx.db
      .query("discoveryUpdates")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .order("desc")
      .take(200),
    ctx.db
      .query("investigations")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .order("desc")
      .take(100),
  ]);
  const pending = await Promise.all(
    investigations.map(async (row) => {
      if (row.state.kind !== "provider") return row;
      const run = await ctx.db.get(row.state.runId);
      if (run && !run.occupied && run.packetId)
        return {
          ...row,
          state: { kind: "waiting_for_agent" as const, runId: run._id },
        };
      if (run && !run.occupied && !run.packetId)
        return {
          ...row,
          state: {
            kind: "unavailable" as const,
            reason:
              "Provider investigation failed. Inspect research activity and manually retry.",
          },
        };
      return row;
    }),
  );
  return {
    config: project.discovery ?? defaultDiscovery,
    setup: monitoringSetup(),
    monitors: monitors.map(publicMonitor),
    updates,
    investigations: pending,
  };
}
export const read = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) =>
    readOwned(ctx, (await requireIdentity(ctx)).subject, args.projectId),
});
export const readFromMcp = internalQuery({
  args: { subject: v.string(), projectId: v.string() },
  handler: (ctx, args) => readOwned(ctx, args.subject, args.projectId),
});
export const topicContext = query({
  args: { topicId: v.string() },
  handler: async (ctx, { topicId }) => {
    const topic = await topicFor(
      ctx,
      (await requireIdentity(ctx)).subject,
      topicId,
    );
    const links = await ctx.db
      .query("topicUpdates")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .collect();
    const updates = (
      await Promise.all(links.map((link) => ctx.db.get(link.updateId)))
    ).filter((x) => x !== null);
    const ids = [...new Set(updates.flatMap((x) => x.monitorIds))];
    const monitors = (await Promise.all(ids.map((id) => ctx.db.get(id))))
      .filter((x) => x !== null)
      .map(publicMonitor);
    return { updates, monitors };
  },
});
async function attach(
  ctx: MutationCtx,
  update: Doc<"discoveryUpdates">,
  topic: Doc<"topics">,
) {
  if (update.projectId !== topic.projectId)
    throw new ConvexError("Topic belongs to another workspace.");
  const old = await ctx.db
    .query("topicUpdates")
    .withIndex("by_pair", (q) =>
      q.eq("topicId", topic._id).eq("updateId", update._id),
    )
    .unique();
  if (!old)
    await ctx.db.insert("topicUpdates", {
      projectId: topic.projectId,
      topicId: topic._id,
      updateId: update._id,
    });
  return topic._id;
}
async function createFromUpdate(
  ctx: MutationCtx,
  update: Doc<"discoveryUpdates">,
  values: Pick<Doc<"topics">, "title" | "question" | "angle">,
) {
  if (update.createdTopicId) return update.createdTopicId;
  if (update.dismissed) throw new ConvexError("This update was dismissed.");
  // Exact normalized title reconciliation is intentionally conservative; source
  // overlap alone must not merge distinct video angles.
  const topics = await ctx.db
    .query("topics")
    .withIndex("by_project", (q) => q.eq("projectId", update.projectId))
    .collect();
  const existing = topics.find(
    (t) =>
      normalize(t.title) === normalize(values.title) ||
      normalize(t.question) === normalize(values.question),
  );
  const id =
    existing?._id ??
    (await ctx.db.insert("topics", {
      projectId: update.projectId,
      ...values,
      frequency: { kind: "once" },
    }));
  const topic = await ctx.db.get(id);
  if (!topic) throw new Error("Topic missing");
  await attach(ctx, update, topic);
  await ctx.db.patch(update._id, { createdTopicId: id });
  return id;
}
function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
async function queueSync(ctx: MutationCtx, id: Id<"monitors">) {
  await ctx.scheduler.runAfter(0, internal.monitorState.enqueue, {
    monitorId: id,
  });
}
async function saveSchedule(
  ctx: MutationCtx,
  topic: Doc<"topics">,
  frequency: NonNullable<Doc<"topics">["frequency"]>,
  status: NonNullable<Doc<"topics">["status"]>,
) {
  const f =
    frequency.kind === "daily" && status !== "active"
      ? { ...frequency, paused: true }
      : frequency;
  const changed =
    !sameFrequency(topic.frequency ?? { kind: "once" }, f) ||
    (topic.status ?? "active") !== status;
  // Editing a brief must not postpone or re-arm an existing schedule.
  if (!changed) return;
  let due: number | undefined;
  try {
    if (f.kind === "daily") {
      const next = nextStart(Date.now(), f.time, f.timezone);
      if (!f.paused && status === "active") due = next;
    } else if (f.kind === "scheduled" && status === "active") {
      new Intl.DateTimeFormat("en", { timeZone: f.timezone }).format(f.at);
      if (f.at <= Date.now()) throw new Error("past");
      due = f.at;
    }
  } catch {
    throw new ConvexError(
      "Choose a future date and time with a valid timezone.",
    );
  }
  const generation = (topic.scheduleGeneration ?? 0) + 1;
  await ctx.db.patch(topic._id, {
    frequency: f,
    scheduleGeneration: generation,
    nextResearchAt: due,
  });
  if (due !== undefined) {
    await ctx.scheduler.runAt(due, internal.schedules.cycle, {
      topicId: topic._id,
      generation,
      due,
    });
  }
}
export async function writeOwned(
  ctx: MutationCtx,
  subject: string,
  raw: Infer<typeof discoveryCommand>,
) {
  const parsed = discoveryInput.safeParse(raw);
  if (!parsed.success)
    throw new ConvexError("Invalid workspace settings or command.");
  const c = parsed.data;
  switch (c.kind) {
    case "save_schedule": {
      const t = await topicFor(ctx, subject, c.topicId);
      if ((t.status ?? "active") !== "active" && c.frequency.kind !== "once")
        throw new ConvexError(
          "Set this topic to Active before scheduling research.",
        );
      await saveSchedule(ctx, t, c.frequency, t.status ?? "active");
      return t._id;
    }
    case "configure_discovery": {
      const p = await projectFor(ctx, subject, c.projectId);
      if (c.config.schedule) {
        try {
          nextStart(
            Date.now(),
            c.config.schedule.time,
            c.config.schedule.timezone,
          );
        } catch {
          throw new ConvexError(
            "Choose a valid time and timezone for discovery.",
          );
        }
      }
      await ctx.db.patch(p._id, { discovery: c.config });
      const monitors = await ctx.db
        .query("monitors")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();
      for (const m of monitors.filter((m) => !m.removed)) {
        await ctx.db.patch(m._id, {
          generation: m.generation + 1,
          sync: "pending",
          nextCheck: undefined,
        });
        await queueSync(ctx, m._id);
      }
      return p._id;
    }
    case "save_brief": {
      const t = await topicFor(ctx, subject, c.topicId);
      await saveSchedule(ctx, t, c.frequency, c.status);
      await ctx.db.patch(t._id, {
        title: c.title,
        question: c.question,
        angle: c.angle,
        coverage: c.coverage,
        status: c.status,
      });
      return t._id;
    }
    case "save_monitor": {
      const p = await projectFor(ctx, subject, c.projectId);
      const domains = c.domains.map((domain) => {
        const d = domain.toLowerCase().trim();
        if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(d))
          throw new ConvexError(
            "Enter website domains, such as example.com, without a path.",
          );
        return d;
      });
      const old = c.monitorId
        ? await monitorFor(ctx, subject, c.monitorId)
        : await ctx.db
            .query("monitors")
            .withIndex("by_request", (q) =>
              q.eq("projectId", p._id).eq("requestKey", c.requestKey),
            )
            .unique();
      if (old && old.projectId !== p._id)
        throw new ConvexError("Monitor belongs to another workspace.");
      if (old && !c.monitorId) {
        if (
          old.name !== c.name ||
          old.query !== c.query ||
          JSON.stringify(old.domains) !== JSON.stringify(domains) ||
          old.paused !== c.paused
        )
          throw new ConvexError(
            "Request key already used with different source settings.",
          );
        return old._id;
      }
      const fields = {
        name: c.name,
        query: c.query,
        domains,
        paused: c.paused,
        generation: (old?.generation ?? 0) + 1,
        sync: "pending" as const,
      };
      const id =
        old?._id ??
        (await ctx.db.insert("monitors", {
          projectId: p._id,
          requestKey: c.requestKey,
          removed: false,
          ...fields,
        }));
      if (old) {
        if (old.removed) throw new ConvexError("Monitor has been removed.");
        await ctx.db.patch(id, fields);
      }
      await queueSync(ctx, id);
      const dependents = await ctx.db
        .query("monitors")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();
      for (const dependent of dependents)
        if (
          dependent._id !== id &&
          !dependent.removed &&
          dependent.domains.length === 0
        ) {
          await ctx.db.patch(dependent._id, {
            generation: dependent.generation + 1,
            sync: "pending",
          });
          await queueSync(ctx, dependent._id);
        }
      return id;
    }
    case "monitor_action": {
      const m = await monitorFor(ctx, subject, c.monitorId);
      if (c.action === "check") {
        if (m.removed || m.sync !== "ready" || !monitoringSetup().available)
          throw new ConvexError(
            "This source is still connecting. Please try again shortly.",
          );
        if (!c.requestKey)
          throw new ConvexError(
            "Manual checks require a retry-safe request key.",
          );
        const requestKey = c.requestKey;
        const receipt = await ctx.db
          .query("monitorChecks")
          .withIndex("by_request", (q) =>
            q.eq("monitorId", m._id).eq("requestKey", requestKey),
          )
          .unique();
        if (receipt) return m._id;
        const checkId = await ctx.db.insert("monitorChecks", {
          monitorId: m._id,
          requestKey: c.requestKey,
          generation: m.generation,
          claimed: false,
        });
        await ctx.scheduler.runAfter(0, internal.monitorActions.check, {
          checkId,
        });
      } else {
        await ctx.db.patch(m._id, {
          generation: m.generation + 1,
          sync: "pending",
          ...(c.action === "pause"
            ? { paused: true }
            : c.action === "resume"
              ? { paused: false }
              : c.action === "remove"
                ? { removed: true, paused: true }
                : {}),
        });
        await queueSync(ctx, m._id);
        if (m.domains.length && c.action !== "sync") {
          const dependents = await ctx.db
            .query("monitors")
            .withIndex("by_project", (q) => q.eq("projectId", m.projectId))
            .collect();
          for (const dependent of dependents)
            if (!dependent.removed && dependent.domains.length === 0) {
              await ctx.db.patch(dependent._id, {
                generation: dependent.generation + 1,
                sync: "pending",
              });
              await queueSync(ctx, dependent._id);
            }
        }
      }
      return m._id;
    }
    case "dismiss_update": {
      const u = await updateFor(ctx, subject, c.updateId);
      await ctx.db.patch(u._id, { dismissed: true });
      return u._id;
    }
    case "attach_update":
      return attach(
        ctx,
        await updateFor(ctx, subject, c.updateId),
        await topicFor(ctx, subject, c.topicId),
      );
    case "topic_from_update":
      return createFromUpdate(ctx, await updateFor(ctx, subject, c.updateId), {
        title: c.title,
        question: c.question,
        angle: c.angle,
      });
    case "follow_up": {
      const t = await topicFor(ctx, subject, c.topicId);
      const result = await writeWorkflow(
        ctx,
        { subject, channel: "mcp" },
        {
          kind: "create_topic",
          projectId: t.projectId,
          title: c.title,
          question: c.question,
          requestKey: c.requestKey,
        },
      );
      const child = await topicFor(ctx, subject, result.id);
      if (child.parentTopicId && child.parentTopicId !== t._id)
        throw new ConvexError("Follow-up request already used.");
      await ctx.db.patch(child._id, { parentTopicId: t._id });
      return child._id;
    }
    case "finish_investigation": {
      const id = ctx.db.normalizeId("investigations", c.investigationId);
      const row = id ? await ctx.db.get(id) : null;
      if (!row) throw new ConvexError("Investigation not found.");
      await topicFor(ctx, subject, row.topicId);
      if (row.state.kind === "closed") {
        if (
          row.state.outcome !== c.outcome ||
          row.state.revision !== c.expectedRevision ||
          row.state.explanation !== c.explanation
        )
          throw new ConvexError("Investigation already closed differently.");
        return row._id;
      }
      if (row.state.kind === "unavailable")
        throw new ConvexError(
          "A completed provider investigation is required.",
        );
      const run = await ctx.db.get(row.state.runId);
      if (
        !run ||
        run.occupied ||
        (run.state.kind !== "succeeded" &&
          !(c.outcome === "updated" && run.state.kind === "partial")) ||
        !run.packetId
      )
        throw new ConvexError(
          "A completed provider investigation is required; monitoring alone is insufficient.",
        );
      const draft = await latestDraft(ctx, row.topicId);
      if ((draft?.revision ?? 0) !== c.expectedRevision)
        throw new ConvexError(
          "Research revision conflict. Read and merge first.",
        );
      if (
        c.outcome === "no_material_update" &&
        (row.baseRevision === 0 || c.expectedRevision !== row.baseRevision)
      )
        throw new ConvexError(
          "No material update must refer to the unchanged existing research revision.",
        );
      const evidence = await ctx.db
        .query("researchEvidence")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect();
      if (
        c.outcome === "no_material_update" &&
        !evidence.some((e) => e.outcome.kind === "retrieved")
      )
        throw new ConvexError(
          "Inspect retrieved investigation evidence before closing this cycle.",
        );
      if (c.outcome === "updated" && c.expectedRevision <= row.baseRevision)
        throw new ConvexError("Save the updated canonical research first.");
      await ctx.db.patch(row._id, {
        state: {
          kind: "closed",
          outcome: c.outcome,
          explanation: c.explanation,
          revision: c.expectedRevision,
          at: Date.now(),
        },
      });
      return row._id;
    }
  }
}
export const write = mutation({
  args: { command: discoveryCommand },
  handler: async (ctx, { command }) =>
    writeOwned(ctx, (await requireIdentity(ctx)).subject, command),
});
export const writeFromMcp = internalMutation({
  args: { subject: v.string(), command: discoveryCommand },
  handler: (ctx, args) => writeOwned(ctx, args.subject, args.command),
});

export const ingest = internalMutation({
  args: {
    monitorId: v.id("monitors"),
    remoteId: v.string(),
    runId: v.string(),
    at: v.number(),
    status: v.string(),
    reason: v.optional(v.string()),
    candidates: v.array(candidate),
  },
  handler: async (ctx, a) => {
    const m = await ctx.db.get(a.monitorId);
    if (!m || m.remoteId !== a.remoteId)
      throw new Error("Monitor mapping mismatch");
    const p = await ctx.db.get(m.projectId);
    if (!p) throw new Error("Workspace missing");
    const receipt = await ctx.db
      .query("discoveryDeliveries")
      .withIndex("by_run", (q) => q.eq("monitorId", m._id).eq("runId", a.runId))
      .unique();
    if (receipt) return;
    await ctx.db.insert("discoveryDeliveries", {
      monitorId: m._id,
      runId: a.runId,
      at: a.at,
      status: a.status,
    });
    if ((m.lastCheck ?? 0) <= a.at)
      await ctx.db.patch(m._id, {
        lastCheck: a.at,
        lastOutcome: a.status,
        collectionError:
          a.status === "completed"
            ? undefined
            : (a.reason ?? `Collection ${a.status}`),
        ...(a.status !== "completed"
          ? { error: `Collection ${a.status}`, sync: "error" as const }
          : { error: undefined }),
      });
    if (m.removed || a.status !== "completed") return;
    for (const c of a.candidates) {
      if (!c.links.length) continue;
      const key = normalize(c.title);
      const exact = await ctx.db
        .query("discoveryUpdates")
        .withIndex("by_key", (q) => q.eq("projectId", p._id).eq("key", key))
        .unique();
      const previous = exact
        ? []
        : await ctx.db
            .query("discoveryUpdates")
            .withIndex("by_project", (q) => q.eq("projectId", p._id))
            .collect();
      const old =
        exact ??
        previous.find((u) => normalize(u.question) === normalize(c.question));
      if (old) {
        await ctx.db.patch(old._id, {
          monitorIds: [...new Set([...old.monitorIds, m._id])],
          links: [...new Set([...old.links, ...c.links])],
          updatedAt: Math.max(old.updatedAt, a.at),
        });
        continue;
      }
      const id = await ctx.db.insert("discoveryUpdates", {
        projectId: p._id,
        key,
        ...c,
        monitorIds: [m._id],
        discoveredAt: a.at,
        updatedAt: a.at,
        dismissed: false,
      });
      const update = await ctx.db.get(id);
      if (update && p.discovery?.candidates === "automatic")
        await createFromUpdate(ctx, update, {
          title: c.title,
          question: c.question,
          angle: c.angle,
        });
    }
  },
});
