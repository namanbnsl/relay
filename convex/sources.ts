import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { requireIdentity } from "./model/auth";
import { topicFor } from "./model/workflow";
import { resolveEvidence } from "./model/drafts";
import {
  evidenceId,
  sourceDoc,
  workspaceEvidenceDoc,
} from "./model/draftContracts";
import type { Doc } from "./_generated/dataModel";

export const owned = internalQuery({
  args: {
    subject: v.string(),
    topicId: v.string(),
    sourceIds: v.array(v.string()),
  },
  returns: v.object({
    topicId: v.id("topics"),
    sources: v.array(sourceDoc),
    cached: v.array(workspaceEvidenceDoc),
  }),
  handler: async (ctx, args) => {
    if (args.sourceIds.length > 5)
      throw new ConvexError("Read at most 5 sources at once.");
    const topic = await topicFor(ctx, args.subject, args.topicId);
    const resolved = await Promise.all(
      [...new Set(args.sourceIds)].map(async (value) => {
      const id = ctx.db.normalizeId("workspaceSources", value);
      const source = id ? await ctx.db.get(id) : null;
      if (!source || source.topicId !== topic._id)
        throw new ConvexError("Source not found in this topic.");
      const evidence = await ctx.db
        .query("workspaceEvidence")
        .withIndex("by_source", (q) => q.eq("sourceId", source._id))
        .first();
      return { source, evidence };
      }),
    );
    const sources: Doc<"workspaceSources">[] = resolved.map(
      ({ source }) => source,
    );
    const cached: Doc<"workspaceEvidence">[] = resolved.flatMap(
      ({ evidence }) => (evidence ? [evidence] : []),
    );
    return { topicId: topic._id, sources, cached };
  },
});
export const saveSearch = internalMutation({
  args: {
    subject: v.string(),
    topicId: v.id("topics"),
    query: v.string(),
    optionsJson: v.string(),
    reportedDollars: v.optional(v.number()),
    results: v.array(
      v.object({ url: v.string(), title: v.string(), excerpt: v.string() }),
    ),
  },
  returns: v.array(sourceDoc),
  handler: async (ctx, { subject, results, ...search }) => {
    await topicFor(ctx, subject, search.topicId);
    const searchId = await ctx.db.insert("workspaceSearches", search);
    const sources = await Promise.all(
      results.map(async (result) => {
        const id = await ctx.db.insert("workspaceSources", {
        topicId: search.topicId,
        searchId,
        ...result,
      });
      const row = await ctx.db.get(id);
        if (!row) throw new Error("Source insert failed");
        return row;
      }),
    );
    return sources;
  },
});
export const claimRetrieval = internalMutation({
  args: {
    subject: v.string(),
    sourceId: v.id("workspaceSources"),
  },
  returns: v.union(
    v.object({ kind: v.literal("claimed") }),
    v.object({ kind: v.literal("cached"), evidence: workspaceEvidenceDoc }),
    v.object({ kind: v.literal("blocked"), reason: v.string() }),
  ),
  handler: async (ctx, { subject, sourceId }) => {
    const source = await ctx.db.get(sourceId);
    if (!source) throw new ConvexError("Source not found.");
    await topicFor(ctx, subject, source.topicId);
    const evidence = await ctx.db
      .query("workspaceEvidence")
      .withIndex("by_source", (q) => q.eq("sourceId", sourceId))
      .first();
    if (evidence) return { kind: "cached" as const, evidence };
    const receipt = await ctx.db
      .query("workspaceSourceRetrievals")
      .withIndex("by_source", (q) => q.eq("sourceId", sourceId))
      .unique();
    if (receipt)
      return {
        kind: "blocked" as const,
        reason:
          receipt.state.kind === "failed"
            ? receipt.state.reason
            : "retrieval_in_progress",
      };
    await ctx.db.insert("workspaceSourceRetrievals", {
      sourceId,
      state: { kind: "pending", startedAt: Date.now() },
    });
    return { kind: "claimed" as const };
  },
});

export const finishRetrieval = internalMutation({
  args: {
    subject: v.string(),
    sourceId: v.id("workspaceSources"),
    outcome: v.union(
      v.object({
        kind: v.literal("retrieved"),
        url: v.string(),
        title: v.string(),
        content: v.string(),
      }),
      v.object({ kind: v.literal("failed"), reason: v.string() }),
    ),
    reportedDollars: v.optional(v.number()),
  },
  returns: v.union(workspaceEvidenceDoc, v.null()),
  handler: async (ctx, { subject, sourceId, outcome, reportedDollars }) => {
    const source = await ctx.db.get(sourceId);
    if (!source) throw new ConvexError("Source not found.");
    await topicFor(ctx, subject, source.topicId);
    const receipt = await ctx.db
      .query("workspaceSourceRetrievals")
      .withIndex("by_source", (q) => q.eq("sourceId", sourceId))
      .unique();
    if (!receipt || receipt.state.kind !== "pending")
      throw new Error("Source retrieval was not claimed");
    await ctx.db.patch(sourceId, {
      retrievalAttempts: (source.retrievalAttempts ?? 0) + 1,
      ...(reportedDollars === undefined
        ? {}
        : {
            retrievalDollars:
              (source.retrievalDollars ?? 0) + reportedDollars,
          }),
    });
    if (outcome.kind === "failed") {
      await ctx.db.patch(receipt._id, {
        state: {
          kind: "failed",
          completedAt: Date.now(),
          reason: outcome.reason,
        },
      });
      return null;
    }
    const id = await ctx.db.insert("workspaceEvidence", {
      sourceId,
      topicId: source.topicId,
      url: outcome.url,
      title: outcome.title,
      content: outcome.content,
      retrievedAt: Date.now(),
      ...(reportedDollars === undefined ? {} : { reportedDollars }),
    });
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Evidence insert failed");
    await ctx.db.patch(receipt._id, {
      state: { kind: "retrieved", evidenceId: row._id },
    });
    return row;
  },
});
export const evidence = query({
  args: { topicId: v.string(), evidenceId: v.string() },
  returns: v.object({
    id: v.string(),
    url: v.string(),
    title: v.string(),
    excerpt: v.string(),
    retrievedAt: v.number(),
    contentUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const subject = (await requireIdentity(ctx)).subject;
    const topic = await topicFor(ctx, subject, args.topicId);
    const result = await resolveEvidence(
      ctx,
      subject,
      topic._id,
      args.evidenceId,
    );
    const id = ctx.db.normalizeId("researchEvidence", args.evidenceId);
    const row = id ? await ctx.db.get(id) : null;
    return {
      ...result,
      contentUrl:
        row?.outcome.kind === "retrieved"
          ? await ctx.storage.getUrl(row.outcome.storageId)
          : null,
    };
  },
});

export const available = query({
  args: { topicId: v.string() },
  returns: v.array(
    v.object({ id: evidenceId, title: v.string(), url: v.string() }),
  ),
  handler: async (ctx, { topicId }) => {
    const subject = (await requireIdentity(ctx)).subject;
    const topic = await topicFor(ctx, subject, topicId);
    const [local, runs] = await Promise.all([
      ctx.db
        .query("workspaceEvidence")
        .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
        .order("desc")
        .take(100),
      ctx.db
        .query("researchRuns")
        .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
        .order("desc")
        .take(20),
    ]);
    const remote = (
      await Promise.all(
        runs.map((run) =>
          ctx.db
            .query("researchEvidence")
            .withIndex("by_run", (q) => q.eq("runId", run._id))
            .take(20),
        ),
      )
    ).flat();
    return [
      ...local.map((e) => ({ id: e._id, title: e.title, url: e.url })),
      ...remote.flatMap((item) =>
        item.outcome.kind === "retrieved"
          ? [
              {
                id: item._id,
                title: item.title ?? item.canonicalUrl,
                url: item.canonicalUrl,
              },
            ]
          : [],
      ),
    ];
  },
});
