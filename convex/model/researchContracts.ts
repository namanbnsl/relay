import { vWorkflowId } from "@convex-dev/workflow";
import { v } from "convex/values";
import { z } from "zod";

export const plan = v.object({
  scope: v.string(),
  subquestions: v.array(v.string()),
});
export const startInput = z
  .object({
    topicId: z.string().min(1).max(128),
    requestKey: z.string().min(8).max(128),
    plan: z
      .object({
        scope: z.string().max(8000),
        subquestions: z.array(z.string().min(1).max(2000)).max(8),
      })
      .optional(),
  })
  .strict();
export const writeResearchCommand = v.union(
  v.object({
    kind: v.literal("start_research"),
    topicId: v.string(),
    requestKey: v.string(),
    plan: v.optional(plan),
  }),
  v.object({ kind: v.literal("cancel_run"), runId: v.string() }),
  v.object({ kind: v.literal("retry_run"), runId: v.string() }),
);
export const readResearchCommand = v.union(
  v.object({ kind: v.literal("topic_runs"), topicId: v.string() }),
  v.object({ kind: v.literal("get_run"), runId: v.string() }),
  v.object({ kind: v.literal("get_research_packet"), runId: v.string() }),
  v.object({ kind: v.literal("get_evidence"), evidenceId: v.string() }),
);
export const runState = v.union(
  v.object({ kind: v.literal("queued") }),
  v.object({ kind: v.literal("running") }),
  v.object({
    kind: v.literal("succeeded"),
    packetId: v.id("researchPackets"),
    at: v.number(),
  }),
  v.object({
    kind: v.literal("partial"),
    packetId: v.id("researchPackets"),
    at: v.number(),
    reason: v.string(),
  }),
  v.object({ kind: v.literal("failed"), at: v.number(), reason: v.string() }),
  v.object({ kind: v.literal("cancelled"), at: v.number() }),
);
export const submission = v.union(
  v.object({ kind: v.literal("not_submitted") }),
  v.object({ kind: v.literal("uncertain"), at: v.number() }),
  v.object({ kind: v.literal("accepted"), remoteId: v.string() }),
);
export const runFields = {
  owner: v.string(),
  projectId: v.id("projects"),
  topicId: v.id("topics"),
  requestKey: v.string(),
  question: v.string(),
  plan: v.optional(plan),
  brief: v.string(),
  state: runState,
  submission,
  stage: v.string(),
  updatedAt: v.number(),
  startedAt: v.optional(v.number()),
  deadline: v.number(),
  workflowId: v.optional(vWorkflowId),
  attempts: v.number(),
  recoveries: v.number(),
  provider: v.literal("exa"),
  effort: v.union(v.literal("minimal"), v.literal("low"), v.literal("medium")),
  // Legacy runs may contain this field; new runs no longer reserve a budget.
  reservedDollars: v.optional(v.number()),
  actualDollars: v.optional(v.number()),
  usageJson: v.optional(v.string()),
  remoteTerminal: v.optional(v.boolean()),
  occupied: v.boolean(),
  cancellation: v.string(),
  pollCount: v.number(),
  packetId: v.optional(v.id("researchPackets")),
};
export const packetFields = {
  runId: v.id("researchRuns"),
  findings: v.string(),
  outputStorageId: v.id("_storage"),
  groundingJson: v.string(),
  gaps: v.array(v.string()),
  createdAt: v.number(),
  provenance: v.literal("exa_agent"),
  verification: v.literal("not_independently_verified"),
  approval: v.literal("not_reviewed"),
  providerStatus: v.string(),
};
export const evidenceOutcome = v.union(
  v.object({ kind: v.literal("pending") }),
  v.object({
    kind: v.literal("retrieved"),
    storageId: v.id("_storage"),
    hash: v.string(),
    retrievedAt: v.number(),
    characters: v.number(),
  }),
  v.object({ kind: v.literal("failed"), reason: v.string(), at: v.number() }),
);
export const evidenceFields = {
  runId: v.id("researchRuns"),
  originalUrl: v.string(),
  canonicalUrl: v.string(),
  title: v.optional(v.string()),
  publisher: v.optional(v.string()),
  publishedAt: v.optional(v.string()),
  publicationProvenance: v.optional(v.literal("exa_contents")),
  reportedDollars: v.optional(v.number()),
  outcome: evidenceOutcome,
  attempts: v.number(),
};

export const runDocument = v.object({
  ...runFields,
  _id: v.id("researchRuns"),
  _creationTime: v.number(),
});
export const publicRunResult = v.object({
  ...runDocument.fields,
  path: v.string(),
  semantics: v.string(),
});
export const packetDocument = v.object({
  ...packetFields,
  _id: v.id("researchPackets"),
  _creationTime: v.number(),
});
export const evidenceDocument = v.object({
  ...evidenceFields,
  _id: v.id("researchEvidence"),
  _creationTime: v.number(),
});
export const researchReadResult = v.union(
  v.object({
    kind: v.literal("topic_runs"),
    setup: v.union(
      v.object({ kind: v.literal("ready"), effort: runFields.effort }),
      v.object({ kind: v.literal("unavailable"), reason: v.string() }),
    ),
    runs: v.array(publicRunResult),
  }),
  v.object({ kind: v.literal("run"), run: publicRunResult }),
  v.object({
    kind: v.literal("packet"),
    run: publicRunResult,
    packet: v.union(packetDocument, v.null()),
    evidence: v.array(evidenceDocument),
    outputUrl: v.union(v.string(), v.null()),
    nextAction: v.string(),
  }),
  v.object({
    kind: v.literal("evidence"),
    evidence: evidenceDocument,
    path: v.string(),
    contentUrl: v.union(v.string(), v.null()),
    warning: v.string(),
  }),
);

export const connectionMarker = v.union(
  v.object({ id: v.string(), createdAt: v.number() }),
  v.null(),
);
export const connectionTestResult = v.object({
  testMarker: connectionMarker,
  removed: v.boolean(),
  path: v.string(),
});

export function settings() {
  const parsed = z
    .object({
      effort: z.enum(["minimal", "low", "medium"]).default("medium"),
    })
    .safeParse({
      effort: process.env.EXA_RESEARCH_EFFORT,
    });
  if (!parsed.success)
    return {
      kind: "unavailable",
      reason:
        "Research effort is invalid. Use minimal, low, or medium in Convex.",
    } as const;
  if (!process.env.EXA_API_KEY)
    return {
      kind: "unavailable",
      reason: "Set EXA_API_KEY in the Convex deployment to enable research.",
    } as const;
  if (process.env.RESEARCH_ENABLED !== "true")
    return {
      kind: "unavailable",
      reason:
        "Provider execution is paused. Set RESEARCH_ENABLED=true in Convex to enable it.",
    } as const;
  return {
    kind: "ready",
    ...parsed.data,
  } as const;
}
export function isActive(state: { kind: string }) {
  return state.kind === "queued" || state.kind === "running";
}
