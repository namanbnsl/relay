import { ConvexError, type Infer } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
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
function expected(value: number) {
  if (!Number.isSafeInteger(value) || value < 0)
    fail("Invalid expected version.");
}
export async function projectFor(ctx: Reader, subject: string, value: string) {
  const id = ctx.db.normalizeId("projects", value);
  const project = id ? await ctx.db.get(id) : null;
  if (!project || project.owner !== subject) fail("Project not found.");
  return project;
}
async function topicFor(ctx: Reader, subject: string, value: string) {
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
async function latestResearch(
  ctx: Reader,
  row: Pick<Doc<"researchVersions">, "topicId" | "investigationId">,
) {
  return ctx.db
    .query("researchVersions")
    .withIndex("by_investigation", (q) =>
      q.eq("topicId", row.topicId).eq("investigationId", row.investigationId),
    )
    .order("desc")
    .first();
}
async function currentApprovedResearch(
  ctx: Reader,
  subject: string,
  value: string,
) {
  const { row, topic } = await researchFor(ctx, subject, value);
  if (
    row.review.kind !== "approved" ||
    (await latestResearch(ctx, row))?._id !== row._id
  )
    fail("Use the current approved research version.");
  return { row, topic };
}
function validateResearch(
  row: Pick<Doc<"researchVersions">, "summary" | "claims">,
) {
  text(row.summary, "Summary", 20000);
  if (!row.claims.length || row.claims.length > 50)
    fail("Research needs 1–50 evidence-backed claims.");
  for (const claim of row.claims) {
    text(claim.text, "Claim", 4000);
    if (claim.assessment !== "supported" || !claim.evidence.length)
      fail("Resolve unsupported claims and attach evidence before review.");
  }
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
      const investigationId = command.investigationId;
      const researchQuery =
        investigationId === undefined
          ? ctx.db
              .query("researchVersions")
              .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
          : ctx.db
              .query("researchVersions")
              .withIndex("by_investigation", (q) =>
                q
                  .eq("topicId", topic._id)
                  .eq("investigationId", investigationId),
              );
      const [research, scripts] = await Promise.all([
        researchQuery.order("desc").take(10),
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
  if ("requestId" in command) text(command.requestId, "Request ID", 128);
  if ("expectedVersion" in command) expected(command.expectedVersion);
  if (command.kind === "create_project") {
    text(command.name, "Project name", 160);
    if (command.description.length > 2000) fail("Description is too long.");
    const old = await ctx.db
      .query("projects")
      .withIndex("by_owner_request", (q) =>
        q.eq("owner", actor.subject).eq("requestId", command.requestId),
      )
      .unique();
    if (
      old &&
      (old.name !== command.name || old.description !== command.description)
    )
      fail("Request ID already used for different content.");
    const id =
      old?._id ??
      (await ctx.db.insert("projects", {
        owner: actor.subject,
        name: command.name,
        description: command.description,
        requestId: command.requestId,
      }));
    return {
      id,
      projectId: id,
      topicId: null,
      version: null,
      status: "created",
    };
  }
  if (command.kind === "create_topic") {
    const project = await projectFor(ctx, actor.subject, command.projectId);
    text(command.title, "Title", 160);
    text(command.question, "Question", 2000);
    if (command.outline.length > 10000) fail("Outline is too long.");
    const old = await ctx.db
      .query("topics")
      .withIndex("by_project_request", (q) =>
        q.eq("projectId", project._id).eq("requestId", command.requestId),
      )
      .unique();
    if (
      old &&
      (old.title !== command.title ||
        old.question !== command.question ||
        old.outline !== command.outline)
    )
      fail("Request ID already used for different content.");
    const id =
      old?._id ??
      (await ctx.db.insert("topics", {
        projectId: project._id,
        title: command.title,
        question: command.question,
        outline: command.outline,
        requestId: command.requestId,
      }));
    return {
      id,
      projectId: project._id,
      topicId: id,
      version: null,
      status: "created",
    };
  }
  if (command.kind === "save_research") {
    const topic = await topicFor(ctx, actor.subject, command.topicId);
    text(command.investigationId, "Investigation ID", 128);
    text(command.summary, "Summary", 20000);
    if (command.claims.length > 50) fail("At most 50 claims per version.");
    for (const claim of command.claims) {
      text(claim.text, "Claim", 4000);
      if (claim.note.length > 4000 || claim.evidence.length > 10)
        fail("Claim is too large.");
      for (const evidence of claim.evidence) {
        text(evidence.title, "Source title", 500);
        text(evidence.excerpt, "Excerpt", 8000);
        let url: URL;
        try {
          url = new URL(evidence.url);
        } catch {
          fail("Invalid evidence URL.");
        }
        if (
          !["http:", "https:"].includes(url.protocol) ||
          evidence.url.length > 2048
        )
          fail("Evidence requires an HTTP(S) URL.");
        if (
          !Number.isFinite(evidence.retrievedAt) ||
          evidence.retrievedAt < 0 ||
          evidence.retrievedAt > Date.now() + 60000
        )
          fail("Invalid retrieval time.");
      }
    }
    if (new TextEncoder().encode(JSON.stringify(command)).byteLength > 200000)
      fail("Research version is too large.");
    const old = await ctx.db
      .query("researchVersions")
      .withIndex("by_request", (q) =>
        q.eq("topicId", topic._id).eq("requestId", command.requestId),
      )
      .unique();
    if (old) {
      if (
        old.version !== command.expectedVersion + 1 ||
        old.investigationId !== command.investigationId ||
        old.summary !== command.summary ||
        JSON.stringify(old.claims) !== JSON.stringify(command.claims)
      )
        fail("Request ID already used for different content.");
      return {
        id: old._id,
        projectId: topic.projectId,
        topicId: topic._id,
        version: old.version,
        status: old.review.kind,
      };
    }
    const latest = await latestResearch(ctx, {
      topicId: topic._id,
      investigationId: command.investigationId,
    });
    if ((latest?.version ?? 0) !== command.expectedVersion)
      fail("Version conflict. Reload the latest research before saving.");
    const version = command.expectedVersion + 1;
    const id = await ctx.db.insert("researchVersions", {
      topicId: topic._id,
      investigationId: command.investigationId,
      version,
      summary: command.summary,
      claims: command.claims,
      requestId: command.requestId,
      review: { kind: "draft" },
    });
    return {
      id,
      projectId: topic.projectId,
      topicId: topic._id,
      version,
      status: "draft",
    };
  }
  if (command.kind === "save_script") {
    const topic = await topicFor(ctx, actor.subject, command.topicId);
    const source = await researchFor(
      ctx,
      actor.subject,
      command.researchVersionId,
    );
    if (source.topic._id !== topic._id)
      fail("Research belongs to another topic.");
    text(command.title, "Script title", 160);
    if (
      !command.scenes.length ||
      command.scenes.length > 100 ||
      new TextEncoder().encode(JSON.stringify(command.scenes)).byteLength >
        200000
    )
      fail("A script needs 1–100 scenes within 200,000 bytes.");
    for (const scene of command.scenes) {
      text(scene.narration, "Narration", 10000);
      text(scene.visual, "Visual plan", 10000);
    }
    const old = await ctx.db
      .query("scriptVersions")
      .withIndex("by_request", (q) =>
        q.eq("topicId", topic._id).eq("requestId", command.requestId),
      )
      .unique();
    if (old) {
      if (
        old.version !== command.expectedVersion + 1 ||
        old.researchVersionId !== source.row._id ||
        old.title !== command.title ||
        JSON.stringify(old.scenes) !== JSON.stringify(command.scenes)
      )
        fail("Request ID already used for different content.");
      return {
        id: old._id,
        projectId: topic.projectId,
        topicId: topic._id,
        version: old.version,
        status: old.review.kind,
      };
    }
    await currentApprovedResearch(ctx, actor.subject, source.row._id);
    const latest = await ctx.db
      .query("scriptVersions")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .order("desc")
      .first();
    if ((latest?.version ?? 0) !== command.expectedVersion)
      fail("Version conflict. Reload the latest script before saving.");
    const version = command.expectedVersion + 1;
    const id = await ctx.db.insert("scriptVersions", {
      topicId: topic._id,
      researchVersionId: source.row._id,
      title: command.title,
      scenes: command.scenes,
      version,
      requestId: command.requestId,
      review: { kind: "draft" },
    });
    return {
      id,
      projectId: topic.projectId,
      topicId: topic._id,
      version,
      status: "draft",
    };
  }
  const humanReview =
    command.kind === "review_research" || command.kind === "review_script";
  if (humanReview && actor.channel !== "web")
    fail("Human review is only available in Relay.");
  const research =
    command.kind === "submit_research" || command.kind === "review_research";
  const id = research
    ? ctx.db.normalizeId("researchVersions", command.versionId)
    : ctx.db.normalizeId("scriptVersions", command.versionId);
  const row = id ? await ctx.db.get(id) : null;
  if (!row) fail("Version not found.");
  const topic = await topicFor(ctx, actor.subject, row.topicId);
  if ("investigationId" in row) {
    if ((await latestResearch(ctx, row))?._id !== row._id)
      fail("Review the latest research version.");
    if (!humanReview || command.decision === "approved") validateResearch(row);
  } else {
    const latest = await ctx.db
      .query("scriptVersions")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .order("desc")
      .first();
    if (latest?._id !== row._id) fail("Review the latest script version.");
    if (!humanReview || command.decision === "approved")
      await currentApprovedResearch(ctx, actor.subject, row.researchVersionId);
  }
  if (humanReview) {
    if (row.review.kind === command.decision)
      return {
        id: row._id,
        projectId: topic.projectId,
        topicId: topic._id,
        version: row.version,
        status: row.review.kind,
      };
    if (row.review.kind !== "in_review")
      fail("Submit this version for review first.");
    if (command.decision === "changes_requested")
      text(command.note, "Review note", 4000);
    await ctx.db.patch(row._id, {
      review:
        command.decision === "approved"
          ? { kind: "approved", reviewer: actor.subject, at: Date.now() }
          : {
              kind: "changes_requested",
              reviewer: actor.subject,
              at: Date.now(),
              note: command.note,
            },
    });
  } else {
    if (row.review.kind === "changes_requested")
      fail("Save a revised version before submitting again.");
    if (row.review.kind === "draft")
      await ctx.db.patch(row._id, { review: { kind: "in_review" } });
  }
  return {
    id: row._id,
    projectId: topic.projectId,
    topicId: topic._id,
    version: row.version,
    status: humanReview
      ? command.decision
      : row.review.kind === "draft"
        ? "in_review"
        : row.review.kind,
  };
}
