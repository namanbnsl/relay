import { ConvexError, type Infer } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { draftInput, finding, evidenceId } from "./draftContracts";
import { topicFor } from "./workflow";
import { writeCommand } from "./validators";
import { evidenceNextAction, isActive } from "./researchContracts";

type Reader = Pick<QueryCtx, "db">;
export function latestDraft(ctx: Reader, topicId: Id<"topics">) {
  return ctx.db
    .query("researchDrafts")
    .withIndex("by_topic", (q) => q.eq("topicId", topicId))
    .order("desc")
    .first();
}
export async function resolveEvidence(
  ctx: Reader,
  subject: string,
  topicId: Id<"topics">,
  value: string,
) {
  const workspaceId = ctx.db.normalizeId("workspaceEvidence", value);
  if (workspaceId) {
    const row = await ctx.db.get(workspaceId);
    if (!row || row.topicId !== topicId)
      throw new ConvexError("Evidence not found in this topic.");
    await topicFor(ctx, subject, row.topicId);
    return {
      id: row._id,
      url: row.url,
      title: row.title,
      excerpt: row.content,
      retrievedAt: row.retrievedAt,
    };
  }
  const id = ctx.db.normalizeId("researchEvidence", value);
  const row = id ? await ctx.db.get(id) : null;
  const run = row ? await ctx.db.get(row.runId) : null;
  if (!row || !run || run.owner !== subject || run.topicId !== topicId)
    throw new ConvexError(
      `Retrieved evidence not found in this topic: ${value}. Read the topic sources and use a retrieved evidence ID.`,
    );
  await topicFor(ctx, subject, run.topicId);
  if (row.outcome.kind !== "retrieved")
    throw new ConvexError(
      `Evidence ${value} (${row.canonicalUrl}) is ${row.outcome.kind}. ${evidenceNextAction(row.outcome, isActive(run.state), row.attempts)} Remove an unsupported claim if necessary, never its citations to bypass this error.`,
    );
  return {
    id: row._id,
    url: row.canonicalUrl,
    title: row.title ?? row.canonicalUrl,
    excerpt:
      "excerpt" in row && typeof row.excerpt === "string" ? row.excerpt : "",
    retrievedAt: row.outcome.retrievedAt,
  };
}
function content(f: {
  text: string;
  assessment: string;
  note: string;
  evidenceIds: string[];
}) {
  return JSON.stringify([f.text, f.assessment, f.note, f.evidenceIds]);
}
export async function writeDraft(
  ctx: MutationCtx,
  subject: string,
  command: Extract<
    Infer<typeof writeCommand>,
    { kind: "save_research_draft" | "submit_research" }
  >,
  legacyClaims?: Doc<"researchVersions">["claims"],
) {
  const topic = await topicFor(ctx, subject, command.topicId);
  if (command.kind === "submit_research") {
    if (!Number.isSafeInteger(command.revision) || command.revision < 1)
      throw new ConvexError("Invalid revision.");
    const draft = await ctx.db
      .query("researchDrafts")
      .withIndex("by_topic", (q) =>
        q.eq("topicId", topic._id).eq("revision", command.revision),
      )
      .unique();
    if (!draft)
      throw new ConvexError(
        "Research revision not found. Read the topic for its current revision; do not guess revision numbers.",
      );
    const old = await ctx.db
      .query("researchVersions")
      .withIndex("by_draft", (q) => q.eq("draftId", draft._id))
      .unique();
    if (old)
      return {
        id: old._id,
        topicId: topic._id,
        projectId: topic.projectId,
        revision: draft.revision,
        status: old.review.kind,
      };
    if ((await latestDraft(ctx, topic._id))?._id !== draft._id)
      throw new ConvexError(
        "Revision conflict. Read the current draft before submitting.",
      );
    if (
      !draft.summary.trim() ||
      !draft.findings.length ||
      (!legacyClaims && draft.findings.some((f) => !f.evidenceIds.length))
    )
      throw new ConvexError(
        "Submit a summary and findings with retrieved evidence.",
      );
    const claims =
      legacyClaims ??
      (await Promise.all(
        draft.findings.map(async (f) => ({
          text: f.text,
          assessment: f.assessment,
          note: f.note,
          evidence: await Promise.all(
            f.evidenceIds.map(async (id) => {
              const e = await resolveEvidence(ctx, subject, topic._id, id);
              return {
                evidenceId: e.id,
                url: e.url,
                title: e.title,
                excerpt: e.excerpt.slice(0, 8000),
                retrievedAt: e.retrievedAt,
              };
            }),
          ),
        })),
      ));
    if (new TextEncoder().encode(JSON.stringify(claims)).byteLength > 500000)
      throw new ConvexError(
        "Submission is too large. Reduce the number of findings or evidence references.",
      );
    const id = await ctx.db.insert("researchVersions", {
      topicId: topic._id,
      summary: draft.summary,
      claims,
      findings: draft.findings,
      draftId: draft._id,
      draftRevision: draft.revision,
      review: { kind: "pending" },
    });
    return {
      id,
      topicId: topic._id,
      projectId: topic.projectId,
      revision: draft.revision,
      status: "pending",
    };
  }
  const parsed = draftInput.safeParse(command);
  if (
    !parsed.success ||
    new TextEncoder().encode(JSON.stringify(command)).byteLength > 200000
  )
    throw new ConvexError("Invalid or oversized draft.");
  const input = parsed.data;
  const previous = await latestDraft(ctx, topic._id);
  const revision = (previous?.revision ?? 0) + 1;
  if (input.expectedRevision !== revision - 1)
    throw new ConvexError(
      "Revision conflict. Read the current draft and merge your changes.",
    );
  if (new Set(input.findings.map((f) => f.id)).size !== input.findings.length)
    throw new ConvexError("Finding IDs must be unique.");
  if (input.findings.some((f) => !f.evidenceIds.length) && !legacyClaims)
    throw new ConvexError(
      "Every finding needs retrieved evidence. Retrieve its sources, or remove the unsupported finding; do not remove citations to bypass retrieval.",
    );
  const findings: Infer<typeof finding>[] = [];
  for (const f of input.findings) {
    const ids: Infer<typeof evidenceId>[] = [];
    for (const id of f.evidenceIds)
      ids.push((await resolveEvidence(ctx, subject, topic._id, id)).id);
    const old = previous?.findings.find((old) => old.id === f.id);
    const unchanged = old && content(old) === content(f);
    const findingRevision = unchanged ? old.revision : revision;
    let verification = unchanged ? old.verification : undefined;
    if (f.verification && f.verification.findingRevision === findingRevision) {
      const supporting: Infer<typeof evidenceId>[] = [];
      for (const id of f.verification.evidenceIds)
        supporting.push(
          (await resolveEvidence(ctx, subject, topic._id, id)).id,
        );
      verification = { ...f.verification, evidenceIds: supporting };
    } else if (
      f.verification &&
      f.verification.findingRevision !== old?.revision
    ) {
      throw new ConvexError(
        "Verification must reference the exact finding revision.",
      );
    }
    findings.push({
      id: f.id,
      revision: findingRevision,
      text: f.text,
      assessment: f.assessment,
      note: f.note,
      evidenceIds: ids,
      ...(verification ? { verification } : {}),
    });
  }
  if (!input.summary.trim() || !findings.length)
    throw new ConvexError(
      "Save a research summary and at least one finding with retrieved evidence. Research saves are immediately available for review.",
    );
  await ctx.db.insert("researchDrafts", {
    topicId: topic._id,
    revision,
    plan: input.plan,
    openQuestions: input.openQuestions,
    summary: input.summary,
    findings,
  });
  return writeDraft(
    ctx,
    subject,
    { kind: "submit_research", topicId: topic._id, revision },
    legacyClaims,
  );
}
