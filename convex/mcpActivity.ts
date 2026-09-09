import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireIdentity } from "./model/auth";
import {
  connectionMarker,
  connectionTestResult,
} from "./model/researchContracts";

// Observed successful operations are connection evidence, not proof of future connectivity.
export const get = query({
  args: {},
  returns: v.object({
    lastSuccessfulReadAt: v.union(v.number(), v.null()),
    lastSuccessfulWriteAt: v.union(v.number(), v.null()),
    testMarker: connectionMarker,
  }),
  handler: async (ctx) => {
    const { subject } = await requireIdentity(ctx);
    const row = await ctx.db
      .query("mcpConnections")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    return {
      lastSuccessfulReadAt: row?.lastSuccessfulReadAt ?? null,
      lastSuccessfulWriteAt: row?.lastSuccessfulWriteAt ?? null,
      testMarker:
        row?.testCreatedAt === undefined
          ? null
          : { id: row._id, createdAt: row.testCreatedAt },
    };
  },
});
export const recordSuccess = internalMutation({
  returns: v.null(),
  args: {
    subject: v.string(),
    operation: v.union(v.literal("read"), v.literal("write")),
  },
  handler: async (ctx, { subject, operation }) => {
    const row = await ctx.db
      .query("mcpConnections")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    const update =
      operation === "read"
        ? { lastSuccessfulReadAt: Date.now() }
        : { lastSuccessfulWriteAt: Date.now() };
    if (row) await ctx.db.patch(row._id, update);
    else await ctx.db.insert("mcpConnections", { subject, ...update });
  },
});
export const testFromMcp = internalMutation({
  returns: connectionTestResult,
  args: {
    subject: v.string(),
    operation: v.union(v.literal("create"), v.literal("remove")),
  },
  handler: async (ctx, { subject, operation }) => {
    const row = await ctx.db
      .query("mcpConnections")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    const createdAt =
      operation === "create" ? (row?.testCreatedAt ?? Date.now()) : undefined;
    const fields = {
      lastSuccessfulWriteAt: Date.now(),
      testCreatedAt: createdAt,
    };
    const id = row
      ? row._id
      : await ctx.db.insert("mcpConnections", { subject, ...fields });
    if (row) await ctx.db.patch(id, fields);
    return {
      testMarker: createdAt === undefined ? null : { id, createdAt },
      removed: operation === "remove",
      path: "/projects",
    };
  },
});
export const clearConnectionTest = mutation({
  args: {},
  returns: v.object({ testMarker: v.null() }),
  handler: async (ctx) => {
    const { subject } = await requireIdentity(ctx);
    const row = await ctx.db
      .query("mcpConnections")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    if (row) await ctx.db.patch(row._id, { testCreatedAt: undefined });
    return { testMarker: null };
  },
});
