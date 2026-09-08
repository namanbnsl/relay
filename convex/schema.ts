import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  projectFields,
  topicFields,
  researchFields,
  scriptFields,
} from "./model/validators";

export default defineSchema({
  users: defineTable({
    subject: v.string(),
    name: v.union(v.string(), v.null()),
  }).index("by_subject", ["subject"]),
  projects: defineTable(projectFields)
    .index("by_owner", ["owner"])
    .index("by_owner_name", ["owner", "name"]),
  topics: defineTable(topicFields)
    .index("by_project", ["projectId"])
    .index("by_project_title", ["projectId", "title"]),
  researchVersions: defineTable(researchFields).index("by_topic", ["topicId"]),
  scriptVersions: defineTable(scriptFields).index("by_topic", ["topicId"]),
});
