import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { writeOwned } from "./research";
import { settings } from "./model/researchContracts";
import { latestDraft } from "./model/drafts";
import { nextStart } from "./model/schedule";
export const tick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const due = await ctx.db
      .query("topics")
      .withIndex("by_due", (q) =>
        q.gt("nextResearchAt", 0).lte("nextResearchAt", Date.now()),
      )
      .take(100);
    for (const t of due)
      if (t.nextResearchAt !== undefined)
        await ctx.scheduler.runAfter(0, internal.schedules.cycle, {
          topicId: t._id,
          generation: t.scheduleGeneration ?? 0,
          due: t.nextResearchAt,
        });
  },
});
export const cycle = internalMutation({
  args: { topicId: v.id("topics"), generation: v.number(), due: v.number() },
  handler: async (ctx, a) => {
    const t = await ctx.db.get(a.topicId);
    if (
      !t ||
      !t.frequency ||
      t.frequency.kind === "once" ||
      (t.frequency.kind === "daily" && t.frequency.paused) ||
      (t.status ?? "active") !== "active" ||
      t.scheduleGeneration !== a.generation ||
      t.nextResearchAt !== a.due ||
      a.due > Date.now()
    )
      return;
    const project = await ctx.db.get(t.projectId);
    if (!project) return;
    // Advance from now, never replay every missed daily slot.
    const next =
      t.frequency.kind === "daily"
        ? nextStart(Date.now(), t.frequency.time, t.frequency.timezone)
        : undefined;
    await ctx.db.patch(t._id, { nextResearchAt: next });
    if (next !== undefined) {
      await ctx.scheduler.runAt(next, internal.schedules.cycle, {
        topicId: t._id,
        generation: a.generation,
        due: next,
      });
    }
    const receipt = await ctx.db
      .query("investigations")
      .withIndex("by_cycle", (q) =>
        q.eq("topicId", t._id).eq("generation", a.generation).eq("due", a.due),
      )
      .unique();
    if (receipt) return;
    const pending = await ctx.db
      .query("investigations")
      .withIndex("by_topic", (q) => q.eq("topicId", t._id))
      .order("desc")
      .first();
    if (
      pending &&
      (pending.state.kind === "provider" ||
        pending.state.kind === "waiting_for_agent")
    ) {
      const priorRun = await ctx.db.get(pending.state.runId);
      if (priorRun && (priorRun.occupied || priorRun.packetId)) return;
      await ctx.db.patch(pending._id, {
        state: {
          kind: "unavailable",
          reason:
            "Previous provider investigation failed without usable output.",
        },
      });
    }
    const occupied = await ctx.db
      .query("researchRuns")
      .withIndex("by_topic_occupied", (q) =>
        q.eq("topicId", t._id).eq("occupied", true),
      )
      .first();
    if (occupied) return;
    const draft = await latestDraft(ctx, t._id);
    const config = settings();
    const base = {
      projectId: t.projectId,
      topicId: t._id,
      generation: a.generation,
      due: a.due,
      baseRevision: draft?.revision ?? 0,
    };
    if (config.kind !== "ready") {
      await ctx.db.insert("investigations", {
        ...base,
        state: { kind: "unavailable", reason: config.reason },
      });
      return;
    }
    const run = await writeOwned(ctx, project.owner, {
      kind: "start_research",
      topicId: t._id,
      requestKey: `daily:${t._id}:${a.generation}:${a.due}`,
      plan: {
        scope: draft
          ? `Investigate developments and unresolved questions since the current research. Current summary: ${draft.summary.slice(0, 4000)}. Preserve conflicting evidence. A completed investigation may support no material update; absence of monitoring results does not.`
          : "Establish initial research for this potential video.",
        subquestions: draft?.openQuestions.slice(0, 8) ?? [],
      },
    });
    await ctx.db.insert("investigations", {
      ...base,
      state: { kind: "provider", runId: run._id },
    });
  },
});
