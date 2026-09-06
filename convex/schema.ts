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
    .index("by_owner_request", ["owner", "requestId"]),
  topics: defineTable(topicFields)
    .index("by_project", ["projectId"])
    .index("by_project_request", ["projectId", "requestId"]),
  researchVersions: defineTable(researchFields)
    .index("by_topic", ["topicId"])
    .index("by_investigation", ["topicId", "investigationId"])
    .index("by_request", ["topicId", "requestId"]),
  scriptVersions: defineTable(scriptFields)
    .index("by_topic", ["topicId"])
    .index("by_request", ["topicId", "requestId"]),
});
