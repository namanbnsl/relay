import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  projectFields,
  topicFields,
  researchFields,
  scriptFields,
} from "./model/validators";

import {
  runFields,
  packetFields,
  evidenceFields,
  plan,
} from "./model/researchContracts";

export default defineSchema({
  researchRequests: defineTable({
    owner: v.string(),
    requestKey: v.string(),
    topicId: v.id("topics"),
    plan: v.optional(plan),
    runId: v.id("researchRuns"),
  }).index("by_request", ["owner", "requestKey"]),
  mcpConnections: defineTable({
    subject: v.string(),
    lastSuccessfulReadAt: v.optional(v.number()),
    lastSuccessfulWriteAt: v.optional(v.number()),
    testCreatedAt: v.optional(v.number()),
  }).index("by_subject", ["subject"]),
  researchRuns: defineTable(runFields)
    .index("by_topic", ["topicId"])
    .index("by_request", ["owner", "requestKey"])
    .index("by_topic_occupied", ["topicId", "occupied"]),
  researchPackets: defineTable(packetFields).index("by_run", ["runId"]),
  researchEvidence: defineTable(evidenceFields).index("by_run", ["runId"]),
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
