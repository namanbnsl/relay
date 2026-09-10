import type { Infer } from "convex/values";
import type {
  publicRunResult,
  researchReadResult,
} from "../convex/model/researchContracts";
import {
  evidenceProgress,
  evidenceNextAction,
  isActive,
} from "../convex/model/researchContracts";
import type { sourceResult } from "../convex/model/draftContracts";
import type { readResult } from "../convex/model/validators";

export const researchInstructions =
  "When asked to research and save, continue through topic selection or creation, search, retrieval, evidence inspection, synthesis and save_research without routine permission questions. Ask only when ambiguity materially changes the investigation. Interpret current/latest relative to today's date; do not silently narrow to old years. Use focused provider tasks where helpful, read the actual evidence, challenge important provider claims with primary sources and resolve material gaps. Write coherent research with atomic cited findings. Search snippets and provider reports are leads, not inspected evidence. Never fabricate excerpts or discard citations to bypass an error. Save automatically and return a short summary and link saying Research is ready for your review. Human approval is separate and applies to the exact saved version. While work runs, use bounded waiting and respect retryAfterSeconds; clients are not guaranteed to resume after disconnect.";

type Run = Infer<typeof publicRunResult>;
type CurrentResearchResult = Infer<typeof researchReadResult>;
type RunResult = Extract<CurrentResearchResult, { kind: "run" }>;
type PacketResult = Extract<CurrentResearchResult, { kind: "packet" }>;
// The web and Convex deployments can be updated independently. The read boundary
// accepts the previous wire shape without asserting that missing counts are zero.
export type ResearchResult =
  | Exclude<CurrentResearchResult, { kind: "run" | "packet" }>
  | (Omit<RunResult, "progress"> & Partial<Pick<RunResult, "progress">>)
  | (Omit<PacketResult, "progress" | "unresolvedReferences"> &
      Partial<Pick<PacketResult, "progress" | "unresolvedReferences">>);

export function compactRun(run: Run) {
  const status = run.state.kind;
  const pending = status === "queued" || status === "running";
  return {
    runId: run._id,
    topicId: run.topicId,
    status,
    stage: run.stage,
    executionComplete: !pending,
    ...(pending ? { retryAfterSeconds: 20 } : {}),
    ...("reason" in run.state ? { reason: run.state.reason } : {}),
    ...(run.actualDollars !== undefined
      ? { providerReportedDollars: run.actualDollars }
      : {}),
    path: run.path,
    nextAction: pending
      ? "Use get_research_packet with waitSeconds: 20. Do not rapidly poll or ask permission to continue the requested research."
      : status === "succeeded" || status === "partial"
        ? "Read the available source content, investigate material gaps, then save_research. Do not claim provider findings are verified."
        : "Inspect the failure or cancellation before deciding whether recovery is appropriate.",
  };
}

export function compactResearch(result: ResearchResult) {
  if (result.kind === "run") {
    if (!result.progress)
      return {
        ...compactRun(result.run),
        ready: false,
        readiness: "unknown",
        evidenceCounts: null,
        nextAction:
          "Read get_research_packet for evidence counts and source text. This backend does not include counts in get_run; do not infer retrieval readiness from execution status.",
      };
    return {
      ...compactRun(result.run),
      ready: result.progress.readiness === "ready_for_synthesis",
      readiness: result.progress.readiness,
      evidenceCounts: {
        retrieved: result.progress.retrieved,
        pending: result.progress.pending,
        failed: result.progress.failed,
      },
      nextAction: result.progress.nextAction,
    };
  }
  if (result.kind === "topic_runs")
    return { runs: result.runs.map(compactRun), setup: result.setup };
  if (result.kind === "evidence") {
    const e = result.evidence;
    return {
      evidenceId: e._id,
      url: "url" in e ? e.url : e.canonicalUrl,
      title: e.title,
      status: "outcome" in e ? e.outcome.kind : "retrieved",
      content:
        result.content ??
        ("content" in e ? e.content.slice(0, 20000) : undefined),
      truncated: result.truncated ?? false,
      nextOffset: result.nextOffset,
      contentLength: result.contentLength,
      contentUrl: result.contentUrl,
      nextAction: result.nextAction,
      warning: result.warning,
    };
  }
  const retrieved = result.evidence.filter(
    (e) => e.outcome.kind === "retrieved",
  );
  const pending = result.evidence.filter((e) => e.outcome.kind === "pending");
  const failed = result.evidence.filter((e) => e.outcome.kind === "failed");
  const progress =
    result.progress ?? evidenceProgress(result.run, result.evidence);
  const ready = progress.readiness === "ready_for_synthesis";
  return {
    ...compactRun(result.run),
    ready,
    readiness: progress.readiness,
    evidenceCounts: {
      retrieved: retrieved.length,
      pending: pending.length,
      failed: failed.length,
    },
    // Avoid serving a provisional report as the answer while retrieval is pending.
    findings:
      progress.readiness !== "running" && pending.length === 0
        ? (result.packet?.findings ?? null)
        : null,
    sources: retrieved.map((e) => {
      const source = result.sourceContent?.find((s) => s.evidenceId === e._id);
      return {
        evidenceId: e._id,
        url: e.canonicalUrl,
        title: e.title,
        publishedAt: e.publishedAt,
        content: source?.content,
        truncated: source?.truncated ?? true,
      };
    }),
    unavailableSources:
      result.unresolvedReferences ??
      result.evidence.flatMap((e) =>
        e.outcome.kind === "retrieved"
          ? []
          : [
              {
                evidenceId: e._id,
                url: e.canonicalUrl,
                status: e.outcome.kind,
                ...("reason" in e.outcome ? { reason: e.outcome.reason } : {}),
                nextAction: evidenceNextAction(
                  e.outcome,
                  isActive(result.run.state),
                  e.attempts,
                ),
              },
            ],
      ),
    gaps: result.packet?.gaps ?? [],
    verification: "not_independently_verified",
    nextAction: progress.nextAction,
  };
}

export function compactTopic(result: Infer<typeof readResult>) {
  if (result.kind === "projects")
    return {
      projects: result.projects.map((p) => ({ id: p._id, name: p.name })),
      nextAction:
        "Use get_project to find the topic, or create a topic for the requested investigation.",
    };
  if (result.kind === "project")
    return {
      project: { id: result.project._id, name: result.project.name },
      topics: result.topics.map((t) => ({
        id: t._id,
        title: t.title,
        question: t.question,
      })),
      nextAction:
        "Read the matching topic or create one, then continue the requested research.",
    };
  const current = result.research[0];
  return {
    topic: {
      id: result.topic._id,
      projectId: result.topic.projectId,
      title: result.topic.title,
      question: result.topic.question,
    },
    research: current
      ? {
          versionId: current._id,
          revision: current.draftRevision,
          summary: current.summary,
          review: current.review,
          findings: current.findings?.map((f) => ({
            id: f.id,
            text: f.text,
            assessment: f.assessment,
            note: f.note,
            evidenceIds: f.evidenceIds,
          })),
          ...(current.findings?.every((f) => f.evidenceIds.length)
            ? {}
            : { claims: current.claims }),
          citations: current.claims.map((c) => ({
            text: c.text,
            sources: c.evidence.map((e) => ({ url: e.url, title: e.title })),
          })),
        }
      : null,
    expectedRevision: result.draft?.revision ?? 0,
    // Preserve pre-existing unsaved work without returning a second full document.
    recoveredWork:
      !current && result.draft
        ? { summary: result.draft.summary, findings: result.draft.findings }
        : undefined,
    script: result.scripts[0]
      ? {
          versionId: result.scripts[0]._id,
          title: result.scripts[0].title,
          scenes: result.scripts[0].scenes,
          review: result.scripts[0].review,
        }
      : null,
    runs: result.runs.slice(0, 5).map(compactRun),
    sources: result.sources
      .slice(0, 20)
      .map((s) => ({ sourceId: s._id, url: s.url, title: s.title })),
    nextAction:
      "Continue the requested investigation using search_sources/read_sources or focused start_research. Save your sourced synthesis with save_research; no draft or submission step is required. Human approval remains in Relay.",
  };
}

export function compactSources(result: Infer<typeof sourceResult>) {
  if (result.kind === "search_excerpts")
    return {
      sources: result.sources.map((s) => ({
        sourceId: s._id,
        url: s.url,
        title: s.title,
        excerpt: s.excerpt,
      })),
      warning: result.warning,
      nextAction:
        "Select relevant sources and call read_sources. Search excerpts are leads, not retrieved evidence.",
    };
  return {
    evidence: result.evidence.map((e) => ({
      evidenceId: e._id,
      url: e.url,
      title: e.title,
      content: e.content.slice(0, 20000),
      truncated: e.content.length > 20000,
      retrievedAt: e.retrievedAt,
    })),
    failures: result.failures,
    warning: result.warning,
    nextAction:
      "Read this evidence, investigate important gaps, then save_research with evidenceIds. Use get_evidence for fuller text. Never fill excerpt fields with paraphrases.",
  };
}

/** Bounded server-side waiting: callers receive one useful result, not repeated snapshots. */
export async function waitForResearch<T>({
  read,
  isPending,
  waitSeconds,
  signal,
}: {
  read: () => Promise<T>;
  isPending: (value: T) => boolean;
  waitSeconds: number;
  signal?: AbortSignal;
}): Promise<T> {
  const deadline = Date.now() + Math.max(0, Math.min(20, waitSeconds)) * 1000;
  let result = await read();
  while (isPending(result) && !signal?.aborted && Date.now() < deadline) {
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", finish);
        resolve();
      };
      const timer = setTimeout(finish, Math.min(4000, deadline - Date.now()));
      signal?.addEventListener("abort", finish, { once: true });
    });
    if (signal?.aborted) break;
    result = await read();
  }
  return result;
}
