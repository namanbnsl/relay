import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { requireIdentity } from "./model/auth";
import { readWorkflow, writeWorkflow, topicFor } from "./model/workflow";
import {
  readCommand,
  readResult,
  writeCommand,
  writeResult,
} from "./model/validators";

export const read = query({
  args: { command: readCommand },
  returns: readResult,
  handler: async (ctx, { command }) =>
    readWorkflow(
      ctx,
      { subject: (await requireIdentity(ctx)).subject, channel: "web" },
      command,
    ),
});
export const write = mutation({
  args: { command: writeCommand },
  returns: writeResult,
  handler: async (ctx, { command }) =>
    writeWorkflow(
      ctx,
      { subject: (await requireIdentity(ctx)).subject, channel: "web" },
      command,
    ),
});
// Only the OAuth-verifying action can supply identity to these internal functions.
export const readFromMcp = internalQuery({
  args: { subject: v.string(), command: readCommand },
  returns: readResult,
  handler: async (ctx, { subject, command }) =>
    readWorkflow(ctx, { subject, channel: "mcp" }, command),
});
export const writeFromMcp = internalMutation({
  args: { subject: v.string(), command: writeCommand },
  returns: writeResult,
  handler: async (ctx, { subject, command }) =>
    writeWorkflow(ctx, { subject, channel: "mcp" }, command),
});

export const history = query({
  args: {
    topicId: v.string(),
    kind: v.union(v.literal("research"), v.literal("script")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { topicId, kind, paginationOpts }) => {
    const topic = await topicFor(
      ctx,
      (await requireIdentity(ctx)).subject,
      topicId,
    );
    return kind === "research"
      ? ctx.db
          .query("researchVersions")
          .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
          .order("desc")
          .paginate(paginationOpts)
      : ctx.db
          .query("scriptVersions")
          .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
          .order("desc")
          .paginate(paginationOpts);
  },
});
