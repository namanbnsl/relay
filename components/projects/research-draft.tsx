"use client";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentPrompt, useDraftProtection } from "./workspace-interactions";
import { ResearchExecution } from "./research-execution";

type Draft = Pick<
  Doc<"researchDrafts">,
  "revision" | "plan" | "openQuestions" | "summary" | "findings"
>;
const empty: Draft = {
  revision: 0,
  plan: "",
  openQuestions: [],
  summary: "",
  findings: [],
};
export function ResearchDraft({
  topic,
  draft,
  submitted,
  sources,
  children,
}: {
  topic: Doc<"topics">;
  draft: Doc<"researchDrafts"> | null;
  submitted?: Doc<"researchVersions">;
  sources: Doc<"workspaceSources">[];
  children: ReactNode;
}) {
  const write = useMutation(api.relay.write);
  const available = useQuery(api.sources.available, { topicId: topic._id });
  const [local, setLocal] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = local ?? draft ?? empty;
  const dirty = local !== null;
  const conflict = dirty && current.revision !== (draft?.revision ?? 0);
  useDraftProtection(dirty);
  const state =
    submitted && draft && submitted.draftRevision === draft.revision
      ? submitted.review.kind === "pending"
        ? "Ready for review"
        : submitted.review.kind === "approved"
          ? "Approved"
          : "Changes requested"
      : "Research";
  function edit(patch: Partial<Draft>) {
    setLocal({ ...current, ...patch });
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await write({
        command: {
          kind: "save_research_draft",
          topicId: topic._id,
          expectedRevision: current.revision,
          plan: current.plan,
          openQuestions: current.openQuestions.filter((q) => q.trim()),
          summary: current.summary,
          findings: current.findings,
        },
      });
      setLocal(null);
    } catch (e) {
      setError(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : "Could not save. Your local edits are still here; read the latest state before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section aria-label="Research document" className="min-w-0 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            Research{" "}
            <span className="ms-2 text-xs font-normal text-muted-foreground">
              {state}
              {dirty ? " · Unsaved edits" : ""}
            </span>
          </h2>
          <AgentPrompt
            prompt={`Research the Relay topic “${topic.title}” (topic ID ${topic._id}) in project ${topic.projectId}. Investigate: ${topic.question} Read the current document and human feedback with get_topic. Use search_sources and read_sources to inspect evidence, and commission focused work with start_research when needed. Resolve important gaps and save_research with the current revision for review. Keep stable finding IDs and evidence references, and never write paraphrases as retrieved excerpts. Continue through research, waiting for results, evidence inspection, synthesis and saving without asking me to manage intermediate steps. Ask only when ambiguity materially changes the investigation. Human approval remains separate.`}
          />
        </div>
        {submitted?.review.kind === "changes_requested" ? (
          <p className="mb-5 rounded-lg border border-border p-4 text-sm leading-6">
            <strong>Review feedback:</strong> {submitted.review.note}
          </p>
        ) : null}
        {conflict ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-border p-4 text-sm leading-6"
          >
            A newer version is available. Your edits have been kept. Copy any
            changes you need before loading the latest version.
            <Button
              className="mt-2"
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    "Discard your local edits and load the latest version?",
                  )
                )
                  setLocal(null);
              }}
            >
              Load latest version
            </Button>
          </div>
        ) : null}
        <fieldset disabled={busy} className="space-y-6">
          <details className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Plan & open questions
            </summary>
            <label className="mt-4 block text-sm">
              Short research plan
              <Textarea
                className="mt-2 min-h-24"
                value={current.plan}
                maxLength={8000}
                onChange={(e) => edit({ plan: e.target.value })}
              />
            </label>
            <label className="mt-4 block text-sm">
              Open questions{" "}
              <span className="text-muted-foreground">(one per line)</span>
              <Textarea
                className="mt-2 min-h-24"
                value={current.openQuestions.join("\n")}
                maxLength={40000}
                onChange={(e) =>
                  edit({ openQuestions: e.target.value.split("\n") })
                }
              />
            </label>
          </details>
          <label className="block text-sm font-medium">
            Summary
            <Textarea
              className="mt-3 min-h-56 text-sm leading-7"
              placeholder="Your research will appear here. You can also start writing."
              value={current.summary}
              maxLength={20000}
              onChange={(e) => edit({ summary: e.target.value })}
            />
          </label>
          <div className="space-y-5">
            <h3 className="text-sm font-medium">Findings</h3>
            {current.findings.map((f) => (
              <article
                key={f.id}
                className="rounded-lg border border-border p-4"
              >
                <label className="block text-sm">
                  Finding
                  <Textarea
                    className="mt-2 leading-7"
                    value={f.text}
                    maxLength={4000}
                    onChange={(e) =>
                      edit({
                        findings: current.findings.map((x) =>
                          x.id === f.id ? { ...x, text: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </label>
                <label className="mt-3 block text-sm">
                  Assessment
                  <select
                    className="mt-2 block min-h-10 w-full rounded-md border border-input bg-background px-3"
                    value={f.assessment}
                    onChange={(e) => {
                      const assessment = e.target.value;
                      if (
                        assessment === "supported" ||
                        assessment === "disputed" ||
                        assessment === "uncertain"
                      )
                        edit({
                          findings: current.findings.map((x) =>
                            x.id === f.id ? { ...x, assessment } : x,
                          ),
                        });
                    }}
                  >
                    <option value="uncertain">Uncertain</option>
                    <option value="supported">Supported</option>
                    <option value="disputed">Disputed</option>
                  </select>
                </label>
                <label className="mt-3 block text-sm">
                  Notes
                  <Textarea
                    className="mt-2"
                    value={f.note}
                    maxLength={4000}
                    onChange={(e) =>
                      edit({
                        findings: current.findings.map((x) =>
                          x.id === f.id ? { ...x, note: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </label>
                <div className="mt-3 space-y-2">
                  {f.evidenceIds.map((id) => (
                    <div key={id}>
                      <DraftEvidence topicId={topic._id} evidenceId={id} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          edit({
                            findings: current.findings.map((x) =>
                              x.id === f.id
                                ? {
                                    ...x,
                                    evidenceIds: x.evidenceIds.filter(
                                      (e) => e !== id,
                                    ),
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        Detach evidence
                      </Button>
                    </div>
                  ))}
                </div>
                <label className="mt-3 block text-xs">
                  Attach retrieved evidence
                  <select
                    className="mt-2 block min-h-10 w-full rounded-md border border-input bg-background px-3"
                    value=""
                    onChange={(e) => {
                      const source = available?.find(
                        (s) => s.id === e.target.value,
                      );
                      if (source && !f.evidenceIds.includes(source.id))
                        edit({
                          findings: current.findings.map((x) =>
                            x.id === f.id
                              ? {
                                  ...x,
                                  evidenceIds: [...x.evidenceIds, source.id],
                                }
                              : x,
                          ),
                        });
                    }}
                    disabled={f.evidenceIds.length >= 10}
                  >
                    <option value="">Select supporting source…</option>
                    {available?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                {f.verification ? (
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    Agent-reported verification · {f.verification.model}:{" "}
                    {f.verification.verdict}. Finding revision{" "}
                    {f.verification.findingRevision}. Relay did not execute this
                    verification. Changes invalidate its applicability on save.
                  </p>
                ) : null}
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() =>
                    edit({
                      findings: current.findings.filter((x) => x.id !== f.id),
                    })
                  }
                >
                  Remove finding
                </Button>
              </article>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                edit({
                  findings: [
                    ...current.findings,
                    {
                      id: crypto.randomUUID(),
                      revision: current.revision + 1,
                      text: "",
                      note: "",
                      assessment: "uncertain",
                      evidenceIds: [],
                    },
                  ],
                })
              }
              disabled={current.findings.length >= 50}
            >
              Add finding
            </Button>
          </div>
        </fieldset>
        {error ? (
          <p role="alert" className="mt-4 text-sm">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            disabled={busy || !dirty || conflict}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save research"}
          </Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Saving makes this version ready for review.
        </p>
        {children}
      </section>
      <aside className="min-w-0 py-6">
        <details className="border-b border-border pb-5">
          <summary className="cursor-pointer text-sm font-medium">
            Sources
          </summary>
          {available?.map((e) => (
            <div key={e.id} className="mt-3">
              <p className="text-xs font-medium break-words">{e.title}</p>
              <DraftEvidence topicId={topic._id} evidenceId={e.id} />
            </div>
          ))}
          <p className="my-3 text-xs leading-5 text-muted-foreground">
            Retrieved evidence supports findings. Search excerpts and provider
            output are unverified.
          </p>
          {sources.length ? (
            sources.map((s) => (
              <details key={s._id} className="my-3 text-sm">
                <summary className="cursor-pointer break-words">
                  {s.title}
                </summary>
                <a
                  className="mt-2 block break-all underline"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source
                </a>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-6">
                  Search excerpt: {s.excerpt || "No excerpt available."}
                </p>
              </details>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              Search with your connected agent to collect sources.
            </p>
          )}
        </details>
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium">
            Activity
          </summary>
          <ResearchExecution topicId={topic._id} />
        </details>
      </aside>
    </div>
  );
}
export function DraftEvidence({
  topicId,
  evidenceId,
}: {
  topicId: string;
  evidenceId: string;
}) {
  const [open, setOpen] = useState(false);
  const data = useQuery(
    api.sources.evidence,
    open ? { topicId, evidenceId } : "skip",
  );
  return (
    <details
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="text-xs"
    >
      <summary className="min-h-9 cursor-pointer py-2">
        Supporting evidence
      </summary>
      {data ? (
        <div className="space-y-2 leading-6">
          <a
            className="break-words underline"
            href={data.url}
            target="_blank"
            rel="noreferrer"
          >
            {data.title}
          </a>
          <p className="whitespace-pre-wrap">{data.excerpt}</p>
          {data.contentUrl ? (
            <a
              className="underline"
              href={data.contentUrl}
              target="_blank"
              rel="noreferrer"
            >
              Read retrieved content
            </a>
          ) : null}
          <p className="text-muted-foreground">
            Retrieved content · not independently verified
          </p>
        </div>
      ) : (
        <p>Loading evidence…</p>
      )}
    </details>
  );
}
