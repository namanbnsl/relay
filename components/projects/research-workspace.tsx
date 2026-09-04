"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TopicCadence =
  { kind: "daily"; nextRun: string } | { kind: "one-time"; nextRun: null };

type Topic = {
  id: string;
  title: string;
  question: string;
  cadence: TopicCadence;
  sourceCount: number;
  newSignalCount: number;
};

const topics = [
  {
    id: "coding-agents",
    title: "AI coding agents",
    question: "Which product changes matter to working software teams?",
    cadence: { kind: "daily", nextRun: "Tomorrow, 08:00" },
    sourceCount: 8,
    newSignalCount: 3,
  },
  {
    id: "model-pricing",
    title: "Model pricing",
    question: "Where are meaningful inference costs changing?",
    cadence: { kind: "daily", nextRun: "Tomorrow, 08:00" },
    sourceCount: 5,
    newSignalCount: 0,
  },
  {
    id: "open-source-agents",
    title: "Open-source agent stacks",
    question: "What can teams deploy without a managed agent platform?",
    cadence: { kind: "one-time", nextRun: null },
    sourceCount: 6,
    newSignalCount: 1,
  },
] satisfies ReadonlyArray<Topic>;

const sidebarTopics = topics.map(({ id, title, newSignalCount }) => ({
  id,
  title,
  newSignalCount,
}));

const sources = [
  {
    name: "Official product blogs",
    detail: "RSS and sitemap",
    checked: "18 min ago",
  },
  {
    name: "GitHub releases",
    detail: "Repository feeds",
    checked: "42 min ago",
  },
  { name: "GDELT news index", detail: "Topic query", checked: "2 hr ago" },
] as const;

const signals = [
  {
    title: "Release notes changed across two monitored products",
    source: "2 related sources",
    time: "09:20",
  },
  {
    title: "A new agent framework release was published",
    source: "GitHub releases",
    time: "07:45",
  },
  {
    title: "Coverage volume moved above the topic baseline",
    source: "GDELT news index",
    time: "Yesterday",
  },
] as const;

function cadenceLabel(cadence: TopicCadence) {
  return cadence.kind === "daily" ? "Daily research" : "One-time research";
}

export function ResearchWorkspace() {
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0].id);
  const selectedTopic =
    topics.find((topic) => topic.id === selectedTopicId) ?? topics[0];

  return (
    <AppShell
      navigation={{
        projectName: "AI industry brief",
        selectedTopicId,
        topics: sidebarTopics,
        onSelectTopic: setSelectedTopicId,
      }}
    >
      <Tabs className="gap-0" defaultValue="monitor">
        <header>
          <div className="mx-auto w-full max-w-[1120px] px-5 pt-7 sm:px-8 sm:pt-8 lg:px-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold leading-tight tracking-[-0.035em]">
                  {selectedTopic.title}
                </h1>
                <p className="mt-1.5 max-w-[620px] text-[13px] leading-5 text-muted-foreground text-pretty">
                  {selectedTopic.question}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {cadenceLabel(selectedTopic.cadence)} ·{" "}
                  {selectedTopic.sourceCount} sources · Monitoring
                </p>
              </div>
              <Button className="self-start sm:self-auto" type="button">
                Start research
              </Button>
            </div>

            <TabsList
              className="mt-6 h-8 justify-start rounded-[7px] p-0.5 group-data-[orientation=horizontal]/tabs:h-8"
              aria-label="Topic sections"
            >
              <TabsTrigger
                className="h-7 flex-none rounded-md px-2.5"
                value="monitor"
              >
                Monitor
              </TabsTrigger>
              <TabsTrigger
                className="h-7 flex-none rounded-md px-2.5"
                value="research"
              >
                Research
              </TabsTrigger>
              <TabsTrigger
                className="h-7 flex-none rounded-md px-2.5"
                value="content"
              >
                Content
              </TabsTrigger>
            </TabsList>
          </div>
        </header>

        <TabsContent value="monitor">
          <MonitorPanel />
        </TabsContent>
        <TabsContent value="research">
          <ResearchPanel cadence={selectedTopic.cadence} />
        </TabsContent>
        <TabsContent value="content">
          <ContentPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function MonitorPanel() {
  return (
    <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,680px)_260px] lg:justify-between lg:gap-12 lg:px-10">
      <section aria-labelledby="signals-title">
        <div className="flex items-baseline justify-between gap-4 px-3">
          <div>
            <h2 className="text-sm font-semibold" id="signals-title">
              Latest signals
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Changes since the last research run
            </p>
          </div>
          <span className="text-xs font-medium">3 new</span>
        </div>

        <div className="mt-4 space-y-1">
          {signals.map((signal) => (
            <article
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-lg px-3 py-3 transition-[background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-secondary"
              key={signal.title}
            >
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold leading-5">
                  {signal.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {signal.source}
                </p>
              </div>
              <time className="text-xs tabular-nums text-muted-foreground">
                {signal.time}
              </time>
            </article>
          ))}
        </div>
      </section>

      <section
        className="h-fit rounded-[10px] bg-surface-subtle p-4"
        aria-labelledby="coverage-title"
      >
        <h2 className="text-sm font-semibold" id="coverage-title">
          Source coverage
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          8 sources connected
        </p>

        <div className="mt-5 space-y-4">
          {sources.map((source) => (
            <div key={source.name}>
              <p className="text-[13px] font-medium">{source.name}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                {source.detail} · Checked {source.checked}
              </p>
            </div>
          ))}
        </div>

        <Button className="-ms-2 mt-3" size="sm" variant="ghost" type="button">
          Add source
        </Button>

        <div className="mt-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Next monitor cycle
          </p>
          <p className="mt-1 text-[13px] font-semibold">Tomorrow at 08:00</p>
        </div>
      </section>
    </div>
  );
}

function ResearchPanel({ cadence }: { cadence: TopicCadence }) {
  return (
    <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,680px)_260px] lg:justify-between lg:gap-12 lg:px-10">
      <section aria-labelledby="agent-task-title">
        <p className="text-xs font-medium text-muted-foreground">
          Ready for your agent
        </p>
        <h2
          className="mt-2 max-w-[540px] text-xl font-semibold tracking-[-0.03em]"
          id="agent-task-title"
        >
          Research the three new signals
        </h2>
        <p className="mt-3 max-w-[600px] text-sm leading-6 text-muted-foreground">
          Use the prepared changes as context, investigate what matters, then
          save sourced claims back through MCP.
        </p>
        <Button className="mt-6" type="button">
          Open agent instructions
        </Button>
      </section>

      <section
        className="h-fit rounded-[10px] bg-surface-subtle p-4"
        aria-labelledby="run-history-title"
      >
        <h2 className="text-sm font-semibold" id="run-history-title">
          Research history
        </h2>
        <div className="mt-5">
          <p className="text-xs font-medium">Approved</p>
          <p className="mt-2 text-[13px] font-semibold">
            Daily update · September 2
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            7 claims · 11 sources · Version 3
          </p>
        </div>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          {cadence.kind === "daily"
            ? `Next monitor cycle: ${cadence.nextRun}`
            : "This topic has no recurring schedule."}
        </p>
      </section>
    </div>
  );
}

function ContentPanel() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-8 sm:px-8 lg:px-10">
      <section className="max-w-[620px]" aria-labelledby="content-title">
        <h2
          className="text-xl font-semibold tracking-[-0.03em]"
          id="content-title"
        >
          Content starts after approval
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Approve a research version first. Relay will use that exact version
          when you draft a post or video script.
        </p>
      </section>
    </div>
  );
}
