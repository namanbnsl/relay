"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { workspaceSelectClass } from "./workspace-ui";
import {
  type Run,
} from "./workspace-model";
import { DraftContent } from "./draft-content";

export function DraftPanel({
  run,
  title,
  onChange,
  onNotice,
  onOpenBrief,
}: {
  run: Run;
  title: string;
  onChange: (run: Run) => void;
  onNotice: (message: string) => void;
  onOpenBrief: () => void;
}) {
  const [format, setFormat] = useState<"whatsapp" | "script">("whatsapp");
  const [ending, setEnding] = useState(
    "The takeaway: check what the evidence actually measures before changing your workflow.",
  );
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const draft = run.drafts[format];
  const stale = draft && draft.researchVersion !== run.version;
  const approved =
    draft?.approvals.some((item) => item.version === draft.version) ?? false;
  return (
    <section className="max-w-[720px] py-6" aria-label="Content draft">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <label>
          <span className="sr-only">Draft format</span>
          <select
            className={workspaceSelectClass}
            value={format}
            onChange={(event) => {
              setFormat(
                event.target.value === "script" ? "script" : "whatsapp",
              );
              setEditing(false);
            }}
          >
            <option value="whatsapp">WhatsApp post</option>
            <option value="script">Video script</option>
          </select>
        </label>
        <details className="max-w-sm pt-2">
          <summary className="w-fit cursor-pointer rounded-sm text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Format settings
          </summary>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            {format === "whatsapp"
              ? "Headline, findings, takeaway, sources."
              : "Opening, explanation, visual plan, takeaway, references."}
          </p>
          <label
            htmlFor="draft-ending"
            className="mb-2 mt-4 block text-xs font-medium"
          >
            Takeaway for new drafts
          </label>
          <Textarea
            id="draft-ending"
            rows={4}
            value={ending}
            onChange={(event) => setEnding(event.target.value)}
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Applies when creating or rebuilding a draft.
          </p>
        </details>
      </div>
      <DraftContent draft={draft} run={run} title={title} format={format} ending={ending} editing={editing} text={text} approved={approved} stale={Boolean(stale)} onChange={onChange} onNotice={onNotice} onOpenBrief={onOpenBrief} onEditingChange={setEditing} onTextChange={setText} />
    </section>
  );
}
