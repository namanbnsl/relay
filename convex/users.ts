import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireIdentity } from "./model/auth";

export const syncCurrent = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_subject", (query) => query.eq("subject", identity.subject))
      .unique();
    const name = identity.name ?? null;

    if (existingUser !== null) {
      if (existingUser.name !== name) {
        await ctx.db.patch(existingUser._id, { name });
      }

      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      subject: identity.subject,
      name,
    });
  },
});
