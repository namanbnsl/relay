import { ConvexError, type Infer } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { readCommand, writeCommand, writeResult } from "./validators";

import { latestDraft, writeDraft, resolveEvidence } from "./drafts";
import { publicRun } from "../research";

type Reader = Pick<QueryCtx, "db">;
type Actor = { subject: string; channel: "web" | "mcp" };
type Result = Infer<typeof writeResult>;
function fail(message: string): never {
  throw new ConvexError(message);
}
function text(value: string, label: string, max = 10000) {
  if (!value.trim() || value.length > max)
    fail(`${label} is required and must be at most ${max} characters.`);
}
export async function projectFor(ctx: Reader, subject: string, value: string) {
  const id = ctx.db.normalizeId("projects", value);
  const project = id ? await ctx.db.get(id) : null;
  if (!project || project.owner !== subject) fail("Project not found.");
  return project;
}
export async function topicFor(ctx: Reader, subject: string, value: string) {
  const id = ctx.db.normalizeId("topics", value);
  const topic = id ? await ctx.db.get(id) : null;
  if (!topic) fail("Topic not found.");
  await projectFor(ctx, subject, topic.projectId);
  return topic;
}
async function researchFor(ctx: Reader, subject: string, value: string) {
  const id = ctx.db.normalizeId("researchVersions", value);
  const row = id ? await ctx.db.get(id) : null;
  if (!row) fail("Research not found.");
  const topic = await topicFor(ctx, subject, row.topicId);
  return { row, topic };
}
async function latestResearch(ctx: Reader, topicId: Id<"topics">) {
  return ctx.db
    .query("researchVersions")
    .withIndex("by_topic", (q) => q.eq("topicId", topicId))
    .order("desc")
    .first();
}
async function currentApprovedResearch(
  ctx: Reader,
  row: Doc<"researchVersions">,
) {
  if (
    row.review.kind !== "approved" ||
    (await latestResearch(ctx, row.topicId))?._id !== row._id
  )
    fail("Use the current approved research.");
}
// Compare meaningful content in a fixed field order, independent of JSON key order.
function researchContent(
  row: Pick<Doc<"researchVersions">, "summary" | "claims">,
) {
  return JSON.stringify([
    row.summary,
    row.claims.map((c) => [
      c.text,
      c.assessment,
      c.note,
      c.evidence.map((e) => [e.url, e.title, e.excerpt, e.retrievedAt]),
    ]),
  ]);
}
function scriptContent(
  row: Pick<Doc<"scriptVersions">, "researchVersionId" | "title" | "scenes">,
) {
  return JSON.stringify([
    row.researchVersionId,
    row.title,
    row.scenes.map((s) => [s.narration, s.visual]),
  ]);
}
function saved(
  row: { _id: string; review: Doc<"researchVersions">["review"] },
  topic: Doc<"topics">,
): Result {
  return {
    id: row._id,
    projectId: topic.projectId,
    topicId: topic._id,
    status: row.review.kind,
  };
}
export async function readWorkflow(
  ctx: Reader,
  actor: Actor,
  command: Infer<typeof readCommand>,
) {
  switch (command.kind) {
    case "projects":
      return {
        kind: "projects" as const,
        projects: await ctx.db
          .query("projects")
          .withIndex("by_owner", (q) => q.eq("owner", actor.subject))
          .order("desc")
          .take(100),
      };
    case "project": {
      const project = await projectFor(ctx, actor.subject, command.projectId);
      const topics = await ctx.db
        .query("topics")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .order("desc")
        .take(100);
      const topicStates = await Promise.all(
        topics.map(async (topic) => {
          const [research, run, investigation] = await Promise.all([
            latestResearch(ctx, topic._id),
            ctx.db
              .query("researchRuns")
              .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
              .order("desc")
              .first(),
            ctx.db
              .query("investigations")
              .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
              .order("desc")
              .first(),
          ]);
          const status = run?.occupied
            ? "Gathering sources"
            : investigation?.state.kind === "provider" && run?.packetId
              ? "Waiting for agent"
              : investigation?.state.kind === "closed" &&
                  investigation.state.outcome === "no_material_update"
                ? "No material update"
                : research
                  ? research.review.kind === "approved"
                    ? "Research approved"
                    : research.review.kind === "changes_requested"
                      ? "Changes requested"
                      : "Ready for review"
                  : run?.packetId
                    ? "Waiting for agent"
                    : run?.state.kind === "failed"
                      ? "Research needs attention"
                      : "Not researched";
          return { topicId: topic._id, status };
        }),
      );
      return { kind: "project" as const, project, topics, topicStates };
    }
    case "topic": {
      const topic = await topicFor(ctx, actor.subject, command.topicId);
      const [research, scripts] = await Promise.all([
        ctx.db
          .query("researchVersions")
          .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
          .order("desc")
          .take(10),
        ctx.db
          .query("scriptVersions")
          .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
          .order("desc")
          .take(10),
      ]);
      const scriptSourceId = scripts[0]?.researchVersionId;
      if (
        scriptSourceId &&
        !research.some((row) => row._id === scriptSourceId)
      ) {
        const source = await ctx.db.get(scriptSourceId);
        if (source?.topicId === topic._id) research.push(source);
      }
      const [draft, runs, sources] = await Promise.all([
        latestDraft(ctx, topic._id),
        ctx.db
          .query("researchRuns")
          .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
          .order("desc")
          .take(20),
        ctx.db
          .query("workspaceSources")
          .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
          .order("desc")
          .take(100),
      ]);
      return {
        kind: "topic" as const,
        topic,
        research,
        scripts,
        draft,
        runs: runs.map(publicRun),
        sources,
      };
    }
  }
}
export async function writeWorkflow(
  ctx: MutationCtx,
  actor: Actor,
  command: Infer<typeof writeCommand>,
): Promise<Result> {
  if (
    command.kind === "save_research_draft" ||
    command.kind === "submit_research"
  )
    return writeDraft(ctx, actor.subject, command);
  if (command.kind === "create_project") {
    const name = command.name.trim();
    text(name, "Project name", 160);
    const old = await ctx.db
      .query("projects")
      .withIndex("by_owner_name", (q) =>
        q.eq("owner", actor.subject).eq("name", name),
      )
      .first();
    const id =
      old?._id ??
      (await ctx.db.insert("projects", { owner: actor.subject, name }));
    return { id, projectId: id, topicId: null, status: "created" };
  }
  if (command.kind === "create_topic") {
    const project = await projectFor(ctx, actor.subject, command.projectId);
    const title = command.title.trim();
    const question = command.question.trim();
    text(title, "Title", 160);
    text(question, "Question", 12000);
    if (command.requestKey !== undefined) {
      text(command.requestKey, "Request key", 128);
      if (command.requestKey.length < 8)
        fail("Request key must have at least 8 characters.");
      const requestKey = command.requestKey;
      const receipt = await ctx.db
        .query("topicRequests")
        .withIndex("by_request", (q) =>
          q.eq("owner", actor.subject).eq("requestKey", requestKey),
        )
        .unique();
      if (receipt) {
        if (
          receipt.projectId !== project._id ||
          receipt.title !== title ||
          receipt.question !== question
        )
          fail("Request key already used with different inputs.");
        await topicFor(ctx, actor.subject, receipt.topicId);
        return {
          id: receipt.topicId,
          projectId: project._id,
          topicId: receipt.topicId,
          status: "created",
        };
      }
      const id = await ctx.db.insert("topics", {
        projectId: project._id,
        title,
        question,
      });
      await ctx.db.insert("topicRequests", {
        owner: actor.subject,
        requestKey: command.requestKey,
        topicId: id,
        projectId: project._id,
        title,
        question,
      });
      return { id, projectId: project._id, topicId: id, status: "created" };
    }
    // Legacy clients without request keys retain title-based deduplication.
    const old = await ctx.db
      .query("topics")
      .withIndex("by_project_title", (q) =>
        q.eq("projectId", project._id).eq("title", title),
      )
      .first();
    if (old && old.question !== question)
      fail("A topic with this title already exists. Choose a different title.");
    const id =
      old?._id ??
      (await ctx.db.insert("topics", {
        projectId: project._id,
        title,
        question,
      }));
    return { id, projectId: project._id, topicId: id, status: "created" };
  }
  if (command.kind === "save_research") {
    const topic = await topicFor(ctx, actor.subject, command.topicId);
    if (command.findings) {
      if (command.claims) fail("Supply findings or claims, not both.");
      if (command.expectedRevision === undefined)
        fail(
          "Read the topic and pass its current revision as expectedRevision.",
        );
      const previous = await latestDraft(ctx, topic._id);
      if (
        command.baseId !== undefined &&
        command.baseId !== (await latestResearch(ctx, topic._id))?._id
      )
        fail("Revision conflict. Reopen the latest research.");
      return writeDraft(ctx, actor.subject, {
        kind: "save_research_draft",
        topicId: topic._id,
        expectedRevision: command.expectedRevision,
        summary: command.summary,
        findings: command.findings,
        plan: previous?.plan ?? "",
        openQuestions: previous?.openQuestions ?? [],
      });
    }
    if (!command.claims) fail("Supply sourced findings to save research.");
    text(command.summary, "Summary", 20000);
    if (!command.claims.length || command.claims.length > 50)
      fail("Research needs 1–50 findings.");
    for (const claim of command.claims) {
      text(claim.text, "Finding", 4000);
      if (claim.note.length > 4000 || claim.evidence.length > 10)
        fail("Finding is too large.");
      for (const source of claim.evidence) {
        text(source.title, "Source title", 500);
        if (source.excerpt.length > 8000) fail("Excerpt is too large.");
        let url: URL;
        try {
          url = new URL(source.url);
        } catch {
          fail("Invalid source URL.");
        }
        if (
          !["http:", "https:"].includes(url.protocol) ||
          source.url.length > 2048
        )
          fail("Sources require an HTTP(S) URL.");
        if (
          source.retrievedAt !== undefined &&
          (!Number.isFinite(source.retrievedAt) ||
            source.retrievedAt < 0 ||
            source.retrievedAt > Date.now() + 60000)
        )
          fail("Invalid retrieval time.");
      }
    }
    const latest = await latestResearch(ctx, topic._id);
    const previous = await latestDraft(ctx, topic._id);
    const workspace = await ctx.db
      .query("workspaceEvidence")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .collect();
    const runs = await ctx.db
      .query("researchRuns")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .collect();
    const providerEvidence = (
      await Promise.all(
        runs.map((run) =>
          ctx.db
            .query("researchEvidence")
            .withIndex("by_run", (q) => q.eq("runId", run._id))
            .collect(),
        ),
      )
    ).flat();
    const claims = await Promise.all(
      command.claims.map(async (claim) => {
        if (!claim.evidence.length)
          fail(
            `Finding "${claim.text}" needs retrieved evidence. Retrieve its sources or remove the unsupported finding.`,
          );
        return {
          ...claim,
          evidence: await Promise.all(
            claim.evidence.map(async (source) => {
              const existing = latest?.claims
                .flatMap((c) => c.evidence)
                .find(
                  (e) => e.url === source.url && e.excerpt === source.excerpt,
                );
              const direct = workspace.find((e) => e.url === source.url);
              const candidates = providerEvidence.filter(
                (e) =>
                  e.canonicalUrl === source.url || e.originalUrl === source.url,
              );
              const reference =
                source.evidenceId ??
                existing?.evidenceId ??
                direct?._id ??
                candidates.find((e) => e.outcome.kind === "retrieved")?._id ??
                candidates[0]?._id;
              if (reference) {
                const resolved = await resolveEvidence(
                  ctx,
                  actor.subject,
                  topic._id,
                  reference,
                );
                return {
                  evidenceId: resolved.id,
                  url: resolved.url,
                  title: resolved.title,
                  excerpt: resolved.excerpt.slice(0, 8000),
                  retrievedAt: resolved.retrievedAt,
                };
              }
              // Historical imported documents remain editable without manufacturing a
              // retrieved evidence record from their user-supplied excerpts.
              if (existing) return existing;
              fail(
                `Source ${source.url} has no retrieved evidence in this topic. Use search_sources/read_sources before saving. Supplied excerpts are not retrieved evidence.`,
              );
            }),
          ),
        };
      }),
    );
    const normalized = { summary: command.summary, claims };
    if (
      new TextEncoder().encode(researchContent(normalized)).byteLength > 500000
    )
      fail("Research is too large.");
    if (latest && researchContent(latest) === researchContent(normalized))
      return {
        ...saved(latest, topic),
        revision: latest.draftRevision ?? previous?.revision ?? 0,
      };
    if (
      (command.baseId !== undefined && command.baseId !== latest?._id) ||
      (command.expectedRevision !== undefined &&
        command.expectedRevision !== (previous?.revision ?? 0))
    )
      fail(
        "Revision conflict. Research changed while you were editing. Reopen the latest document.",
      );
    if (
      latest &&
      command.baseId === undefined &&
      command.expectedRevision === undefined
    )
      fail(
        "Read the current research and pass its revision as expectedRevision or its document ID as baseId before editing.",
      );
    return writeDraft(
      ctx,
      actor.subject,
      {
        kind: "save_research_draft",
        topicId: topic._id,
        expectedRevision: previous?.revision ?? 0,
        summary: command.summary,
        plan: previous?.plan ?? "",
        openQuestions: previous?.openQuestions ?? [],
        findings: claims.map((claim, index) => ({
          id: latest?.findings?.[index]?.id ?? `finding-${index + 1}`,
          text: claim.text,
          assessment: claim.assessment,
          note: claim.note,
          evidenceIds: claim.evidence.flatMap((e) =>
            e.evidenceId ? [e.evidenceId] : [],
          ),
        })),
      },
      claims,
    );
  }

  if (command.kind === "save_script") {
    const { row: source, topic } = await researchFor(
      ctx,
      actor.subject,
      command.researchVersionId,
    );
    text(command.title, "Script title", 160);
    if (!command.scenes.length || command.scenes.length > 100)
      fail("A script needs 1–100 scenes.");
    for (const scene of command.scenes) {
      text(scene.narration, "Narration");
      text(scene.visual, "Visual plan");
    }
    const content = {
      researchVersionId: source._id,
      title: command.title,
      scenes: command.scenes,
    };
    if (new TextEncoder().encode(scriptContent(content)).byteLength > 200000)
      fail("Script is too large.");
    const latest = await ctx.db
      .query("scriptVersions")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .order("desc")
      .first();
    await currentApprovedResearch(ctx, source);
    if (latest && scriptContent(latest) === scriptContent(content))
      return saved(latest, topic);
    if (command.baseId !== undefined && command.baseId !== latest?._id)
      fail(
        "Script changed while you were editing. Reopen the latest document.",
      );
    const id = await ctx.db.insert("scriptVersions", {
      topicId: topic._id,
      ...content,
      review: { kind: "pending" },
    });
    return saved({ _id: id, review: { kind: "pending" } }, topic);
  }
  if (actor.channel !== "web") fail("Human review is only available in Relay.");
  const id =
    command.kind === "review_research"
      ? ctx.db.normalizeId("researchVersions", command.versionId)
      : ctx.db.normalizeId("scriptVersions", command.versionId);
  const row = id ? await ctx.db.get(id) : null;
  if (!row) fail("Document not found.");
  const topic = await topicFor(ctx, actor.subject, row.topicId);
  if ("summary" in row) {
    if ((await latestResearch(ctx, topic._id))?._id !== row._id)
      fail("Review the latest research.");
    if (
      command.decision === "approved" &&
      (!row.claims.length ||
        row.claims.some(
          (c) => c.assessment !== "supported" || !c.evidence.length,
        ))
    )
      fail("Resolve unsupported findings and attach sources before approval.");
  } else {
    const latest = await ctx.db
      .query("scriptVersions")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .order("desc")
      .first();
    if (latest?._id !== row._id) fail("Review the latest script.");
    if (command.decision === "approved")
      await currentApprovedResearch(
        ctx,
        (await researchFor(ctx, actor.subject, row.researchVersionId)).row,
      );
  }
  if (row.review.kind === command.decision) return saved(row, topic);
  if (row.review.kind === "approved" || row.review.kind === "changes_requested")
    fail("Save a revision before changing this decision.");
  if (command.decision === "changes_requested")
    text(command.note, "Feedback", 4000);
  const review =
    command.decision === "approved"
      ? { kind: "approved" as const, reviewer: actor.subject, at: Date.now() }
      : {
          kind: "changes_requested" as const,
          reviewer: actor.subject,
          at: Date.now(),
          note: command.note,
        };
  await ctx.db.patch(row._id, { review });
  return saved({ ...row, review }, topic);
}
