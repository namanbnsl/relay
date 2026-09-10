/// <reference types="vite/client" />
import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const ids = await t.run(async (ctx) => {
    const projectId = await ctx.db.insert("projects", {
      owner: "owner",
      name: "Research",
    });
    const topicId = await ctx.db.insert("topics", {
      projectId,
      title: "Current research",
      question: "What is current?",
    });
    const searchId = await ctx.db.insert("workspaceSearches", {
      topicId,
      query: "primary",
      optionsJson: "{}",
    });
    const sourceId = await ctx.db.insert("workspaceSources", {
      topicId,
      searchId,
      url: "https://example.org/source",
      title: "Primary source",
      excerpt: "Search snippet",
    });
    const evidenceId = await ctx.db.insert("workspaceEvidence", {
      topicId,
      sourceId,
      url: "https://example.org/source",
      title: "Primary source",
      content: "Actual retrieved passage.",
      retrievedAt: 1,
    });
    return { topicId, evidenceId };
  });
  const finding = {
    id: "finding-1",
    text: "A sourced finding",
    assessment: "supported" as const,
    note: "",
    evidenceIds: [ids.evidenceId],
  };
  return { t, owner, ...ids, finding };
}
it("uses one review document and revision sequence across canonical and compatibility saves", async () => {
  const { owner, topicId, finding } = await setup();
  const first = await owner.mutation(api.relay.write, {
    command: {
      kind: "save_research",
      topicId,
      expectedRevision: 0,
      summary: "Research synthesis",
      findings: [finding],
    },
  });
  expect(first).toMatchObject({ revision: 1, status: "pending" });
  const topic = await owner.query(api.relay.read, {
    command: { kind: "topic", topicId },
  });
  if (topic.kind !== "topic") throw new Error("Wrong topic result");
  expect(topic.research).toHaveLength(1);
  expect(topic.research[0].claims[0].evidence[0]).toMatchObject({
    evidenceId: finding.evidenceIds[0],
    excerpt: "Actual retrieved passage.",
  });
  const second = await owner.mutation(api.relay.write, {
    command: {
      kind: "save_research",
      topicId,
      baseId: first.id,
      summary: "Human edit",
      claims: topic.research[0].claims,
    },
  });
  expect(second).toMatchObject({ revision: 2, status: "pending" });
  const submitted = await owner.mutation(api.relay.write, {
    command: { kind: "submit_research", topicId, revision: 2 },
  });
  expect(submitted.id).toBe(second.id);
  await expect(
    owner.mutation(api.relay.write, {
      command: {
        kind: "review_research",
        versionId: first.id,
        decision: "approved",
        note: "",
      },
    }),
  ).rejects.toThrow("latest research");
  await owner.mutation(api.relay.write, {
    command: {
      kind: "review_research",
      versionId: second.id,
      decision: "approved",
      note: "",
    },
  });
  await expect(
    owner.mutation(api.relay.write, {
      command: {
        kind: "save_research_draft",
        topicId,
        expectedRevision: 1,
        summary: "Stale",
        findings: [finding],
        plan: "",
        openQuestions: [],
      },
    }),
  ).rejects.toThrow("Revision conflict");
});
it("rejects fabricated excerpts and citation removal through every save path", async () => {
  const { owner, topicId, finding } = await setup();
  await expect(
    owner.mutation(api.relay.write, {
      command: {
        kind: "save_research",
        topicId,
        summary: "Fabricated",
        claims: [
          {
            text: "Claim",
            assessment: "supported",
            note: "",
            evidence: [
              {
                url: "https://example.org/invented",
                title: "Invented",
                excerpt: "Invented quotation",
              },
            ],
          },
        ],
      },
    }),
  ).rejects.toThrow("no retrieved evidence");
  await expect(
    owner.mutation(api.relay.write, {
      command: {
        kind: "save_research",
        topicId,
        summary: "No citations",
        claims: [
          { text: "Claim", assessment: "supported", note: "", evidence: [] },
        ],
      },
    }),
  ).rejects.toThrow("needs retrieved evidence");
  await expect(
    owner.mutation(api.relay.write, {
      command: {
        kind: "save_research_draft",
        topicId,
        expectedRevision: 0,
        plan: "",
        openQuestions: [],
        summary: "No citations",
        findings: [{ ...finding, evidenceIds: [] }],
      },
    }),
  ).rejects.toThrow("Every finding needs retrieved evidence");
});
it("keeps existing imported documents editable and migrates the next save into canonical revisions", async () => {
  const { t, owner, topicId } = await setup();
  const claims = [
    {
      text: "Imported finding",
      assessment: "supported" as const,
      note: "",
      evidence: [
        {
          url: "https://archive.org/imported",
          title: "Historical import",
          excerpt: "Original imported text",
        },
      ],
    },
  ];
  const baseId = await t.run((ctx) =>
    ctx.db.insert("researchVersions", {
      topicId,
      summary: "Old document",
      claims,
      review: { kind: "pending" },
    }),
  );
  const updated = await owner.mutation(api.relay.write, {
    command: {
      kind: "save_research",
      topicId,
      baseId,
      summary: "Edited document",
      claims,
    },
  });
  expect(updated).toMatchObject({ revision: 1, status: "pending" });
  const result = await owner.query(api.relay.read, {
    command: { kind: "topic", topicId },
  });
  if (result.kind !== "topic") throw new Error("Wrong topic result");
  expect(result.research[0].claims).toEqual(claims);
  expect(result.draft?.revision).toBe(1);
  expect(
    (
      await owner.mutation(api.relay.write, {
        command: { kind: "submit_research", topicId, revision: 1 },
      })
    ).id,
  ).toBe(updated.id);
});
it("names pending references, blocks both save paths, and saves the retrieved passage after recovery", async () => {
  const { t, owner, topicId, finding } = await setup();
  const evidenceId = await t.run(async (ctx) => {
    const topic = await ctx.db.get(topicId);
    if (!topic) throw new Error("Missing topic");
    const runId = await ctx.db.insert("researchRuns", {
      owner: "owner",
      projectId: topic.projectId,
      topicId,
      requestKey: "provider-run",
      question: topic.question,
      brief: topic.question,
      state: { kind: "running" },
      submission: { kind: "accepted", remoteId: "provider" },
      stage: "Retrieving sources",
      updatedAt: 1,
      deadline: Date.now() + 60000,
      attempts: 1,
      recoveries: 0,
      provider: "exa",
      effort: "medium",
      occupied: true,
      cancellation: "",
      pollCount: 0,
    });
    return ctx.db.insert("researchEvidence", {
      runId,
      canonicalUrl: "https://example.org/pending",
      originalUrl: "https://example.org/pending",
      outcome: { kind: "pending" },
      attempts: 0,
    });
  });
  for (const command of [
    {
      kind: "save_research" as const,
      topicId,
      expectedRevision: 0,
      summary: "Synthesis",
      findings: [{ ...finding, evidenceIds: [evidenceId] }],
    },
    {
      kind: "save_research" as const,
      topicId,
      summary: "Synthesis",
      claims: [
        {
          text: finding.text,
          assessment: finding.assessment,
          note: "",
          evidence: [
            {
              url: "https://example.org/pending",
              title: "Source",
              excerpt: "Invented paraphrase",
            },
          ],
        },
      ],
    },
  ]) {
    await expect(owner.mutation(api.relay.write, { command })).rejects.toThrow(
      `${evidenceId} (https://example.org/pending) is pending`,
    );
  }
  await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["Actual provider passage"]),
    );
    await ctx.db.patch(evidenceId, {
      excerpt: "Actual provider passage",
      outcome: {
        kind: "retrieved",
        storageId,
        hash: "fixture",
        retrievedAt: 2,
        characters: 23,
      },
    });
  });
  await owner.mutation(api.relay.write, {
    command: {
      kind: "save_research",
      topicId,
      expectedRevision: 0,
      summary: "Synthesis",
      findings: [{ ...finding, evidenceIds: [evidenceId] }],
    },
  });
  const result = await owner.query(api.relay.read, {
    command: { kind: "topic", topicId },
  });
  if (result.kind !== "topic") throw new Error("Wrong topic result");
  expect(result.research[0].claims[0].evidence[0]).toMatchObject({
    evidenceId,
    excerpt: "Actual provider passage",
  });
});
it("rejects empty compatibility drafts instead of creating a second unfinished document", async () => {
  const { owner, topicId } = await setup();
  await expect(
    owner.mutation(api.relay.write, {
      command: {
        kind: "save_research_draft",
        topicId,
        expectedRevision: 0,
        summary: "",
        findings: [],
        plan: "Planning only",
        openQuestions: [],
      },
    }),
  ).rejects.toThrow("immediately available for review");
});
