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
    const topic = await topicFor(ctx, args.subject, args.topicId);
    if (args.sourceIds.length > 5)
      throw new ConvexError("Read at most 5 sources at once.");
    const sources: Doc<"workspaceSources">[] = [];
    const cached: Doc<"workspaceEvidence">[] = [];
    for (const value of new Set(args.sourceIds)) {
      const id = ctx.db.normalizeId("workspaceSources", value);
      const source = id ? await ctx.db.get(id) : null;
      if (!source || source.topicId !== topic._id)
        throw new ConvexError("Source not found in this topic.");
      sources.push(source);
      const evidence = await ctx.db
        .query("workspaceEvidence")
        .withIndex("by_source", (q) => q.eq("sourceId", source._id))
        .first();
      if (evidence) cached.push(evidence);
    }
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
    const sources: Doc<"workspaceSources">[] = [];
    for (const result of results) {
      const id = await ctx.db.insert("workspaceSources", {
        topicId: search.topicId,
        searchId,
        ...result,
      });
      const row = await ctx.db.get(id);
      if (row) sources.push(row);
    }
    return sources;
  },
});
export const saveEvidence = internalMutation({
  args: {
    subject: v.string(),
    sourceId: v.id("workspaceSources"),
    url: v.string(),
    title: v.string(),
    content: v.string(),
    reportedDollars: v.optional(v.number()),
  },
  returns: workspaceEvidenceDoc,
  handler: async (ctx, { subject, ...args }) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) throw new ConvexError("Source not found.");
    await topicFor(ctx, subject, source.topicId);
    // Immutable snapshots: concurrent retrievals can each retain their reported cost.
    const id = await ctx.db.insert("workspaceEvidence", {
      ...args,
      topicId: source.topicId,
      retrievedAt: Date.now(),
    });
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Evidence insert failed");
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
      ...remote
        .filter((e) => e.outcome.kind === "retrieved")
        .map((e) => ({
          id: e._id,
          title: e.title ?? e.canonicalUrl,
          url: e.canonicalUrl,
        })),
    ];
  },
});

// Record reported charges even when the response contains no usable page content.
export const recordRetrieval = internalMutation({
  args: {
    subject: v.string(),
    sourceId: v.id("workspaceSources"),
    reportedDollars: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) throw new ConvexError("Source not found.");
    await topicFor(ctx, args.subject, source.topicId);
    await ctx.db.patch(source._id, {
      retrievalAttempts: (source.retrievalAttempts ?? 0) + 1,
      ...(args.reportedDollars === undefined
        ? {}
        : {
            retrievalDollars:
              (source.retrievalDollars ?? 0) + args.reportedDollars,
          }),
    });
    return null;
  },
});
