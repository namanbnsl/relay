import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const secretNoteFixtures = [
  {
    key: "welcome",
    title: "Welcome to the secret page",
    body: "This content came from Convex and is available only after authentication.",
    sortOrder: 10,
  },
  {
    key: "realtime",
    title: "Reactive by default",
    body: "Changes to these records will automatically update subscribed clients.",
    sortOrder: 20,
  },
  {
    key: "server-guarded",
    title: "Protected on the server",
    body: "The query checks the verified Clerk identity before reading any records.",
    sortOrder: 30,
  },
] as const;

export const seedSecretNotes = internalMutation({
  args: {},
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;

    for (const fixture of secretNoteFixtures) {
      const existingNote = await ctx.db
        .query("secretNotes")
        .withIndex("by_key", (query) => query.eq("key", fixture.key))
        .unique();

      if (existingNote === null) {
        await ctx.db.insert("secretNotes", fixture);
        inserted += 1;
        continue;
      }

      await ctx.db.patch(existingNote._id, fixture);
      updated += 1;
    }

    return { inserted, updated };
  },
});
