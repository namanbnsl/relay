"use client";

import { ArrowRight, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ViewButton } from "./workspace-ui";
import { discoveries, type Discovery, type Topic } from "./workspace-model";

export function DiscoveriesPage({ topics, dismissed, used, query, filter, attach, onQueryChange, onFilterChange, onAttachChange, onDismiss, onRestore, onResearch, onOpenTopics }: {
  topics: Topic[]; dismissed: string[]; used: string[]; query: string; filter: string; attach: string | null;
  onQueryChange: (value: string) => void; onFilterChange: (value: string) => void; onAttachChange: (value: string | null) => void;
  onDismiss: (id: string) => void; onRestore: () => void; onResearch: (item: Discovery, existingId: string | null) => void; onOpenTopics: () => void;
}) {
  const dismissedSet = new Set(dismissed);
  const usedSet = new Set(used);
  const visible = discoveries.filter((item) => !dismissedSet.has(item.id) && !usedSet.has(item.id) && (filter === "all" || item.category === filter) && `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border pb-0">
      <div className="flex gap-6" aria-label="Filter discoveries">{["all", "Development", "Research idea"].map((value) => <ViewButton key={value} active={filter === value} onClick={() => onFilterChange(value)}>{value === "all" ? "All" : value === "Development" ? "Developments" : "Ideas"}</ViewButton>)}</div>
      <div className="relative mb-2 w-full sm:mb-0 sm:w-48"><Search className="absolute start-2.5 top-2.5 size-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" /><Input className="border-transparent ps-8 shadow-none hover:border-border-strong" aria-label="Search discoveries" placeholder="Search" value={query} onChange={(event) => onQueryChange(event.target.value)} /></div>
    </div>
    <section aria-label="Discoveries">{visible.map((item) => <article key={item.id} className="border-b border-border py-7">
      <h2 className="max-w-[680px] text-base font-semibold leading-6 tracking-[-0.015em]">{item.title}</h2><p className="mt-2 max-w-[680px] text-[13px] leading-6 text-muted-foreground">{item.summary}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><details className="min-w-0 max-w-lg"><summary className="w-fit cursor-pointer rounded-sm text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.source}</summary><p className="mt-3 max-w-xl text-[13px] leading-6 text-muted-foreground">{item.why}</p></details>
        <div className="flex items-center gap-1"><Button variant="outline" onClick={() => onResearch(item, null)}>Research <ArrowRight aria-hidden="true" /></Button><Button variant="ghost" onClick={() => onAttachChange(attach === item.id ? null : item.id)} aria-expanded={attach === item.id}>Add to topic</Button><Button variant="ghost" size="icon" aria-label={`Dismiss: ${item.title}`} onClick={() => onDismiss(item.id)}><X strokeWidth={1.5} aria-hidden="true" /></Button></div>
      </div>
      {attach === item.id ? <div className="mt-4 border-s border-border ps-4"><p className="mb-2 text-xs text-muted-foreground">Choose a topic</p>{topics.map((topic) => <button key={topic.id} onClick={() => onResearch(item, topic.id)} className="flex min-h-9 w-full max-w-md items-center justify-between gap-3 rounded-md px-2 py-2 text-start text-[13px] hover:bg-secondary focus-visible:outline-2">{topic.title}<ChevronRight className="size-3.5 shrink-0" aria-hidden="true" /></button>)}</div> : null}
    </article>)}</section>
    {!visible.length ? <div className="py-16"><h2 className="text-sm font-medium">{query ? `No results for “${query}”` : "Nothing new here."}</h2><p className="mt-2 text-[13px] text-muted-foreground">{query || filter !== "all" ? "Try clearing the search and filters." : "Continue with a saved topic."}</p><Button variant="outline" className="mt-5" onClick={() => query || filter !== "all" ? (onQueryChange(""), onFilterChange("all")) : onOpenTopics()}>{query || filter !== "all" ? "Clear filters" : "Open topics"}</Button></div> : null}
    {dismissed.length ? <Button className="mt-4" variant="ghost" onClick={onRestore}>Restore dismissed ({dismissed.length})</Button> : null}
  </>;
}
