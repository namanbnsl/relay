"use client";

import { createWorkspaceId } from "./workspace-model";

import { useState } from "react";
import { X } from "lucide-react";
import { AppShell, type WorkspacePage } from "@/components/app-shell";
import { TopicDetail } from "./topic-detail";
import { initialSources } from "./sources-panel";
import {
  createRun,
  discoveries,
  initialTopics,
} from "./workspace-model";

import {
} from "./workspace-ui";
import { WorkspaceBody } from "./workspace-body";

export function ResearchWorkspace() {
  const [page, setPage] = useState<WorkspacePage>("discover");
  const [sources, setSources] = useState(initialSources);
  const [topics, setTopics] = useState(initialTopics);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const [attach, setAttach] = useState<string | null>(null);
  const selected = topics.find((topic) => topic.id === selectedId);

  function navigate(next: WorkspacePage) {
    setPage(next);
    setSelectedId(null);
    setAdding(false);
    setNotice("");
  }
  function openTopic(id: string) {
    setSelectedId(id);
    setPage("topics");
    setAdding(false);
  }
  function research(item: (typeof discoveries)[number], existingId: string | null) {
    const id = existingId ?? createWorkspaceId();
    const run = createRun({
      id: createWorkspaceId(),
      date: "September 5, 2026",
      discovery: item,
    });
    if (existingId)
      setTopics((current) =>
        current.map((topic) =>
          topic.id === id ? { ...topic, runs: [...topic.runs, run] } : topic,
        ),
      );
    else
      setTopics((current) => [
        ...current,
        {
          id,
          title: item.title,
          question: item.question,
          cadence: "one-time",
          outline:
            "What changed?\nWhat does the evidence support?\nWhy does it matter to our audience?",
          runs: [run],
        },
      ]);
    setUsed((current) => [...current, item.id]);
    setAttach(null);
    openTopic(id);
    setNotice(
      item.claims.length
        ? "Sample investigation opened. One claim needs review."
        : "Research outline created. Add your findings to the brief.",
    );
  }

  return (
    <AppShell
      page={page}
      selectedTopicId={selectedId}
      topics={topics}
      onNavigate={navigate}
      onSelectTopic={openTopic}
      onAddTopic={() => {
        navigate("topics");
        setAdding(true);
      }}
    >
      <div
        role="status"
        className={
          notice
            ? "fixed bottom-4 end-4 z-40 flex max-w-[calc(100vw-32px)] items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 text-xs leading-5 sm:max-w-sm"
            : "sr-only"
        }
      >
        {notice}
        {notice ? (
          <button
            aria-label="Dismiss notification"
            className="-me-1 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setNotice("")}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {selected ? <TopicDetail key={selected.id} topic={selected} onChange={(updated) => setTopics((current) => current.map((topic) => topic.id === updated.id ? updated : topic))} onBack={() => navigate("topics")} onNotice={setNotice} /> : <WorkspaceBody page={page} topics={topics} sources={sources} adding={adding} dismissed={dismissed} used={used} query={query} filter={filter} attach={attach} onToggleAdding={() => setAdding(!adding)} onQueryChange={setQuery} onFilterChange={setFilter} onAttachChange={setAttach} onDismiss={(id) => { setDismissed((current) => [...current, id]); setNotice("Dismissed. You can restore it below the list."); }} onRestore={() => { setDismissed([]); setNotice("Items restored."); }} onResearch={research} onOpenTopics={() => navigate("topics")} onAddTopic={(topic) => { setTopics((current) => [...current, topic]); openTopic(topic.id); setNotice("Topic added."); }} onCancelAdd={() => setAdding(false)} onOpenTopic={openTopic} onSourcesChange={setSources} onNotice={setNotice} />}
    </AppShell>
  );
}
