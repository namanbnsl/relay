"use client";

import { createWorkspaceId } from "./workspace-model";

import { useState } from "react";
import { ArrowUpRight, Globe2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceHeading } from "./workspace-ui";

export type ReadingSource = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
};
export const initialSources: ReadingSource[] = [
  {
    id: "github",
    name: "GitHub Blog",
    url: "https://github.blog/",
    enabled: true,
  },
  {
    id: "anthropic",
    name: "Anthropic News",
    url: "https://www.anthropic.com/news",
    enabled: true,
  },
];
const suggestions = [
  {
    id: "huggingface",
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog",
    reason:
      "Open models, evaluation methods, and practical engineering write-ups.",
  },
  {
    id: "google",
    name: "Google Research Blog",
    url: "https://research.google/blog/",
    reason: "Research announcements and links to the underlying papers.",
  },
];

export function SourcesPanel({
  sources,
  onChange,
  onNotice,
}: {
  sources: ReadingSource[];
  onChange: (sources: ReadingSource[]) => void;
  onNotice: (message: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <WorkspaceHeading
        title="Sources"
        description="Websites to keep in your reading list."
        action={
          <Button onClick={() => setAdding(!adding)}>
            <Plus aria-hidden="true" />
            Add website
          </Button>
        }
      />
      <section aria-label="Saved sources">
        {adding ? (
          <form
            className="mb-7 grid max-w-xl gap-5 border-b border-border pb-7"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              const data = new FormData(event.currentTarget);
              const name = String(data.get("name") ?? "").trim();
              const raw = String(data.get("url") ?? "").trim();
              let url: URL;
              try {
                url = new URL(raw);
              } catch {
                setError("Enter a full URL starting with https://.");
                return;
              }
              if (!["https:", "http:"].includes(url.protocol)) {
                setError("Use an http:// or https:// URL.");
                return;
              }
              if (!name) {
                setError("Enter a source name.");
                return;
              }
              if (sources.some((source) => source.url === url.href)) {
                setError("This website is already saved.");
                return;
              }
              onChange([
                ...sources,
                { id: createWorkspaceId(), name, url: url.href, enabled: true },
              ]);
              setAdding(false);
              onNotice("Source added.");
            }}
          >
            <label className="grid gap-2 text-[13px] font-medium">
              Name
              <Input
                name="name"
                placeholder="Publication name"
                required
                maxLength={120}
              />
            </label>
            <label className="grid gap-2 text-[13px] font-medium">
              Website
              <Input
                name="url"
                placeholder="https://example.com/blog"
                type="url"
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "source-error" : undefined}
              />
            </label>
            {error ? (
              <p id="source-error" role="alert" className="text-xs">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit">Save source</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
        {sources.map((source) => (
          <article
            key={source.id}
            className="flex items-center gap-4 border-b border-border py-5"
          >
            <Globe2
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <a
                className="inline-flex max-w-full items-center gap-2 rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="break-words">{source.name}</span>
                <ArrowUpRight
                  className="size-3 shrink-0"
                  aria-label="Opens in new tab"
                />
              </a>
              <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">
                {source.url}
                {!source.enabled ? " · Paused" : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() =>
                onChange(
                  sources.map((item) =>
                    item.id === source.id
                      ? { ...item, enabled: !item.enabled }
                      : item,
                  ),
                )
              }
            >
              {source.enabled ? "Pause" : "Resume"}
            </Button>
          </article>
        ))}
      </section>
      <section aria-label="Suggested sources" className="mt-12">
        <h2 className="mb-2 text-sm font-semibold">Suggested sources</h2>
        {suggestions.map((source) => (
          <article
            key={source.id}
            className="flex items-center justify-between gap-5 border-b border-border py-5"
          >
            <div className="min-w-0">
              <h3 className="text-sm font-medium">{source.name}</h3>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                {source.reason}
              </p>
            </div>
            <Button
              variant="ghost"
              disabled={sources.some((item) => item.url === source.url)}
              onClick={() => {
                onChange([
                  ...sources,
                  {
                    id: source.id,
                    name: source.name,
                    url: source.url,
                    enabled: true,
                  },
                ]);
                onNotice("Source added.");
              }}
            >
              {sources.some((item) => item.url === source.url)
                ? "Added"
                : "Add"}
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}
