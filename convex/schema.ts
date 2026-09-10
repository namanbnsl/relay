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

import {
  draftFields,
  sourceFields,
  workspaceEvidenceFields,
} from "./model/draftContracts";
export default defineSchema({
  topicRequests: defineTable({
    owner: v.string(),
    requestKey: v.string(),
    topicId: v.id("topics"),
    projectId: v.id("projects"),
    title: v.string(),
    question: v.string(),
  }).index("by_request", ["owner", "requestKey"]),
  researchDrafts: defineTable(draftFields).index("by_topic", [
    "topicId",
    "revision",
  ]),
  workspaceSearches: defineTable({
    topicId: v.id("topics"),
    query: v.string(),
    optionsJson: v.string(),
    reportedDollars: v.optional(v.number()),
  }).index("by_topic", ["topicId"]),
  workspaceSources: defineTable(sourceFields).index("by_topic", ["topicId"]),
  workspaceEvidence: defineTable(workspaceEvidenceFields)
    .index("by_source", ["sourceId"])
    .index("by_topic", ["topicId"]),
  researchRequests: defineTable({
    owner: v.string(),
    requestKey: v.string(),
    question: v.optional(v.string()),
    topicId: v.id("topics"),
    plan: v.optional(plan),
    runId: v.id("researchRuns"),
  }).index("by_request", ["owner", "requestKey"]),
  researchRuns: defineTable(runFields)
    .index("by_topic", ["topicId"])
    .index("by_request", ["owner", "requestKey"])
    .index("by_topic_occupied", ["topicId", "occupied"]),
  researchPackets: defineTable(packetFields).index("by_run", ["runId"]),
  researchEvidence: defineTable(evidenceFields).index("by_run", ["runId"]),
  projects: defineTable(projectFields)
    .index("by_owner", ["owner"])
    .index("by_owner_name", ["owner", "name"]),
  topics: defineTable(topicFields)
    .index("by_project", ["projectId"])
    .index("by_project_title", ["projectId", "title"]),
  researchVersions: defineTable(researchFields)
    .index("by_topic", ["topicId"])
    .index("by_draft", ["draftId"]),
  scriptVersions: defineTable(scriptFields).index("by_topic", ["topicId"]),
});
