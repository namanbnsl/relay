"use client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourcesPanel } from "./sources-panel";
import { DiscoveriesPage } from "./workspace-discoveries";
import { TopicsPage } from "./workspace-topics";
import { WorkspaceHeading, workspacePageClass } from "./workspace-ui";
import type { Discovery, Topic } from "./workspace-model";
import type { WorkspacePage } from "@/components/app-shell";

export function WorkspaceBody({ page, topics, sources, adding, dismissed, used, query, filter, attach, onToggleAdding, onQueryChange, onFilterChange, onAttachChange, onDismiss, onRestore, onResearch, onOpenTopics, onAddTopic, onCancelAdd, onOpenTopic, onSourcesChange, onNotice }: {
  page: WorkspacePage; topics: Topic[]; sources: typeof import("./sources-panel").initialSources; adding: boolean; dismissed: string[]; used: string[]; query: string; filter: string; attach: string | null;
  onToggleAdding: () => void; onQueryChange: (value: string) => void; onFilterChange: (value: string) => void; onAttachChange: (value: string | null) => void; onDismiss: (id: string) => void; onRestore: () => void; onResearch: (item: Discovery, existingId: string | null) => void; onOpenTopics: () => void; onAddTopic: (topic: Topic) => void; onCancelAdd: () => void; onOpenTopic: (id: string) => void; onSourcesChange: (sources: typeof import("./sources-panel").initialSources) => void; onNotice: (message: string) => void;
}) {
  const meta = page === "discover" ? ["Discover", "New developments and questions to explore."] : ["Topics", "Your questions, research, and drafts."];
  return <div className={workspacePageClass}>{page !== "sources" ? <WorkspaceHeading title={meta[0]} description={meta[1]} action={page === "topics" ? <Button onClick={onToggleAdding}><Plus aria-hidden="true" />Add topic</Button> : undefined} /> : null}{page === "discover" ? <DiscoveriesPage topics={topics} dismissed={dismissed} used={used} query={query} filter={filter} attach={attach} onQueryChange={onQueryChange} onFilterChange={onFilterChange} onAttachChange={onAttachChange} onDismiss={onDismiss} onRestore={onRestore} onResearch={onResearch} onOpenTopics={onOpenTopics} /> : page === "topics" ? <TopicsPage topics={topics} adding={adding} onAdd={onAddTopic} onCancel={onCancelAdd} onOpen={onOpenTopic} /> : <SourcesPanel sources={sources} onChange={onSourcesChange} onNotice={onNotice} />}</div>;
}
