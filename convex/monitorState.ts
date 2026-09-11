import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { workflow } from "./researchWorkflow";
import { monitoringSetup } from "./discovery";
export const get = internalQuery({
  args: { monitorId: v.id("monitors") },
  handler: async (ctx, { monitorId }) => {
    const monitor = await ctx.db.get(monitorId);
    if (!monitor) throw new Error("Monitor missing");
    const project = await ctx.db.get(monitor.projectId);
    if (!project) throw new Error("Workspace missing");
    const websites = await ctx.db
      .query("monitors")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    return {
      monitor,
      project,
      domains: [
        ...new Set(
          websites
            .filter((m) => !m.removed && !m.paused)
            .flatMap((m) => m.domains),
        ),
      ],
    };
  },
});
export const byRemote = internalQuery({
  args: { remoteId: v.string() },
  handler: (ctx, a) =>
    ctx.db
      .query("monitors")
      .withIndex("by_remote", (q) => q.eq("remoteId", a.remoteId))
      .unique(),
});
export const claim = internalMutation({
  args: { monitorId: v.id("monitors") },
  handler: async (ctx, { monitorId }) => {
    const m = await ctx.db.get(monitorId);
    if (!m) return null;
    if ((m.leaseUntil ?? 0) > Date.now()) {
      await ctx.scheduler.runAfter(610000, internal.monitorState.enqueue, {
        monitorId,
      });
      return null;
    }
    if (!monitoringSetup().available) {
      await ctx.db.patch(m._id, {
        sync: "unavailable",
        error: monitoringSetup().reason,
      });
      return null;
    }
    await ctx.db.patch(m._id, {
      sync: "syncing",
      leaseUntil: Date.now() + 600000,
      nextReconcileAt: Date.now() + 610000,
    });
    return m.generation;
  },
});
export const markCreation = internalMutation({
  args: { monitorId: v.id("monitors") },
  handler: async (ctx, a) => {
    const m = await ctx.db.get(a.monitorId);
    if (!m || m.creationAttempted || m.remoteId) return false;
    await ctx.db.patch(m._id, { creationAttempted: true });
    return true;
  },
});
export const accepted = internalMutation({
  args: {
    monitorId: v.id("monitors"),
    remoteId: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, a) => {
    const m = await ctx.db.get(a.monitorId);
    if (!m || (m.remoteId && m.remoteId !== a.remoteId))
      throw new Error("Monitor mapping conflict");
    await ctx.db.patch(a.monitorId, { remoteId: a.remoteId, secret: a.secret });
  },
});
export const finish = internalMutation({
  args: {
    monitorId: v.id("monitors"),
    generation: v.number(),
    error: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
    nextCheck: v.optional(v.number()),
  },
  handler: async (ctx, { monitorId, generation, ...state }) => {
    const m = await ctx.db.get(monitorId);
    if (!m) return;
    await ctx.db.patch(monitorId, {
      ...state,
      error: state.error,
      nextCheck: state.nextCheck,
      leaseUntil: undefined,
      nextReconcileAt:
        m.removed && !state.error ? undefined : Date.now() + 3600000,
      sync: state.error
        ? "error"
        : m.generation === generation
          ? "ready"
          : "pending",
    });
    if (m.generation !== generation)
      await ctx.scheduler.runAfter(0, internal.monitorState.enqueue, {
        monitorId,
      });
  },
});

export const claimCheck = internalMutation({
  args: { checkId: v.id("monitorChecks") },
  handler: async (ctx, { checkId }) => {
    const receipt = await ctx.db.get(checkId);
    if (!receipt || receipt.claimed) return null;
    const m = await ctx.db.get(receipt.monitorId);
    await ctx.db.patch(checkId, { claimed: true });
    if (
      !m ||
      m.removed ||
      m.generation !== receipt.generation ||
      !m.remoteId ||
      !monitoringSetup().available
    )
      return null;
    return m;
  },
});
export const reconcileDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("monitors")
      .withIndex("by_reconcile", (q) =>
        q.gt("nextReconcileAt", 0).lte("nextReconcileAt", Date.now()),
      )
      .take(100);
    for (const m of rows) {
      await ctx.db.patch(m._id, { nextReconcileAt: Date.now() + 3600000 });
      await ctx.scheduler.runAfter(0, internal.monitorState.enqueue, {
        monitorId: m._id,
      });
    }
  },
});

export const hasDelivery = internalQuery({
  args: { monitorId: v.id("monitors"), runId: v.string() },
  handler: async (ctx, a) =>
    Boolean(
      await ctx.db
        .query("discoveryDeliveries")
        .withIndex("by_run", (q) =>
          q.eq("monitorId", a.monitorId).eq("runId", a.runId),
        )
        .unique(),
    ),
});
export const deliveryError = internalMutation({
  args: { monitorId: v.id("monitors"), error: v.string() },
  handler: async (ctx, a) => {
    const m = await ctx.db.get(a.monitorId);
    if (!m) return;
    await ctx.db.patch(m._id, {
      error: a.error,
      sync: "error",
      nextReconcileAt: Date.now() + 300000,
    });
  },
});

export const enqueue = internalMutation({
  args: { monitorId: v.id("monitors") },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.monitorId);
    if (!m) return;
    if (!monitoringSetup().available) {
      await ctx.db.patch(m._id, {
        sync: "unavailable",
        error: monitoringSetup().reason,
      });
      return;
    }
    await workflow.start(ctx, internal.researchWorkflow.monitor, args, {
      startAsync: true,
    });
  },
});
