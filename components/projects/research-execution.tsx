"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { ArrowUpRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";

const runLabels = {
  queued: "Waiting to start",
  running: "Research in progress",
  succeeded: "Background sources ready",
  partial: "Partial results available",
  failed: "Research needs attention",
  cancelled: "Research cancelled",
} satisfies Record<Doc<"researchRuns">["state"]["kind"], string>;

export function ResearchExecution({ topicId }: { topicId: string }) {
  const data = useQuery(api.research.read, {
    command: { kind: "topic_runs", topicId },
  });
  const write = useMutation(api.research.write);
  const requestKey = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  if (!data || data.kind !== "topic_runs")
    return (
      <p role="status" className="my-4 text-xs text-muted-foreground">
        Loading research status…
      </p>
    );
  const current = data.runs.find((run) => run._id === selected) ?? data.runs[0];
  const active =
    current?.state.kind === "queued" || current?.state.kind === "running";
  const running = data.runs.some(
    (run) => run.state.kind === "queued" || run.state.kind === "running",
  );
  async function act(kind: "start_research" | "cancel_run" | "retry_run") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (kind === "start_research") {
        requestKey.current ??= crypto.randomUUID();
        const run = await write({
          command: { kind, topicId, requestKey: requestKey.current },
        });
        setSelected(run._id);
        requestKey.current = null;
      } else if (current) {
        await write({ command: { kind, runId: current._id } });
      }
    } catch (e) {
      setError(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : "Could not complete the request. Try again; Relay will reuse this request safely.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="my-4 text-sm" aria-label="Research activity">
      {running ? (
        <div
          role="status"
          className="flex items-center gap-2 py-2 text-muted-foreground"
        >
          <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />
          Gathering research and sources…
        </div>
      ) : current?.state.kind === "partial" ||
        current?.state.kind === "failed" ? (
        <p role="status" className="py-2 text-muted-foreground">
          {runLabels[current.state.kind]}. Open activity for details.
        </p>
      ) : null}
      <details className="text-xs text-muted-foreground">
        <summary className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 focus-visible:outline-2">
          Research activity <ArrowUpRight size={12} aria-hidden />
        </summary>
        <div className="mt-2 space-y-4 border-l border-border pl-4">
          <p className="max-w-lg leading-6">
            Your agent explores sources and saves the research above. You can
            also gather background material here for your agent to use.
          </p>
          {current ? (
            <div className="space-y-3">
              <p>{runLabels[current.state.kind]}</p>
              {"reason" in current.state ? <p>{current.state.reason}</p> : null}
              {current.cancellation !== "not_requested" ? (
                <p>Cancellation: {current.cancellation.replaceAll("_", " ")}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {current.occupied ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void act("cancel_run")}
                  >
                    Cancel
                  </Button>
                ) : null}
                {!active &&
                current.state.kind !== "succeeded" &&
                (current.state.kind !== "cancelled" || current.occupied) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      busy ||
                      current.recoveries >= 3 ||
                      data.setup.kind !== "ready"
                    }
                    onClick={() => void act("retry_run")}
                  >
                    Retry retrieval
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSelected(selected === current._id ? null : current._id)
                  }
                  aria-expanded={selected === current._id}
                >
                  {selected === current._id ? "Hide results" : "View results"}
                </Button>
              </div>
              <p className="leading-6">
                Background results still need your agent’s assessment.
                Cancellation may not stop provider charges.
              </p>
            </div>
          ) : null}
          {data.runs.length > 1 ? (
            <details>
              <summary className="min-h-9 cursor-pointer py-2">
                Previous investigations
              </summary>
              <ul className="space-y-2">
                {data.runs.map((run) => (
                  <li key={run._id}>
                    <button
                      className="min-h-9 text-left underline underline-offset-4"
                      onClick={() => setSelected(run._id)}
                    >
                      {run.question} · {runLabels[run.state.kind]}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
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
function Packet({ runId }: { runId: string }) {
  const data = useQuery(api.research.read, {
    command: { kind: "get_research_packet", runId },
  });
  if (!data || data.kind !== "packet")
    return (
      <p role="status" className="mt-4 text-sm">
        Loading research packet…
      </p>
    );
  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      <details className="text-xs text-muted-foreground">
        <summary className="min-h-8 cursor-pointer">
          Run and usage details
        </summary>
        <p className="break-all leading-6">
          Run {data.run._id} · Exa {data.run.effort} ·{" "}
          {data.run.stage.replaceAll("_", " ")} ·{" "}
          {data.run.actualDollars === undefined
            ? "Reported cost unavailable"
            : `$${data.run.actualDollars.toFixed(3)} reported cost`}
        </p>
      </details>
      <p className="whitespace-pre-wrap text-sm">{data.run.question}</p>
      {data.run.plan ? (
        <details>
          <summary className="text-sm">Supplied plan</summary>
          <p className="whitespace-pre-wrap text-sm">{data.run.plan.scope}</p>
          <ul className="list-disc pl-5 text-sm">
            {data.run.plan.subquestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {data.packet ? (
        <>
          <h3 className="text-sm font-medium">
            Provider findings · not reviewed
          </h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-7">
            {data.packet.findings}
          </p>
          {data.packet.gaps.length ? (
            <div>
              <h4 className="text-sm font-medium">Coverage gaps</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {data.packet.gaps.map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <details>
            <summary className="text-sm">Provider grounding</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">
              {data.packet.groundingJson}
            </pre>
          </details>
          {data.outputUrl ? (
            <a
              href={data.outputUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs underline"
            >
              Full provider output (untrusted JSON)
            </a>
          ) : null}
          <h4 className="text-sm font-medium">
            Sources ·{" "}
            {
              data.evidence.filter((item) => item.outcome.kind === "retrieved")
                .length
            }{" "}
            retrieved,{" "}
            {
              data.evidence.filter((item) => item.outcome.kind === "pending")
                .length
            }{" "}
            pending,{" "}
            {
              data.evidence.filter((item) => item.outcome.kind === "failed")
                .length
            }{" "}
            failed
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
          A packet will appear when usable provider findings are available.
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
        className="break-all underline underline-offset-4"
      >
        {row.title || row.originalUrl}
      </a>
      <p className="mt-1 text-xs text-muted-foreground">
        {row.outcome.kind}
        {row.publishedAt
          ? ` · Publication time reported by Exa: ${row.publishedAt}`
          : " · Publication time unknown"}
      </p>
      {row.outcome.kind === "failed" ? (
        <p className="mt-1 text-xs">{row.outcome.reason}</p>
      ) : null}
      {row.outcome.kind === "retrieved" ? (
        <>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            Retrieved {new Date(row.outcome.retrievedAt).toLocaleString()}
          </p>
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="min-h-8 cursor-pointer">
              Source integrity details
            </summary>
            <p className="break-all leading-6">SHA-256 {row.outcome.hash}</p>
          </details>
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
          className="ml-3 text-xs underline"
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
