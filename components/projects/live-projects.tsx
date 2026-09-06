"use client";

import { UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionArgs } from "convex/server";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { workspacePageClass, WorkspaceHeading } from "./workspace-ui";

type Command = FunctionArgs<typeof api.relay.write>["command"];
export function useRelayWrite() {
  const mutate = useMutation(api.relay.write);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function write(command: Command) {
    setPending(true);
    setError("");
    try {
      return await mutate({ command });
    } catch (error) {
      setError(
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Could not save. Please try again.",
      );
      return null;
    } finally {
      setPending(false);
    }
  }
  return { write, pending, error };
}
export function ProjectFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="research-workspace min-h-svh bg-background text-foreground">
      <a
        href="#project-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:bg-background"
      >
        Skip to content
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1040px] items-center gap-5 px-5 sm:px-10 lg:px-12">
          <Link
            href="/projects"
            className="shrink-0 font-semibold focus-visible:outline-2"
          >
            Relay
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
          <UserButton />
        </div>
      </header>
      <main id="project-content" className={workspacePageClass}>
        {children}
      </main>
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm">
      {label}
      {children}
    </label>
  );
}
export function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="my-4 text-sm">
      {error}
    </p>
  ) : null;
}
export function Projects() {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(
    api.relay.read,
    isAuthenticated ? { command: { kind: "projects" } } : "skip",
  );
  const { write, pending, error } = useRelayWrite();
  const [adding, setAdding] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  return (
    <ProjectFrame title="Projects">
      <WorkspaceHeading
        title="Projects"
        description="Research and scripts, saved in one place."
        action={
          <Button onClick={() => setAdding(!adding)}>
            {adding ? "Cancel" : "New project"}
          </Button>
        }
      />
      {adding ? (
        <form
          className="mb-8 grid max-w-xl gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            const result = await write({
              kind: "create_project",
              name: String(values.get("name") ?? ""),
              description: String(values.get("description") ?? ""),
              requestId,
            });
            if (result) {
              setAdding(false);
              setRequestId(crypto.randomUUID());
            }
          }}
        >
          <Field label="Name">
            <Input name="name" required maxLength={160} />
          </Field>
          <Field label="Description">
            <Textarea name="description" maxLength={2000} />
          </Field>
          <Button
            disabled={pending}
            className="justify-self-start"
            type="submit"
          >
            {pending ? "Saving…" : "Create project"}
          </Button>
        </form>
      ) : null}
      <ErrorMessage error={error} />
      {!data ? (
        <p role="status">Loading projects…</p>
      ) : data.kind === "projects" ? (
        <div className="divide-y divide-border">
          {data.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create your first project to begin.
            </p>
          ) : (
            data.projects.map((project) => (
              <Link
                key={project._id}
                href={`/projects/${project._id}`}
                className="block py-5 focus-visible:outline-2"
              >
                <h2 className="font-semibold">{project.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {project.description}
                </p>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </ProjectFrame>
  );
}
export function Project({
  projectId,
  initialTopicId,
}: {
  projectId: string;
  initialTopicId?: string;
}) {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(
    api.relay.read,
    isAuthenticated ? { command: { kind: "project", projectId } } : "skip",
  );
  const { write, pending, error } = useRelayWrite();
  const [selected, setSelected] = useState(initialTopicId ?? "");
  const [adding, setAdding] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  if (!data || data.kind !== "project")
    return (
      <ProjectFrame title="Project">
        <p role="status">Loading project…</p>
      </ProjectFrame>
    );
  return (
    <ProjectFrame title={data.project.name}>
      {selected ? (
        <Topic
          key={selected}
          topicId={selected}
          projectId={projectId}
          onBack={() => setSelected("")}
        />
      ) : (
        <>
          <WorkspaceHeading
            title="Topics"
            description={data.project.description}
            action={
              <Button onClick={() => setAdding(!adding)}>
                {adding ? "Cancel" : "New topic"}
              </Button>
            }
          />
          {adding ? (
            <form
              className="mb-8 grid max-w-xl gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                const result = await write({
                  kind: "create_topic",
                  projectId,
                  title: String(values.get("title") ?? ""),
                  question: String(values.get("question") ?? ""),
                  outline: String(values.get("outline") ?? ""),
                  requestId,
                });
                if (result) {
                  setAdding(false);
                  setSelected(result.id);
                  setRequestId(crypto.randomUUID());
                }
              }}
            >
              <Field label="Title">
                <Input name="title" required maxLength={160} />
              </Field>
              <Field label="Research question">
                <Textarea name="question" required maxLength={2000} />
              </Field>
              <Field label="Outline">
                <Textarea name="outline" maxLength={10000} />
              </Field>
              <Button
                disabled={pending}
                type="submit"
                className="justify-self-start"
              >
                {pending ? "Saving…" : "Create topic"}
              </Button>
            </form>
          ) : null}
          <ErrorMessage error={error} />
          <div className="divide-y divide-border">
            {data.topics.length ? (
              data.topics.map((topic) => (
                <button
                  key={topic._id}
                  onClick={() => setSelected(topic._id)}
                  className="block w-full py-5 text-start focus-visible:outline-2"
                >
                  <h2 className="font-semibold">{topic.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topic.question}
                  </p>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Add a topic, then ask your connected agent to research it.
              </p>
            )}
          </div>
        </>
      )}
    </ProjectFrame>
  );
}
function Topic({
  topicId,
  projectId,
  onBack,
}: {
  topicId: string;
  projectId: string;
  onBack: () => void;
}) {
  const data = useQuery(api.relay.read, {
    command: { kind: "topic", topicId },
  });
  const [tab, setTab] = useState<"research" | "script">("research");
  if (!data || data.kind !== "topic")
    return <p role="status">Loading topic…</p>;
  if (data.topic.projectId !== projectId)
    return <p>Topic not found in this project.</p>;
  const latest = data.research[0];
  const script = data.scripts[0];
  return (
    <>
      <button
        onClick={onBack}
        className="mb-6 text-sm text-muted-foreground focus-visible:outline-2"
      >
        ← Topics
      </button>
      <WorkspaceHeading
        title={data.topic.title}
        description={data.topic.question}
      />
      {data.topic.outline ? (
        <details className="mb-6 text-sm">
          <summary className="cursor-pointer">Research outline</summary>
          <p className="mt-3 whitespace-pre-wrap leading-7">
            {data.topic.outline}
          </p>
        </details>
      ) : null}
      <nav
        aria-label="Topic sections"
        className="mb-8 flex gap-6 border-b border-border"
      >
        {(["research", "script"] satisfies Array<typeof tab>).map((item) => (
          <button
            key={item}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
            className={`min-h-10 border-b-2 text-sm capitalize focus-visible:outline-2 ${tab === item ? "border-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {item}
          </button>
        ))}
      </nav>
      {tab === "research" ? (
        latest ? (
          <Research key={latest._id} row={latest} />
        ) : (
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">
            No research saved yet. Ask your connected agent to research this
            topic and save its findings to Relay. Topic ID:{" "}
            <span className="break-all select-all">{topicId}</span>
          </p>
        )
      ) : script ? (
        <Script key={script._id} row={script} research={data.research} />
      ) : (
        <p className="text-sm leading-7 text-muted-foreground">
          {latest?.review.kind === "approved"
            ? "Ask your connected agent to write a script from the approved research."
            : "Approve research before creating a script."}
        </p>
      )}
      <details className="mt-10 border-t border-border pt-5 text-sm">
        <summary className="cursor-pointer">Version history</summary>
        <p className="my-3 text-xs text-muted-foreground">
          Showing up to 10 recent versions per section.
        </p>
        {data.research.map((row) => (
          <details key={row._id} className="py-3">
            <summary>
              Research v{row.version} · {row.investigationId} ·{" "}
              {row.review.kind.replaceAll("_", " ")}
            </summary>
            <p className="mt-2 whitespace-pre-wrap leading-7">{row.summary}</p>
            {row.claims.map((claim, i) => (
              <p className="mt-2 leading-7" key={i}>
                {claim.text}
              </p>
            ))}
          </details>
        ))}
        {data.scripts.map((row) => (
          <details key={row._id} className="py-3">
            <summary>
              Script v{row.version} · {row.review.kind.replaceAll("_", " ")}
            </summary>
            {row.scenes.map((scene, i) => (
              <div key={i} className="mt-3">
                <p className="whitespace-pre-wrap leading-7">
                  {scene.narration}
                </p>
                <p className="text-muted-foreground">{scene.visual}</p>
              </div>
            ))}
          </details>
        ))}
      </details>
    </>
  );
}
function Review({
  row,
  kind,
  blocked = false,
}: {
  row: Doc<"researchVersions"> | Doc<"scriptVersions">;
  kind: "research" | "script";
  blocked?: boolean;
}) {
  const { write, pending, error } = useRelayWrite();
  const [note, setNote] = useState("");
  return (
    <div className="mt-8 border-t border-border pt-5">
      <p className="mb-4 text-sm">
        Version {row.version} · {row.review.kind.replaceAll("_", " ")}
      </p>
      {row.review.kind === "changes_requested" ? (
        <p className="mb-4 text-sm">{row.review.note}</p>
      ) : null}
      {row.review.kind === "draft" ? (
        <Button
          disabled={pending || blocked}
          onClick={() =>
            write({
              kind: kind === "research" ? "submit_research" : "submit_script",
              versionId: row._id,
            })
          }
        >
          Submit for review
        </Button>
      ) : row.review.kind === "in_review" ? (
        <div className="grid max-w-xl gap-4">
          <Field label="Revision note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={4000}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={pending || blocked}
              onClick={() =>
                write({
                  kind:
                    kind === "research" ? "review_research" : "review_script",
                  versionId: row._id,
                  decision: "approved",
                  note: "",
                })
              }
            >
              Approve {kind}
            </Button>
            <Button
              variant="outline"
              disabled={pending || !note.trim()}
              onClick={() =>
                write({
                  kind:
                    kind === "research" ? "review_research" : "review_script",
                  versionId: row._id,
                  decision: "changes_requested",
                  note,
                })
              }
            >
              Request changes
            </Button>
          </div>
        </div>
      ) : null}
      <ErrorMessage error={error} />
    </div>
  );
}
function Research({ row }: { row: Doc<"researchVersions"> }) {
  const { write, pending, error } = useRelayWrite();
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(row.summary);
  const [claims, setClaims] = useState(row.claims);
  const [requestId] = useState(() => crypto.randomUUID());
  return (
    <section className="max-w-[720px]">
      {editing ? (
        <form
          className="grid gap-6"
          onSubmit={async (e) => {
            e.preventDefault();
            await write({
              kind: "save_research",
              topicId: row.topicId,
              investigationId: row.investigationId,
              expectedVersion: row.version,
              summary,
              claims,
              requestId,
            });
          }}
        >
          <Field label="Summary">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              maxLength={20000}
            />
          </Field>
          {claims.map((claim, index) => (
            <div key={index} className="grid gap-4 border-t border-border pt-5">
              <Field label={`Claim ${index + 1}`}>
                <Textarea
                  value={claim.text}
                  required
                  maxLength={4000}
                  onChange={(e) =>
                    setClaims(
                      claims.map((item, i) =>
                        i === index ? { ...item, text: e.target.value } : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Assessment">
                <select
                  className="min-h-9 rounded-md border border-border-strong bg-background px-3"
                  value={claim.assessment}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "supported" ||
                      value === "disputed" ||
                      value === "uncertain"
                    )
                      setClaims(
                        claims.map((item, i) =>
                          i === index ? { ...item, assessment: value } : item,
                        ),
                      );
                  }}
                >
                  <option value="supported">Supported</option>
                  <option value="disputed">Disputed</option>
                  <option value="uncertain">Uncertain</option>
                </select>
              </Field>
              <Field label="Assessment note">
                <Textarea
                  value={claim.note}
                  maxLength={4000}
                  onChange={(e) =>
                    setClaims(
                      claims.map((item, i) =>
                        i === index ? { ...item, note: e.target.value } : item,
                      ),
                    )
                  }
                />
              </Field>
            </div>
          ))}
          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              Save new version
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
          <ErrorMessage error={error} />
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-[15px] leading-7">
            {row.summary}
          </p>
          <div className="mt-8 divide-y divide-border">
            {row.claims.map((claim, index) => (
              <article key={index} className="py-5">
                <p className="text-[15px] leading-7">{claim.text}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {claim.assessment} · {claim.note}
                </p>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer">
                    Evidence ({claim.evidence.length})
                  </summary>
                  {claim.evidence.map((source, i) => (
                    <div key={i} className="mt-4">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4"
                      >
                        {source.title}
                      </a>
                      <blockquote className="my-2 border-s-2 border-border ps-4 leading-7">
                        {source.excerpt}
                      </blockquote>
                      <p className="text-xs text-muted-foreground">
                        Agent-supplied · Retrieved{" "}
                        {new Date(source.retrievedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </details>
              </article>
            ))}
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setEditing(true)}
          >
            Revise research
          </Button>
          <Review row={row} kind="research" />
        </>
      )}
    </section>
  );
}
function Script({
  row,
  research,
}: {
  row: Doc<"scriptVersions">;
  research: Doc<"researchVersions">[];
}) {
  const { write, pending, error } = useRelayWrite();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [scenes, setScenes] = useState(row.scenes);
  const [requestId] = useState(() => crypto.randomUUID());
  const source = research.find((item) => item._id === row.researchVersionId);
  const latest = source
    ? research.find((item) => item.investigationId === source.investigationId)
    : null;
  const outdated =
    !source || source.review.kind !== "approved" || latest?._id !== source._id;
  return (
    <section className="max-w-[720px]">
      {outdated ? (
        <p className="mb-6 text-sm" role="status">
          This script uses older research. Ask your agent to revise it against
          the current approved version.
        </p>
      ) : (
        <p className="mb-6 text-xs text-muted-foreground">
          Based on research v{source.version}
        </p>
      )}
      {editing ? (
        <form
          className="grid gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            await write({
              kind: "save_script",
              topicId: row.topicId,
              researchVersionId: row.researchVersionId,
              expectedVersion: row.version,
              title,
              scenes,
              requestId,
            });
          }}
        >
          <Field label="Title">
            <Input
              value={title}
              required
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          {scenes.map((scene, index) => (
            <div key={index} className="grid gap-4 border-t border-border pt-5">
              <Field label={`Scene ${index + 1} narration`}>
                <Textarea
                  required
                  value={scene.narration}
                  maxLength={10000}
                  onChange={(e) =>
                    setScenes(
                      scenes.map((item, i) =>
                        i === index
                          ? { ...item, narration: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Visual plan">
                <Textarea
                  required
                  value={scene.visual}
                  maxLength={10000}
                  onChange={(e) =>
                    setScenes(
                      scenes.map((item, i) =>
                        i === index
                          ? { ...item, visual: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
            </div>
          ))}
          <div className="flex gap-3">
            <Button type="submit" disabled={pending || outdated}>
              Save new version
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
          <ErrorMessage error={error} />
        </form>
      ) : (
        <>
          <h2 className="text-lg font-semibold">{row.title}</h2>
          {row.scenes.map((scene, index) => (
            <article className="mt-6" key={index}>
              <h3 className="mb-2 text-xs text-muted-foreground">
                Scene {index + 1}
              </h3>
              <p className="whitespace-pre-wrap text-[15px] leading-7">
                {scene.narration}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {scene.visual}
              </p>
            </article>
          ))}
          <Button
            className="mt-6"
            variant="outline"
            disabled={outdated}
            onClick={() => setEditing(true)}
          >
            Revise script
          </Button>
          <Review row={row} kind="script" blocked={outdated} />
        </>
      )}
    </section>
  );
}
