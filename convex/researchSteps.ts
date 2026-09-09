import { v } from "convex/values";
import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { runFor } from "./research";
import {
  isActive,
  evidenceFields,
  packetFields,
  settings,
  evidenceDocument,
} from "./model/researchContracts";
const args = { runId: v.id("researchRuns") };
export const claim = internalMutation({
  args,
  returns: v.boolean(),
  handler: async (ctx, { runId }) => {
    const row = await ctx.db.get(runId);
    if (!row) throw new Error("Run not found");
    const run = await runFor(ctx, row.owner, runId);
    if (
      !isActive(run.state) ||
      settings().kind !== "ready" ||
      Date.now() > run.deadline
    )
      return false;
    if (run.submission.kind !== "not_submitted") return false;
    await ctx.db.patch(runId, {
      submission: { kind: "uncertain", at: Date.now() },
      state: { kind: "running" },
      stage: "submitting",
      startedAt: run.startedAt ?? Date.now(),
      attempts: run.attempts + 1,
      updatedAt: Date.now(),
    });
    return true;
  },
});
export const accepted = internalMutation({
  returns: v.null(),
  args: { ...args, remoteId: v.string() },
  handler: async (ctx, { runId, remoteId }) => {
    const r = await ctx.db.get(runId);
    if (!r) throw new Error("Run not found");
    await runFor(ctx, r.owner, runId);
    if (r.submission.kind === "accepted" && r.submission.remoteId !== remoteId)
      throw new Error("Remote ID conflict");
    await ctx.db.patch(runId, {
      submission: { kind: "accepted", remoteId },
      stage: isActive(r.state) ? "provider_running" : r.stage,
      ...(!isActive(r.state) && !r.remoteTerminal ? { occupied: true } : {}),
      updatedAt: Date.now(),
    });
    if (!isActive(r.state) && !r.remoteTerminal)
      await ctx.scheduler.runAfter(0, internal.researchActions.cancelRemote, {
        runId,
      });
  },
});
export const progress = internalMutation({
  returns: v.null(),
  args: {
    ...args,
    stage: v.string(),
    actualDollars: v.optional(v.number()),
    usageJson: v.optional(v.string()),
    remoteTerminal: v.optional(v.boolean()),
  },
  handler: async (ctx, { runId, stage, ...data }) => {
    const r = await ctx.db.get(runId);
    if (!r) throw new Error("Run not found");
    await runFor(ctx, r.owner, runId);
    const { remoteTerminal, ...metadata } = data;
    await ctx.db.patch(runId, {
      ...metadata,
      ...(isActive(r.state) ? { stage } : {}),
      pollCount: r.pollCount + 1,
      updatedAt: Date.now(),
      ...(remoteTerminal ? { remoteTerminal: true } : {}),
    });
  },
});
export const fail = internalMutation({
  returns: v.null(),
  args: { ...args, reason: v.string() },
  handler: async (ctx, { runId, reason }) => {
    const r = await ctx.db.get(runId);
    if (!r || !isActive(r.state)) return;
    await runFor(ctx, r.owner, runId);
    await ctx.db.patch(runId, {
      state: r.packetId
        ? { kind: "partial", packetId: r.packetId, at: Date.now(), reason }
        : { kind: "failed", at: Date.now(), reason },
      stage: "needs_attention",
      updatedAt: Date.now(),
      ...(r.submission.kind === "not_submitted" || r.remoteTerminal
        ? { occupied: false }
        : {}),
    });
    if (r.packetId) {
      const packet = await ctx.db.get(r.packetId);
      if (packet)
        await ctx.db.patch(packet._id, {
          gaps: [...new Set([...packet.gaps, reason])],
        });
    }
  },
});
export const storePacket = internalMutation({
  returns: v.null(),
  args: {
    packet: v.object(packetFields),
    sources: v.array(
      v.object({ url: v.string(), title: v.optional(v.string()) }),
    ),
  },
  handler: async (ctx, { packet, sources }) => {
    const r = await ctx.db.get(packet.runId);
    if (!r) throw new Error("Run not found");
    await runFor(ctx, r.owner, r._id);
    if (r.packetId || !isActive(r.state)) {
      await ctx.storage.delete(packet.outputStorageId);
      return;
    }
    const packetId = await ctx.db.insert("researchPackets", packet);
    for (const source of sources.slice(0, 20))
      await ctx.db.insert("researchEvidence", {
        runId: r._id,
        originalUrl: source.url,
        canonicalUrl: new URL(source.url).href,
        ...(source.title ? { title: source.title } : {}),
        outcome: { kind: "pending" },
        attempts: 0,
      });
    await ctx.db.patch(r._id, {
      packetId,
      stage: "retrieving_evidence",
      updatedAt: Date.now(),
    });
  },
});
export const nextEvidence = internalQuery({
  args,
  returns: v.union(evidenceDocument, v.null()),
  handler: async (ctx, { runId }) => {
    const r = await ctx.db.get(runId);
    if (!r) throw new Error("Run not found");
    await runFor(ctx, r.owner, runId);
    const rows = await ctx.db
      .query("researchEvidence")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .take(20);
    return rows.find((r) => r.outcome.kind === "pending") ?? null;
  },
});
export const claimEvidence = internalMutation({
  returns: v.boolean(),
  args: { evidenceId: v.id("researchEvidence") },
  handler: async (ctx, { evidenceId }) => {
    const e = await ctx.db.get(evidenceId);
    if (!e) throw new Error("Evidence not found");
    const r = await ctx.db.get(e.runId);
    if (!r) throw new Error("Run not found");
    await runFor(ctx, r.owner, r._id);
    if (
      !isActive(r.state) ||
      settings().kind !== "ready" ||
      Date.now() > r.deadline ||
      e.attempts >= 2 ||
      e.outcome.kind !== "pending"
    )
      return false;
    await ctx.db.patch(evidenceId, { attempts: e.attempts + 1 });
    return true;
  },
});
export const storeEvidence = internalMutation({
  returns: v.null(),
  args: {
    evidenceId: v.id("researchEvidence"),
    fields: v.object(evidenceFields),
    cost: v.optional(v.number()),
  },
  handler: async (ctx, { evidenceId, fields, cost }) => {
    const e = await ctx.db.get(evidenceId);
    if (!e || e.runId !== fields.runId) throw new Error("Evidence not found");
    const r = await ctx.db.get(e.runId);
    if (!r) throw new Error("Run not found");
    await runFor(ctx, r.owner, r._id);
    if (e.outcome.kind === "retrieved") {
      if (fields.outcome.kind === "retrieved")
        await ctx.storage.delete(fields.outcome.storageId);
      return;
    }
    await ctx.db.patch(evidenceId, {
      ...fields,
      attempts: e.attempts,
      ...(cost !== undefined ? { reportedDollars: cost } : {}),
    });
    // Each retrieved document records its reported component cost; unknown spend stays unknown.
  },
});
export const finish = internalMutation({
  args,
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const r = await ctx.db.get(runId);
    if (!r || !isActive(r.state) || !r.packetId) return;
    await runFor(ctx, r.owner, runId);
    const p = await ctx.db.get(r.packetId);
    if (!p) throw new Error("Packet not found");
    const evidence = await ctx.db
      .query("researchEvidence")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .take(20);
    const gaps = [
      ...p.gaps,
      ...evidence
        .filter((e) => e.outcome.kind !== "retrieved")
        .map((e) => `Source retrieval incomplete: ${e.originalUrl}`),
    ];
    await ctx.db.patch(p._id, { gaps: [...new Set(gaps)] });
    await ctx.db.patch(runId, {
      state: gaps.length
        ? {
            kind: "partial",
            packetId: p._id,
            at: Date.now(),
            reason: "See packet coverage gaps.",
          }
        : { kind: "succeeded", packetId: p._id, at: Date.now() },
      stage: "complete",
      occupied: false,
      updatedAt: Date.now(),
    });
  },
});
export const cancellation = internalMutation({
  returns: v.null(),
  args: {
    ...args,
    outcome: v.string(),
    terminal: v.boolean(),
    actualDollars: v.optional(v.number()),
  },
  handler: async (ctx, { runId, outcome, terminal, actualDollars }) => {
    const r = await ctx.db.get(runId);
    if (!r) return;
    await runFor(ctx, r.owner, runId);
    await ctx.db.patch(runId, {
      cancellation: outcome,
      // A delayed cancellation can finish after recovery has restarted processing.
      // Keep the topic occupied until the current execution finishes.
      ...(terminal && !isActive(r.state) ? { occupied: false } : {}),
      ...(terminal && r.submission.kind === "accepted"
        ? { remoteTerminal: true }
        : {}),
      ...(actualDollars !== undefined ? { actualDollars } : {}),
      updatedAt: Date.now(),
    });
  },
});
export const onComplete = internalMutation({
  returns: v.null(),
  args: {
    workflowId: vWorkflowId,
    context: v.object(args),
    result: vResultValidator,
  },
  handler: async (ctx, { workflowId, context, result }) => {
    const r = await ctx.db.get(context.runId);
    if (!r || r.workflowId !== workflowId || result.kind === "success") return;
    await ctx.runMutation(internal.researchSteps.fail, {
      runId: r._id,
      reason:
        "Workflow interrupted. Recover the existing run; no automatic resubmission.",
    });
  },
});
export const watchdog = internalMutation({
  args,
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const r = await ctx.db.get(runId);
    if (!r || Date.now() < r.deadline || (!isActive(r.state) && !r.occupied))
      return;
    await ctx.runMutation(internal.researchSteps.fail, {
      runId,
      reason:
        "Overall deadline exceeded. Recover to inspect available provider results.",
    });
    await ctx.scheduler.runAfter(0, internal.researchActions.cancelRemote, {
      runId,
    });
  },
});

export const submissionRejected = internalMutation({
  args,
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const r = await ctx.db.get(runId);
    if (!r) throw new Error("Run not found");
    await runFor(ctx, r.owner, runId);
    if (r.submission.kind === "uncertain")
      await ctx.db.patch(runId, {
        submission: { kind: "not_submitted" },
        occupied: false,
      });
  },
});
