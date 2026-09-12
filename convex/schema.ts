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
  sourceRetrievalState,
  workspaceEvidenceFields,
} from "./model/draftContracts";
import { candidate, investigationState } from "./model/discoveryContracts";
export default defineSchema({
  monitors: defineTable({
    projectId: v.id("projects"),
    requestKey: v.string(),
    name: v.string(),
    query: v.string(),
    domains: v.array(v.string()),
    paused: v.boolean(),
    removed: v.boolean(),
    generation: v.number(),
    sync: v.union(
      v.literal("pending"),
      v.literal("syncing"),
      v.literal("ready"),
      v.literal("error"),
      v.literal("unavailable"),
    ),
    error: v.optional(v.string()),
    remoteId: v.optional(v.string()),
    secret: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
    lastCheck: v.optional(v.number()),
    lastOutcome: v.optional(v.string()),
    collectionError: v.optional(v.string()),
    nextCheck: v.optional(v.number()),
    nextReconcileAt: v.optional(v.number()),
    leaseUntil: v.optional(v.number()),
    creationAttempted: v.optional(v.boolean()),
  })
    .index("by_project", ["projectId"])
    .index("by_request", ["projectId", "requestKey"])
    .index("by_remote", ["remoteId"])
    .index("by_reconcile", ["nextReconcileAt"]),
  monitorChecks: defineTable({
    monitorId: v.id("monitors"),
    requestKey: v.string(),
    generation: v.number(),
    claimed: v.boolean(),
  }).index("by_request", ["monitorId", "requestKey"]),
  discoveryDeliveries: defineTable({
    monitorId: v.id("monitors"),
    runId: v.string(),
    at: v.number(),
    status: v.string(),
  }).index("by_run", ["monitorId", "runId"]),
  discoveryUpdates: defineTable({
    projectId: v.id("projects"),
    key: v.string(),
    ...candidate.fields,
    monitorIds: v.array(v.id("monitors")),
    discoveredAt: v.number(),
    updatedAt: v.number(),
    dismissed: v.boolean(),
    createdTopicId: v.optional(v.id("topics")),
  })
    .index("by_project", ["projectId"])
    .index("by_key", ["projectId", "key"]),
  topicUpdates: defineTable({
    projectId: v.id("projects"),
    topicId: v.id("topics"),
    updateId: v.id("discoveryUpdates"),
  })
    .index("by_topic", ["topicId"])
    .index("by_pair", ["topicId", "updateId"]),
  investigations: defineTable({
    projectId: v.id("projects"),
    topicId: v.id("topics"),
    generation: v.number(),
    due: v.number(),
    baseRevision: v.number(),
    state: investigationState,
  })
    .index("by_topic", ["topicId"])
    .index("by_project", ["projectId"])
    .index("by_cycle", ["topicId", "generation", "due"]),
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
  workspaceSourceRetrievals: defineTable({
    sourceId: v.id("workspaceSources"),
    state: sourceRetrievalState,
  }).index("by_source", ["sourceId"]),
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
    .index("by_project_title", ["projectId", "title"])
    .index("by_due", ["nextResearchAt"]),
  researchVersions: defineTable(researchFields)
    .index("by_topic", ["topicId"])
    .index("by_draft", ["draftId"]),
  scriptVersions: defineTable(scriptFields).index("by_topic", ["topicId"]),
});
