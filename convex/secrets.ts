import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireIdentity } from "./model/auth";

const secretNoteValidator = v.object({
  _id: v.id("secretNotes"),
  _creationTime: v.number(),
  title: v.string(),
  body: v.string(),
});

export const list = query({
  args: {},
  returns: v.array(secretNoteValidator),
  handler: async (ctx) => {
    await requireIdentity(ctx);

    const notes = await ctx.db
      .query("secretNotes")
      .withIndex("by_sort_order")
      .order("asc")
      .take(50);

    return notes.map(({ _id, _creationTime, title, body }) => ({
      _id,
      _creationTime,
      title,
      body,
    }));
  },
});
