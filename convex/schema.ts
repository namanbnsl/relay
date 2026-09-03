import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    subject: v.string(),
    name: v.union(v.string(), v.null()),
  }).index("by_subject", ["subject"]),

  secretNotes: defineTable({
    key: v.string(),
    title: v.string(),
    body: v.string(),
    sortOrder: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_sort_order", ["sortOrder"]),
});
