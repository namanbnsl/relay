"use client";

import { createWorkspaceId } from "./workspace-model";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopicDetailBody } from "./topic-detail-body";
import {
  createRun,
  discoveries,
  type Run,
  type Topic,
} from "./workspace-model";

import {
  ViewButton,
  workspacePageClass,
  workspaceSelectClass,
} from "./workspace-ui";

export function TopicDetail({
  topic,
  onChange,
  onBack,
  onNotice,
}: {
  topic: Topic;
  onChange: (topic: Topic) => void;
  onBack: () => void;
  onNotice: (message: string) => void;
}) {
  const [runId, setRunId] = useState(topic.runs.at(-1)?.id ?? null);
  const [tab, setTab] = useState<"brief" | "drafts">("brief");
  const [claimId, setClaimId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState("");
  const [outline, setOutline] = useState(topic.outline);
  const evidenceRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (claimId && window.matchMedia("(max-width: 1279px)").matches) {
      evidenceRef.current?.focus({ preventScroll: true });
      evidenceRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    }
  }, [claimId]);
  const run = topic.runs.find((item) => item.id === runId);
  const claim = run?.claims.find((item) => item.id === claimId);
  const disputed =
    run?.claims.filter((item) => item.review.kind === "disputed") ?? [];
  function updateRun(next: Run) {
    onChange({
      ...topic,
      runs: topic.runs.map((item) => (item.id === next.id ? next : item)),
    });
  }
  function newRun(sample: boolean) {
    const next = createRun({
      id: createWorkspaceId(),
      date: sample
        ? "September 5, 2026"
        : new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(new Date()),
      discovery: sample
        ? (discoveries.find((item) => item.id === "permissions") ?? null)
        : null,
    });
    onChange({ ...topic, runs: [...topic.runs, next] });
    setRunId(next.id);
    setTab("brief");
    setClaimId(null);
    setEditing(false);
    onNotice(
      sample
        ? "Sample daily update added alongside the previous investigation."
        : "New investigation opened. Write or paste your findings; no model has been called.",
    );
  }
  return (
    <div className={workspacePageClass}>
      <button
        onClick={onBack}
        className="mb-5 flex min-h-6 items-center gap-2 rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
        Topics
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-2xl font-semibold leading-snug tracking-[-0.035em]">
            {topic.title}
          </h1>
          {topic.question !== topic.title ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {topic.question}
            </p>
          ) : null}
        </div>
        <label>
          <span className="sr-only">Cadence</span>
          <select
            className={workspaceSelectClass}
            value={topic.cadence}
            onChange={(event) =>
              onChange({
                ...topic,
                cadence: event.target.value === "daily" ? "daily" : "one-time",
              })
            }
          >
            <option value="one-time">One-time</option>
            <option value="daily">Daily</option>
          </select>
        </label>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border">
        <div className="flex gap-6" aria-label="Topic views">
          <ViewButton active={tab === "brief"} onClick={() => setTab("brief")}>
            Research
          </ViewButton>
          <ViewButton
            active={tab === "drafts"}
            onClick={() => setTab("drafts")}
          >
            Drafts
          </ViewButton>
        </div>
        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2 sm:mb-0">
          {topic.runs.length ? (
            <label className="min-w-0">
              <span className="sr-only">Select investigation</span>
              <select
                className={`${workspaceSelectClass} border-transparent`}
                value={runId ?? ""}
                onChange={(event) => {
                  setRunId(event.target.value);
                  setEditing(false);
                  setClaimId(null);
                }}
              >
                {topic.runs.map((item, index) => (
                  <option value={item.id} key={item.id}>
                    {item.date} · Run {index + 1}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {topic.id === "coding-agents" && topic.runs.length === 1 ? (
            <Button variant="ghost" onClick={() => newRun(true)}>
              Try daily update
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => newRun(false)}>
              New investigation
            </Button>
          )}
        </div>
      </div>
      <TopicDetailBody topic={topic} run={run} claim={claim} tab={tab} outline={outline} summary={summary} editing={editing} disputed={disputed} evidenceRef={evidenceRef} onOutlineChange={setOutline} onSummaryChange={setSummary} onEditingChange={setEditing} onClaimChange={setClaimId} onTabChange={setTab} onChange={onChange} onNotice={onNotice} onUpdateRun={updateRun} onStart={() => newRun(false)} />
    </div>
  );
}
