"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatUtcDateTime } from "./workspace-time";

const runLabels = {
  queued: "Waiting to start",
  running: "Research in progress",
  succeeded: "Sources ready",
  partial: "Partial results available",
  failed: "Research needs attention",
  cancelled: "Research cancelled",
} satisfies Record<Doc<"researchRuns">["state"]["kind"], string>;

type TopicRunsData = Extract<
  FunctionReturnType<typeof api.research.read>,
  { kind: "topic_runs" }
>;
type ResearchRun = TopicRunsData["runs"][number];

export function ResearchExecution({ topicId }: { topicId: string }) {
  const data = useQuery(api.research.read, {
    command: { kind: "topic_runs", topicId },
  });
  if (!data || data.kind !== "topic_runs")
    return (
      <p role="status" className="my-4 text-xs text-muted-foreground">
        Loading research status…
      </p>
    );
  return <ResearchExecutionContent data={data} />;
}

function ResearchExecutionContent({ data }: { data: TopicRunsData }) {
  const write = useMutation(api.research.write);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const current = data.runs.find((run) => run._id === selected) ?? data.runs[0];
  const running = data.runs.some(
    (run) => run.state.kind === "queued" || run.state.kind === "running",
  );
  async function act(kind: "cancel_run" | "retry_run") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (current) await write({ command: { kind, runId: current._id } });
    } catch {
      setError("Could not complete the request. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (!current) return null;
  return (
    <section className="my-4 text-sm" aria-label="Research activity">
      <ResearchStatus current={current} running={running} />
      <details className="text-xs text-muted-foreground">
        <summary className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 focus-visible:outline-2">
          Research activity <ArrowUpRight size={12} aria-hidden />
        </summary>
        <div className="mt-2 space-y-4 border-l border-border pl-4">
          <p className="max-w-lg leading-6">
            Your agent explores sources and saves the research above. You can
            also gather background material here for your agent to use.
          </p>
          <CurrentRun
            current={current}
            busy={busy}
            setupReady={data.setup.kind === "ready"}
            selected={selected}
            onAct={act}
            onSelect={setSelected}
          />
          <PreviousRuns runs={data.runs} onSelect={setSelected} />
          {selected ? <Packet runId={selected} /> : null}
        </div>
      </details>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ResearchStatus({
  current,
  running,
}: {
  current: ResearchRun;
  running: boolean;
}) {
  if (running)
    return (
      <div
        role="status"
        className="flex items-center gap-2 py-2 text-muted-foreground"
      >
        <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />
        Gathering research and sources…
      </div>
    );
  if (current.state.kind !== "partial" && current.state.kind !== "failed")
    return null;
  return (
    <p role="status" className="py-2 text-muted-foreground">
      {runLabels[current.state.kind]}. Open activity for details.
    </p>
  );
}

function CurrentRun({
  current,
  busy,
  setupReady,
  selected,
  onAct,
  onSelect,
}: {
  current: ResearchRun;
  busy: boolean;
  setupReady: boolean;
  selected: string | null;
  onAct: (kind: "cancel_run" | "retry_run") => Promise<void>;
  onSelect: (runId: string | null) => void;
}) {
  const active =
    current.state.kind === "queued" || current.state.kind === "running";
  const canRetry =
    !active &&
    current.state.kind !== "succeeded" &&
    (current.state.kind !== "cancelled" || current.occupied);
  const expanded = selected === current._id;
  return (
    <div className="space-y-3">
      <p>{runLabels[current.state.kind]}</p>
      {current.cancellation !== "not_requested" ? (
        <p>Cancellation requested</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {current.occupied ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void onAct("cancel_run")}
          >
            Cancel
          </Button>
        ) : null}
        {canRetry ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy || current.recoveries >= 3 || !setupReady}
            onClick={() => void onAct("retry_run")}
          >
            Try again
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSelect(expanded ? null : current._id)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide results" : "View results"}
        </Button>
      </div>
      <p className="leading-6">
        Background results still need your agent’s assessment.
      </p>
    </div>
  );
}

function PreviousRuns({
  runs,
  onSelect,
}: {
  runs: ResearchRun[];
  onSelect: (runId: string) => void;
}) {
  if (runs.length <= 1) return null;
  return (
    <details>
      <summary className="min-h-9 cursor-pointer py-2">
        Previous investigations
      </summary>
      <ul className="space-y-2">
        {runs.map((run) => (
          <li key={run._id}>
            <button
              className="min-h-9 text-left underline underline-offset-4"
              onClick={() => onSelect(run._id)}
            >
              {run.question} · {runLabels[run.state.kind]}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
function Packet({ runId }: { runId: string }) {
  const data = useQuery(api.research.read, {
    command: { kind: "get_research_packet", runId },
  });
  if (!data || data.kind !== "packet")
    return (
      <p role="status" className="mt-4 text-sm">
        Loading sources…
      </p>
    );
  const evidenceCounts = { retrieved: 0, pending: 0, failed: 0 };
  for (const item of data.evidence) evidenceCounts[item.outcome.kind] += 1;
  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      <p className="whitespace-pre-wrap text-sm">{data.run.question}</p>
      {data.run.plan ? (
        <details>
          <summary className="text-sm">Supplied plan</summary>
          <p className="whitespace-pre-wrap text-sm">{data.run.plan.scope}</p>
          <ul className="list-disc pl-5 text-sm">
            {data.run.plan.subquestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {data.packet ? (
        <>
          <h3 className="text-sm font-medium">
            Collected findings · ready for your agent
          </h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-7">
            {data.packet.findings}
          </p>
          {data.packet.gaps.length ? (
            <div>
              <h4 className="text-sm font-medium">Coverage gaps</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {data.packet.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <h4 className="text-sm font-medium">
            Sources ·{" "}
            {evidenceCounts.retrieved} retrieved, {evidenceCounts.pending}{" "}
            pending, {evidenceCounts.failed} failed
          </h4>
          <p className="text-xs text-muted-foreground">
            Check each source against its finding. Saving a source does not
            verify the claim. Long sources may be excerpted.
          </p>
          <ul className="space-y-3">
            {data.evidence.map((e) => (
              <li key={e._id}>
                <Evidence row={e} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Findings will appear here when the search finishes.
        </p>
      )}
    </div>
  );
}
function Evidence({ row }: { row: Doc<"researchEvidence"> }) {
  const [open, setOpen] = useState(false);
  const data = useQuery(
    api.research.read,
    open ? { command: { kind: "get_evidence", evidenceId: row._id } } : "skip",
  );
  return (
    <div className="rounded-md bg-secondary/40 p-3 text-sm">
      <a
        href={row.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="break-words underline underline-offset-4"
      >
        {row.title || row.originalUrl}
      </a>
      <p className="mt-1 text-xs capitalize text-muted-foreground">
        {row.outcome.kind}
        {row.publishedAt
          ? ` · Published: ${row.publishedAt}`
          : " · Publication time unknown"}
      </p>
      {row.outcome.kind === "failed" ? (
        <p className="mt-1 text-xs">This source couldn’t be retrieved.</p>
      ) : null}
      {row.outcome.kind === "retrieved" ? (
        <>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            Retrieved {formatUtcDateTime(row.outcome.retrievedAt)}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            {open ? "Hide source access" : "Read stored source"}
          </Button>
        </>
      ) : null}
      {open && !data ? (
        <p role="status" className="mt-2 text-xs">
          Loading source…
        </p>
      ) : null}
      {open && data?.kind === "evidence" && data.contentUrl ? (
        <a
          className="ms-3 text-xs underline"
          href={data.contentUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open text
        </a>
      ) : null}
    </div>
  );
}
