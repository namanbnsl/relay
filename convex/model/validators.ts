import { discoveryConfig, frequency } from "./discoveryContracts";
import { v } from "convex/values";
import {
  draftDoc,
  evidenceId,
  draftWriteCommands,
  finding,
  findingWrite,
  sourceDoc,
} from "./draftContracts";
import { publicRunResult } from "./researchContracts";

export const review = v.union(
  v.object({ kind: v.literal("pending") }),
  v.object({
    kind: v.literal("approved"),
    reviewer: v.string(),
    at: v.number(),
  }),
  v.object({
    kind: v.literal("changes_requested"),
    reviewer: v.string(),
    at: v.number(),
    note: v.string(),
  }),
);
export const evidence = v.object({
  evidenceId: v.optional(evidenceId),
  url: v.string(),
  title: v.string(),
  excerpt: v.string(),
  retrievedAt: v.optional(v.number()),
});
export const claim = v.object({
  text: v.string(),
  assessment: v.union(
    v.literal("supported"),
    v.literal("disputed"),
    v.literal("uncertain"),
  ),
  note: v.string(),
  evidence: v.array(evidence),
});
export const scene = v.object({ narration: v.string(), visual: v.string() });
export const projectFields = {
  discovery: v.optional(discoveryConfig),
  owner: v.string(),
  name: v.string(),
};
export const topicFields = {
  angle: v.optional(v.string()),
  coverage: v.optional(v.string()),
  status: v.optional(
    v.union(v.literal("active"), v.literal("completed"), v.literal("archived")),
  ),
  frequency: v.optional(frequency),
  scheduleGeneration: v.optional(v.number()),
  nextResearchAt: v.optional(v.number()),
  parentTopicId: v.optional(v.id("topics")),
  projectId: v.id("projects"),
  title: v.string(),
  question: v.string(),
};
export const researchFields = {
  topicId: v.id("topics"),
  draftId: v.optional(v.id("researchDrafts")),
  draftRevision: v.optional(v.number()),
  findings: v.optional(v.array(finding)),
  summary: v.string(),
  claims: v.array(claim),
  review,
};
export const scriptFields = {
  topicId: v.id("topics"),
  researchVersionId: v.id("researchVersions"),
  title: v.string(),
  scenes: v.array(scene),
  review,
};
export const projectDoc = v.object({
  _id: v.id("projects"),
  _creationTime: v.number(),
  ...projectFields,
});
export const topicDoc = v.object({
  _id: v.id("topics"),
  _creationTime: v.number(),
  ...topicFields,
});
export const researchDoc = v.object({
  _id: v.id("researchVersions"),
  _creationTime: v.number(),
  ...researchFields,
});
export const scriptDoc = v.object({
  _id: v.id("scriptVersions"),
  _creationTime: v.number(),
  ...scriptFields,
});
export const readCommand = v.union(
  v.object({ kind: v.literal("projects") }),
  v.object({ kind: v.literal("project"), projectId: v.string() }),
  v.object({ kind: v.literal("topic"), topicId: v.string() }),
);
export const writeCommand = v.union(
  ...draftWriteCommands,
  v.object({ kind: v.literal("create_project"), name: v.string() }),
  v.object({
    kind: v.literal("create_topic"),
    requestKey: v.optional(v.string()),
    projectId: v.string(),
    title: v.string(),
    question: v.string(),
  }),
  v.object({
    kind: v.literal("save_research"),
    topicId: v.string(),
    summary: v.string(),
    claims: v.optional(
      v.array(
        v.object({
          ...claim.fields,
          evidence: v.array(
            v.object({
              ...evidence.fields,
              evidenceId: v.optional(v.string()),
            }),
          ),
        }),
      ),
    ),
    findings: v.optional(v.array(findingWrite)),
    expectedRevision: v.optional(v.number()),
    baseId: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("save_script"),
    researchVersionId: v.string(),
    title: v.string(),
    scenes: v.array(scene),
    baseId: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("review_research"),
    versionId: v.string(),
    decision: v.union(v.literal("approved"), v.literal("changes_requested")),
    note: v.string(),
  }),
  v.object({
    kind: v.literal("review_script"),
    versionId: v.string(),
    decision: v.union(v.literal("approved"), v.literal("changes_requested")),
    note: v.string(),
  }),
);
export const readResult = v.union(
  v.object({ kind: v.literal("projects"), projects: v.array(projectDoc) }),
  v.object({
    kind: v.literal("project"),
    project: projectDoc,
    topics: v.array(topicDoc),
    topicStates: v.optional(
      v.array(v.object({ topicId: v.id("topics"), status: v.string() })),
    ),
  }),
  v.object({
    kind: v.literal("topic"),
    topic: topicDoc,
    research: v.array(researchDoc),
    scripts: v.array(scriptDoc),
    draft: v.union(draftDoc, v.null()),
    runs: v.array(publicRunResult),
    sources: v.array(sourceDoc),
  }),
);
export const writeResult = v.object({
  id: v.string(),
  projectId: v.string(),
  topicId: v.union(v.string(), v.null()),
  status: v.string(),
  revision: v.optional(v.number()),
});
