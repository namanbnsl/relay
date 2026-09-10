import { v } from "convex/values";
import { z } from "zod";

export const evidenceId = v.union(
  v.id("workspaceEvidence"),
  v.id("researchEvidence"),
);
export const verification = v.object({
  provenance: v.literal("agent_reported"),
  findingRevision: v.number(),
  model: v.string(),
  verdict: v.string(),
  evidenceIds: v.array(evidenceId),
});
export const finding = v.object({
  id: v.string(),
  revision: v.number(),
  text: v.string(),
  assessment: v.union(
    v.literal("supported"),
    v.literal("disputed"),
    v.literal("uncertain"),
  ),
  note: v.string(),
  evidenceIds: v.array(evidenceId),
  verification: v.optional(verification),
});
export const draftFields = {
  topicId: v.id("topics"),
  revision: v.number(),
  plan: v.string(),
  openQuestions: v.array(v.string()),
  summary: v.string(),
  findings: v.array(finding),
};
export const draftDoc = v.object({
  _id: v.id("researchDrafts"),
  _creationTime: v.number(),
  ...draftFields,
});
const boundedId = z.string().min(1).max(128);
export const findingInput = z.object({
  id: boundedId,
  text: z.string().trim().min(1).max(4000),
  assessment: z.enum(["supported", "disputed", "uncertain"]),
  note: z.string().max(4000),
  evidenceIds: z.array(boundedId).max(10),
  verification: z
    .object({
      provenance: z.literal("agent_reported"),
      findingRevision: z.number().int().positive(),
      model: z.string().trim().min(1).max(200),
      verdict: z.string().trim().min(1).max(2000),
      evidenceIds: z.array(boundedId).min(1).max(10),
    })
    .optional(),
});
export const draftInput = z.object({
  topicId: boundedId,
  expectedRevision: z.number().int().nonnegative(),
  plan: z.string().max(8000),
  openQuestions: z.array(z.string().trim().min(1).max(2000)).max(20),
  summary: z.string().max(20000),
  findings: z.array(findingInput).max(50),
});
export const findingWrite = v.object({
  ...finding.fields,
  revision: v.optional(v.number()),
  evidenceIds: v.array(v.string()),
  verification: v.optional(
    v.object({ ...verification.fields, evidenceIds: v.array(v.string()) }),
  ),
});
export const draftWriteCommands = [
  v.object({
    kind: v.literal("save_research_draft"),
    topicId: v.string(),
    expectedRevision: v.number(),
    plan: v.string(),
    openQuestions: v.array(v.string()),
    summary: v.string(),
    findings: v.array(
      v.object({
        ...finding.fields,
        revision: v.optional(v.number()),
        evidenceIds: v.array(v.string()),
        verification: v.optional(
          v.object({
            ...verification.fields,
            evidenceIds: v.array(v.string()),
          }),
        ),
      }),
    ),
  }),
  v.object({
    kind: v.literal("submit_research"),
    topicId: v.string(),
    revision: v.number(),
  }),
] as const;
export const sourceFields = {
  topicId: v.id("topics"),
  url: v.string(),
  title: v.string(),
  excerpt: v.string(),
  searchId: v.id("workspaceSearches"),
  retrievalDollars: v.optional(v.number()),
  retrievalAttempts: v.optional(v.number()),
};
export const sourceDoc = v.object({
  _id: v.id("workspaceSources"),
  _creationTime: v.number(),
  ...sourceFields,
});
export const workspaceEvidenceFields = {
  topicId: v.id("topics"),
  sourceId: v.id("workspaceSources"),
  url: v.string(),
  title: v.string(),
  content: v.string(),
  retrievedAt: v.number(),
  reportedDollars: v.optional(v.number()),
};
export const workspaceEvidenceDoc = v.object({
  _id: v.id("workspaceEvidence"),
  _creationTime: v.number(),
  ...workspaceEvidenceFields,
});
const domains = z
  .array(
    z
      .string()
      .max(253)
      .regex(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/),
  )
  .max(10);
export const searchInput = z
  .object({
    topicId: boundedId,
    query: z.string().trim().min(1).max(2000),
    includeDomains: domains.optional(),
    excludeDomains: domains.optional(),
    startPublishedDate: z.iso.datetime().optional(),
    endPublishedDate: z.iso.datetime().optional(),
    numResults: z.number().int().min(1).max(10).default(5),
  })
  .refine(
    (x) =>
      !x.startPublishedDate ||
      !x.endPublishedDate ||
      Date.parse(x.startPublishedDate) <= Date.parse(x.endPublishedDate),
    "Invalid date range",
  );
export const sourceCommand = v.union(
  v.object({
    kind: v.literal("search_sources"),
    topicId: v.string(),
    query: v.string(),
    includeDomains: v.optional(v.array(v.string())),
    excludeDomains: v.optional(v.array(v.string())),
    startPublishedDate: v.optional(v.string()),
    endPublishedDate: v.optional(v.string()),
    numResults: v.optional(v.number()),
  }),
  v.object({
    kind: v.literal("read_sources"),
    topicId: v.string(),
    sourceIds: v.array(v.string()),
  }),
);
export const sourceResult = v.union(
  v.object({
    kind: v.literal("search_excerpts"),
    sources: v.array(sourceDoc),
    warning: v.string(),
  }),
  v.object({
    kind: v.literal("retrieved_content"),
    evidence: v.array(workspaceEvidenceDoc),
    failures: v.array(v.object({ sourceId: v.string(), reason: v.string() })),
    warning: v.string(),
  }),
);

// The public save operation writes a complete document ready for human review.
export const researchInput = draftInput.extend({
  plan: z.string().max(8000).default(""),
  openQuestions: z
    .array(z.string().trim().min(1).max(2000))
    .max(20)
    .default([]),
  summary: z.string().trim().min(1).max(20000),
  findings: z
    .array(
      findingInput.extend({ evidenceIds: z.array(boundedId).min(1).max(10) }),
    )
    .min(1)
    .max(50),
});

// Older MCP clients may still send claims. Both shapes enter the same writer.
export const researchSaveInput = researchInput
  .omit({ plan: true, openQuestions: true })
  .extend({
    expectedRevision: z.number().int().nonnegative().optional(),
    baseId: boundedId.optional(),
    findings: researchInput.shape.findings.optional(),
    claims: z
      .array(
        z.object({
          text: z.string().min(1).max(4000),
          assessment: z.enum(["supported", "disputed", "uncertain"]),
          note: z.string().max(4000),
          evidence: z
            .array(
              z.object({
                evidenceId: boundedId.optional(),
                url: z.url().max(2048),
                title: z.string().min(1).max(500),
                excerpt: z.string().max(8000),
                retrievedAt: z.number().nonnegative().optional(),
              }),
            )
            .min(1)
            .max(10),
        }),
      )
      .min(1)
      .max(50)
      .optional()
      .describe(
        "Compatibility only: preserve existing imported citations. New research uses findings with retrieved evidenceIds.",
      ),
  })
  .refine(
    (input) => Boolean(input.findings) !== Boolean(input.claims),
    "Supply findings, or legacy claims, but not both.",
  )
  .refine(
    (input) => !input.findings || input.expectedRevision !== undefined,
    "Use expectedRevision from get_topic when saving findings.",
  );
