import { ConvexError, type Infer } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { readCommand, writeCommand, writeResult } from "./validators";

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
      return {
        kind: "project" as const,
        project,
        topics: await ctx.db
          .query("topics")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .order("desc")
          .take(100),
      };
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
      return { kind: "topic" as const, topic, research, scripts };
    }
  }
}
export async function writeWorkflow(
  ctx: MutationCtx,
  actor: Actor,
  command: Infer<typeof writeCommand>,
): Promise<Result> {
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
    text(command.summary, "Summary", 20000);
    if (!command.claims.length || command.claims.length > 50)
      fail("Research needs 1–50 findings.");
    for (const claim of command.claims) {
      text(claim.text, "Finding", 4000);
      if (claim.note.length > 4000 || claim.evidence.length > 10)
        fail("Finding is too large.");
      for (const source of claim.evidence) {
        text(source.title, "Source title", 500);
        text(source.excerpt, "Excerpt", 8000);
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
    if (new TextEncoder().encode(researchContent(command)).byteLength > 200000)
      fail("Research is too large.");
    const latest = await latestResearch(ctx, topic._id);
    if (latest && researchContent(latest) === researchContent(command))
      return saved(latest, topic);
    if (command.baseId !== undefined && command.baseId !== latest?._id)
      fail(
        "Research changed while you were editing. Reopen the latest document.",
      );
    const id = await ctx.db.insert("researchVersions", {
      topicId: topic._id,
      summary: command.summary,
      claims: command.claims,
      review: { kind: "pending" },
    });
    return saved({ _id: id, review: { kind: "pending" } }, topic);
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
