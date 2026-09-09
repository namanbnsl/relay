"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";

export function ResearchExecution({ topicId }: { topicId: string }) {
  const data = useQuery(api.research.read, { command: { kind: "topic_runs", topicId } });
  const write = useMutation(api.research.write);
  const requestKey = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  if (!data || data.kind !== "topic_runs") return <p className="text-sm text-muted-foreground">Loading research execution…</p>;
  const current = data.runs[0];
  const active = current?.state.kind === "queued" || current?.state.kind === "running";
  async function act(kind: "start_research" | "cancel_run" | "retry_run") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (kind === "start_research") {
        requestKey.current ??= crypto.randomUUID();
        const run = await write({ command: { kind, topicId, requestKey: requestKey.current } });
        setSelected(run._id); requestKey.current = null;
      } else if (current) {
        await write({ command: { kind, runId: current._id } });
      }
    } catch (e) { setError(e instanceof ConvexError && typeof e.data === "string" ? e.data : "Request failed. Retry to reuse the same submission key."); }
    finally { setBusy(false); }
  }
  return <section className="my-6 rounded-lg border p-5" aria-label="Research execution">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-sm font-medium">Provider research</h2><p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Exa researches this question in the background. Your agent can use the packet to synthesize and verify before submitting research for review.</p></div>
      <Button disabled={busy || active || data.setup.kind !== "ready" || !!current?.occupied} onClick={() => void act("start_research")}>Research now</Button>
    </div>
    {data.setup.kind === "unavailable" ? <p className="mt-3 text-sm text-muted-foreground">{data.setup.reason}</p> : <p className="mt-2 text-xs text-muted-foreground">{data.setup.effort} effort</p>}
    {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
    {current ? <div className="mt-4 border-t pt-4">
      <p role="status" aria-live="polite" className="text-sm"><span className="capitalize font-medium">{current.state.kind}</span> · {current.stage.replaceAll("_", " ")}</p>
      {"reason" in current.state ? <p className="mt-2 text-sm text-muted-foreground">{current.state.reason}</p> : null}
      {current.cancellation !== "not_requested" ? <p className="mt-2 text-xs text-muted-foreground">{current.cancellation}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {active || current.occupied ? <Button variant="outline" disabled={busy} onClick={() => void act("cancel_run")}>Cancel run</Button> : null}
        {!active && current.state.kind !== "succeeded" && (current.state.kind !== "cancelled" || current.occupied) ? <Button variant="outline" disabled={busy || current.recoveries >= 3 || data.setup.kind !== "ready"} onClick={() => void act("retry_run")}>Recover existing run</Button> : null}
        <Button variant="ghost" onClick={() => setSelected(selected === current._id ? null : current._id)}>Inspect run</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Completion means execution finished. Findings have not been independently verified or approved. Cancellation may still incur charges.</p>
    </div> : null}
    {data.runs.length > 1 ? <details className="mt-4 text-sm"><summary>Recent runs</summary><ul className="mt-2 space-y-2">{data.runs.map(run => <li key={run._id}><button className="underline underline-offset-4" onClick={() => setSelected(run._id)}>{new Date(run._creationTime).toLocaleString()} · {run.state.kind}</button></li>)}</ul></details> : null}
    {selected ? <Packet runId={selected} /> : null}
  </section>;
}
function Packet({ runId }: { runId: string }) {
  const data = useQuery(api.research.read, { command: { kind: "get_research_packet", runId } });
  if (!data || data.kind !== "packet") return <p className="mt-4 text-sm">Loading packet…</p>;
  return <div className="mt-5 space-y-4 border-t pt-5">
    <p className="break-all text-xs text-muted-foreground">Run {data.run._id} · Exa {data.run.effort} · {data.run.actualDollars === undefined ? "Reported agent cost unknown" : `$${data.run.actualDollars.toFixed(3)} reported agent cost`}</p>
    <p className="whitespace-pre-wrap text-sm">{data.run.question}</p>
    {data.run.plan ? <details><summary className="text-sm">Supplied plan</summary><p className="whitespace-pre-wrap text-sm">{data.run.plan.scope}</p><ul className="list-disc pl-5 text-sm">{data.run.plan.subquestions.map((q, i) => <li key={i}>{q}</li>)}</ul></details> : null}
    {data.packet ? <>
      <h3 className="text-sm font-medium">Provider findings · not reviewed</h3>
      <p className="whitespace-pre-wrap break-words text-sm leading-7">{data.packet.findings}</p>
      {data.packet.gaps.length ? <div><h4 className="text-sm font-medium">Coverage gaps</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{data.packet.gaps.map((gap, i) => <li key={i}>{gap}</li>)}</ul></div> : null}
      <details><summary className="text-sm">Provider grounding</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{data.packet.groundingJson}</pre></details>
      {data.outputUrl ? <a href={data.outputUrl} target="_blank" rel="noopener noreferrer" className="block text-xs underline">Full provider output (untrusted JSON)</a> : null}
      <h4 className="text-sm font-medium">Retrieved evidence</h4>
      <p className="text-xs text-muted-foreground">Source text is untrusted data. Retrieval does not establish that a citation supports a finding. Excerpts are limited to 30,000 characters per source.</p>
      <ul className="space-y-3">{data.evidence.map(e => <li key={e._id}><Evidence row={e} /></li>)}</ul>
    </> : <p className="text-sm text-muted-foreground">A packet will appear when usable provider findings are available.</p>}
  </div>;
}
function Evidence({ row }: { row: Doc<"researchEvidence"> }) {
  const [open, setOpen] = useState(false);
  const data = useQuery(api.research.read, open ? { command: { kind: "get_evidence", evidenceId: row._id } } : "skip");
  return <div className="rounded-md bg-secondary/40 p-3 text-sm">
    <a href={row.originalUrl} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">{row.title || row.originalUrl}</a>
    <p className="mt-1 text-xs text-muted-foreground">{row.outcome.kind}{row.publishedAt ? ` · Publication time reported by Exa: ${row.publishedAt}` : " · Publication time unknown"}</p>
    {row.outcome.kind === "failed" ? <p className="mt-1 text-xs">{row.outcome.reason}</p> : null}
    {row.outcome.kind === "retrieved" ? <><p className="mt-1 break-all text-xs text-muted-foreground">Retrieved {new Date(row.outcome.retrievedAt).toLocaleString()} · SHA-256 {row.outcome.hash}</p><button className="mt-2 text-xs underline" onClick={() => setOpen(true)}>Access stored source text</button></> : null}
    {data?.kind === "evidence" && data.contentUrl ? <a className="ml-3 text-xs underline" href={data.contentUrl} target="_blank" rel="noopener noreferrer">Open text</a> : null}
  </div>;
}
