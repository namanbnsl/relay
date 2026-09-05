"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { workspaceSelectClass } from "./workspace-ui";
import { createWorkspaceId, type Topic } from "./workspace-model";

export function TopicsPage({ topics, adding, onAdd, onCancel, onOpen }: { topics: Topic[]; adding: boolean; onAdd: (topic: Topic) => void; onCancel: () => void; onOpen: (id: string) => void }) {
  return <>
    {adding ? <form className="mb-8 grid max-w-xl gap-5 border-b border-border pb-8" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") ?? "").trim(); const question = String(data.get("question") ?? "").trim(); if (!title || !question) return; onAdd({ id: createWorkspaceId(), title, question, cadence: data.get("cadence") === "daily" ? "daily" : "one-time", outline: "", runs: [] }); }}>
      <label className="grid gap-2 text-[13px] font-medium">Name<Input name="title" required maxLength={160} placeholder="Agent permissions" /></label><label className="grid gap-2 text-[13px] font-medium">Research question<Textarea name="question" required maxLength={1000} placeholder="Which permissions should a team grant its coding agent?" /></label><label className="grid w-fit gap-2 text-[13px] font-medium">Cadence<select name="cadence" className={workspaceSelectClass}><option value="one-time">One-time</option><option value="daily">Daily</option></select></label><div className="flex gap-2"><Button type="submit">Create topic</Button><Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button></div>
    </form> : null}
    <section aria-label="Topics">{topics.map((topic) => <button key={topic.id} onClick={() => onOpen(topic.id)} className="group grid w-full gap-4 border-b border-border py-6 text-start outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto]"><div><h2 className="text-sm font-semibold">{topic.title}</h2><p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-foreground">{topic.question}</p></div><div className="flex items-center gap-5 text-xs text-muted-foreground"><span>{topic.cadence === "daily" ? "Daily" : "One-time"}</span><ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden="true" /></div></button>)}</section>
  </>;
}
