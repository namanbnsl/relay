"use client";
import {
  Discover,
  WorkspaceNavigation,
  TopicBrief,
  InvestigationStatus,
} from "./discovery-workspace";
import { ResearchExecution } from "./research-execution";

import {
  useConvexAuth,
  useMutation,
  useQuery,
  usePaginatedQuery,
} from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionArgs } from "convex/server";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Circle,
  FileText,
  Folder,
  History,
  Layers2,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
} from "lucide-react";
import {
  cloneElement,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast-manager";
import { workspaceSelectClass, WorkspaceHeading } from "./workspace-ui";
import {
  AgentPrompt,
  DocumentLoading,
  EmptyDocument,
  WorkspaceDialog,
  useDraftProtection,
} from "./workspace-interactions";

import { ProjectFrame } from "./project-frame";
export { ProjectFrame } from "./project-frame";

type Command = FunctionArgs<typeof api.relay.write>["command"];
export function useRelayWrite() {
  const mutate = useMutation(api.relay.write);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function write(command: Command) {
    setPending(true);
    setError("");
    try {
      const result = await mutate({ command });
      toast.add({
        title:
          command.kind === "create_project"
            ? "Workspace created"
            : command.kind === "create_topic"
              ? "Topic created"
              : command.kind === "review_research" ||
                  command.kind === "review_script"
                ? command.decision === "approved"
                  ? "Approved. Your decision is saved."
                  : "Feedback sent. Your agent can read it in Relay."
                : "Changes saved. Ready for review.",
        type: "success",
      });
      return result;
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
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  return (
    <div className="grid gap-2 text-sm">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
export function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <p
      role="alert"
      className="my-4 rounded-lg border border-destructive/30 bg-destructive-subtle p-3 text-sm text-destructive"
    >
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
  const createTrigger = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const projectRows =
    data?.kind === "projects"
      ? data.projects.reduce<ReactNode[]>((rows, project) => {
          if (!project.name.toLowerCase().includes(search.toLowerCase())) {
            return rows;
          }
          rows.push(
            <Link
              key={project._id}
              href={`/projects/${project._id}`}
              className="workspace-list-row"
            >
              <span className="workspace-list-icon">
                <Folder size={19} strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-medium break-words">{project.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created{" "}
                  {new Date(project._creationTime).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
              </div>
              <ChevronRight
                className="text-muted-foreground"
                size={16}
                aria-hidden
              />
            </Link>,
          );
          return rows;
        }, [])
      : [];
  return (
    <ProjectFrame title="Workspaces">
      <WorkspaceHeading
        title="Workspaces"
        description="Research and scripts, saved in one place."
        action={
          <Button
            onClick={(event) => {
              createTrigger.current = event.currentTarget;
              setAdding(true);
            }}
          >
            <Plus aria-hidden />
            New workspace
          </Button>
        }
      />
      <WorkspaceDialog
        open={adding}
        returnFocusRef={createTrigger}
        onOpenChange={setAdding}
        title="Create a workspace"
        description="One YouTube channel or editorial project."
        trigger={<button className="hidden" aria-hidden tabIndex={-1} />}
      >
        <form
          className="grid gap-5"
          action={async (values) => {
            const result = await write({
              kind: "create_project",
              name: String(values.get("name") ?? ""),
            });
            if (result) {
              setAdding(false);
            }
          }}
        >
          <Field label="Name">
            <Input
              disabled={pending}
              name="name"
              placeholder="e.g. The weekly explainer"
              autoComplete="off"
              required
              maxLength={160}
            />
          </Field>
          <Button
            disabled={pending}
            className="justify-self-start"
            type="submit"
          >
            {pending ? "Saving…" : "Create workspace"}
          </Button>
        </form>
        <ErrorMessage error={error} />
      </WorkspaceDialog>
      <SearchInput
        className="workspace-search"
        label="Find a workspace"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Find a workspace…"
      />
      {!data ? (
        <DocumentLoading />
      ) : data.kind === "projects" ? (
        <div className="divide-y divide-border">
          {data.projects.length === 0 ? (
            <EmptyDocument
              title="A home for your next idea"
              description="Create a workspace, add a topic, and turn research into a script."
            >
              <Button
                onClick={(event) => {
                  createTrigger.current = event.currentTarget;
                  setAdding(true);
                }}
              >
                <Plus aria-hidden />
                Create a workspace
              </Button>
            </EmptyDocument>
          ) : (
            projectRows
          )}
          {data.projects.length > 0 && projectRows.length === 0 ? (
            <EmptyDocument
              title="No matching workspaces"
              description="Try a different name or clear your search."
            >
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            </EmptyDocument>
          ) : null}
        </div>
      ) : null}
    </ProjectFrame>
  );
}
export function Project({ projectId }: { projectId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(
    api.relay.read,
    isAuthenticated ? { command: { kind: "project", projectId } } : "skip",
  );
  const { write, pending, error } = useRelayWrite();
  const searchParams = useSearchParams();
  const selected = searchParams.get("topic") ?? "";
  const discover = searchParams.get("view") === "discover";
  const topicRequest = useRef<string | null>(null);
  function setSelected(topicId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (topicId) params.set("topic", topicId);
    else params.delete("topic");
    const query = params.toString();
    window.history.pushState(
      null,
      "",
      `/projects/${projectId}${query ? `?${query}` : ""}`,
    );
  }
  const [adding, setAdding] = useState(false);
  const createTrigger = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  if (!data || data.kind !== "project")
    return (
      <ProjectFrame title="Workspace">
        <DocumentLoading />
      </ProjectFrame>
    );
  const normalizedSearch = search.toLowerCase();
  const topicRows = selected
    ? []
    : data.topics.reduce<ReactNode[]>((rows, topic) => {
        if (
          !`${topic.title} ${topic.question}`
            .toLowerCase()
            .includes(normalizedSearch)
        ) {
          return rows;
        }
        rows.push(
          <Link
            key={topic._id}
            href={`/projects/${projectId}?topic=${topic._id}`}
            prefetch={false}
            onNavigate={(event) => {
              event.preventDefault();
              setSelected(topic._id);
            }}
            className="workspace-list-row"
          >
            <span className="workspace-list-icon">
              <FileText size={18} strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium break-words">{topic.title}</h3>
              <p className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">
                {topic.question}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {topic.frequency?.kind === "daily"
                  ? topic.frequency.paused
                    ? "Daily · Paused"
                    : "Daily"
                  : "One-time"}{" "}
                ·{" "}
                {topic.status && topic.status !== "active"
                  ? topic.status
                  : (data.topicStates?.find((s) => s.topicId === topic._id)
                      ?.status ?? "Not researched")}
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-muted-foreground"
              aria-hidden
            />
          </Link>,
        );
        return rows;
      }, []);
  return (
    <ProjectFrame title={data.project.name}>
      <WorkspaceNavigation projectId={projectId} discover={discover} />
      {discover ? (
        <Discover projectId={projectId} topics={data.topics} />
      ) : selected ? (
        <Topic
          key={selected}
          topicId={selected}
          projectId={projectId}
          onBack={() => setSelected("")}
        />
      ) : (
        <>
          <WorkspaceHeading
            title={data.project.name}
            description="Every good script starts with a question."
            action={
              <Button
                onClick={(event) => {
                  createTrigger.current = event.currentTarget;
                  setAdding(true);
                }}
              >
                <Plus aria-hidden />
                New topic
              </Button>
            }
          />
          <WorkspaceDialog
            open={adding}
            returnFocusRef={createTrigger}
            onOpenChange={setAdding}
            title="Create a topic"
            description="Give your agent a clear question to investigate."
            trigger={<button className="hidden" aria-hidden tabIndex={-1} />}
          >
            <form
              className="grid gap-5"
              action={async (values) => {
                const result = await write({
                  kind: "create_topic",
                  requestKey: (topicRequest.current ??= crypto.randomUUID()),
                  projectId,
                  title: String(values.get("title") ?? ""),
                  question: String(values.get("question") ?? ""),
                });
                if (result) {
                  topicRequest.current = null;
                  setAdding(false);
                  setSelected(result.id);
                }
              }}
            >
              <Field label="Title">
                <Input
                  disabled={pending}
                  name="title"
                  placeholder="e.g. How browser caching works"
                  required
                  maxLength={160}
                />
              </Field>
              <Field label="Research question">
                <Textarea
                  disabled={pending}
                  name="question"
                  placeholder="What should the research help us understand?"
                  required
                  maxLength={12000}
                />
              </Field>
              <Button
                disabled={pending}
                type="submit"
                className="justify-self-start"
              >
                {pending ? "Saving…" : "Create topic"}
              </Button>
            </form>
            <ErrorMessage error={error} />
          </WorkspaceDialog>
          <div className="mb-2 flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium">
              Topics{" "}
              <span className="ms-2 text-xs text-muted-foreground">
                {data.topics.length}
              </span>
            </h2>
            <SearchInput
              className="workspace-search !mb-0"
              label="Find a topic"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a topic…"
            />
          </div>
          <div className="divide-y divide-border">
            {data.topics.length ? (
              topicRows
            ) : (
              <EmptyDocument
                title="What will you explore?"
                description="Add your first topic to give your research a direction."
              >
                <Button
                  variant="outline"
                  onClick={(event) => {
                    createTrigger.current = event.currentTarget;
                    setAdding(true);
                  }}
                >
                  <Plus aria-hidden />
                  Create a topic
                </Button>
              </EmptyDocument>
            )}
            {data.topics.length > 0 && topicRows.length === 0 ? (
              <EmptyDocument
                title="No matching topics"
                description="Try another search or start a new topic."
              >
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              </EmptyDocument>
            ) : null}
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
  const [tab, setTab] = useState<"brief" | "research" | "script">("brief");
  if (!data || data.kind !== "topic") return <DocumentLoading />;
  if (data.topic.projectId !== projectId)
    return <p>Topic not found in this workspace.</p>;
  const latest = data.research[0];
  const script = data.scripts[0];
  return (
    <>
      <button
        onClick={onBack}
        data-document-navigation
        className="mb-7 inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary focus-visible:outline-2"
      >
        <ArrowLeft size={14} aria-hidden />
        All topics
      </button>
      <WorkspaceHeading title={data.topic.title} />
      <p className="mb-6 max-w-[720px] whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
        {data.topic.question}
      </p>
      <div className="workspace-document-nav">
        <nav aria-label="Topic sections" className="flex gap-5">
          {(["brief", "research", "script"] satisfies Array<typeof tab>).map(
            (item) => (
              <button
                key={item}
                aria-pressed={tab === item}
                onClick={() => setTab(item)}
                data-document-navigation
                className={`min-h-10 border-b-2 text-sm capitalize focus-visible:outline-2 ${tab === item ? "border-foreground" : "border-transparent text-muted-foreground"}`}
              >
                {item === "research" ? (
                  <FileText size={15} aria-hidden />
                ) : (
                  <Layers2 size={15} aria-hidden />
                )}
                {item}
              </button>
            ),
          )}
        </nav>
        {tab !== "brief" ? <TopicHistory topicId={topicId} tab={tab} /> : null}
      </div>
      {tab === "brief" ? (
        <TopicBrief topic={data.topic} />
      ) : (
        <>
          <TopicDocument
            tab={tab}
            latest={latest}
            script={script}
            data={data}
            onViewResearch={() => setTab("research")}
          />
          {tab === "research" ? (
            <>
              <InvestigationStatus projectId={projectId} topicId={topicId} />
              <ResearchExecution topicId={topicId} />
            </>
          ) : null}
        </>
      )}
    </>
  );
}
type TopicData = {
  topic: Doc<"topics">;
  research: Doc<"researchVersions">[];
  scripts: Doc<"scriptVersions">[];
  draft?: Doc<"researchDrafts"> | null;
};
function TopicHistory({
  topicId,
  tab,
}: {
  topicId: string;
  tab: "research" | "script";
}) {
  const history = usePaginatedQuery(
    api.relay.history,
    { topicId, kind: tab },
    { initialNumItems: 10 },
  );
  const rows = history.results;
  return (
    <WorkspaceDialog
      title="Document history"
      description="Recent versions, with their original sources and review decisions."
      trigger={
        <Button variant="ghost" size="sm" aria-label="Document history">
          <History aria-hidden />
          <span className="hidden sm:inline">History</span>
        </Button>
      }
    >
      <div className="space-y-3">
        {rows.map((row) => (
          <details
            key={row._id}
            className="rounded-lg border border-border p-4"
          >
            <summary className="cursor-pointer text-sm">
              {new Date(row._creationTime).toLocaleString("en-US", {
                timeZone: "UTC",
              })}{" "}
              · {reviewLabel(row.review)}
            </summary>
            <div className="mt-5">
              {"summary" in row ? (
                <Research row={row} readOnly />
              ) : (
                <>
                  <h3 className="mb-3 font-medium">{row.title}</h3>
                  {row.scenes.map((scene) => (
                    <div key={sceneKey(scene)} className="mb-5">
                      <p className="text-sm leading-7">{scene.narration}</p>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        {scene.visual}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </details>
        ))}
        {history.status === "CanLoadMore" ? (
          <Button variant="outline" onClick={() => history.loadMore(10)}>
            Load older versions
          </Button>
        ) : history.status === "LoadingMore" ||
          history.status === "LoadingFirstPage" ? (
          <p role="status">Loading history…</p>
        ) : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Saved versions will appear here.
          </p>
        ) : null}
      </div>
    </WorkspaceDialog>
  );
}
function TopicDocument({
  tab,
  latest,
  script,
  data,
  onViewResearch,
}: {
  tab: "research" | "script";
  latest: Doc<"researchVersions"> | undefined;
  script: Doc<"scriptVersions"> | undefined;
  data: TopicData;
  onViewResearch: () => void;
}) {
  return (
    <div className="workspace-document">
      {tab === "research" ? (
        latest ? (
          <>
            <Research row={latest} />
            {data.draft?.openQuestions.length ? (
              <section className="mt-8">
                <h3 className="text-sm font-medium">Gaps & open questions</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {data.draft.openQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          <EmptyDocument
            title="Ready for a little discovery"
            description="Ask your connected agent to investigate this question. Review the findings here when they’re ready."
          >
            <AgentPrompt
              prompt={`Research the Relay topic “${data.topic.title}” (topic ID ${data.topic._id}) in project ${data.topic.projectId}. Investigate: ${data.topic.question} Read supporting sources, resolve important gaps, and save the completed research in Relay for my review. Continue through research and saving without asking me to manage intermediate steps.`}
            />
          </EmptyDocument>
        )
      ) : script ? (
        <ScriptDocument row={script} research={data.research} />
      ) : (
        <EmptyDocument
          title={
            latest?.review.kind === "approved"
              ? "Your research is ready to become a story"
              : "Research comes first"
          }
          description={
            latest?.review.kind === "approved"
              ? "Ask your agent to turn the approved findings into narration and a visual plan."
              : "Review and approve the research, then build your script on a solid foundation."
          }
        >
          {latest?.review.kind === "approved" ? (
            <AgentPrompt
              prompt={`Read the current approved research for the Relay topic “${data.topic.title}”. Write and save a video script with narration and a visual plan for each scene. Stop for my review.`}
            />
          ) : (
            <Button variant="outline" onClick={onViewResearch}>
              View research
              <ChevronRight aria-hidden />
            </Button>
          )}
        </EmptyDocument>
      )}
    </div>
  );
}
function sceneKey(scene: { narration: string; visual: string }) {
  return `${scene.narration}\u0000${scene.visual}`;
}
function sourceKey(source: unknown) {
  return JSON.stringify(source);
}
function reviewLabel(review: Doc<"researchVersions">["review"]) {
  switch (review.kind) {
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Changes requested";
    case "pending":
      return "Ready for review";
  }
}
function Review({
  row,
  kind,
  blocked = false,
  compact = false,
}: {
  row: Doc<"researchVersions"> | Doc<"scriptVersions">;
  kind: "research" | "script";
  blocked?: boolean;
  compact?: boolean;
}) {
  const { write, pending, error } = useRelayWrite();
  const [note, setNote] = useState("");
  const [requesting, setRequesting] = useState(false);
  return (
    <div className={`workspace-review ${compact ? "!mt-0 mb-7" : ""}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {row.review.kind === "approved" ? (
          <Check size={16} aria-hidden />
        ) : row.review.kind === "changes_requested" ? (
          <MessageSquare size={16} aria-hidden />
        ) : (
          <Circle size={14} aria-hidden />
        )}
        {reviewLabel(row.review)}
      </div>
      {row.review.kind === "changes_requested" ? (
        <p className="mb-4 text-sm">{row.review.note}</p>
      ) : null}
      {row.review.kind !== "approved" &&
      row.review.kind !== "changes_requested" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending || blocked}
            onClick={() =>
              write({
                kind: kind === "research" ? "review_research" : "review_script",
                versionId: row._id,
                decision: "approved",
                note: "",
              })
            }
          >
            {pending ? (
              <Loader2 className="motion-safe:animate-spin" aria-hidden />
            ) : (
              <Check aria-hidden />
            )}
            {pending ? "Saving…" : "Approve"}
          </Button>
          <WorkspaceDialog
            open={requesting}
            onOpenChange={setRequesting}
            title="Request changes"
            description="Your agent will see this feedback alongside the document."
            trigger={
              <Button variant="ghost" disabled={pending}>
                <MessageSquare aria-hidden />
                Request changes
              </Button>
            }
          >
            <form
              action={async () => {
                const result = await write({
                  kind:
                    kind === "research" ? "review_research" : "review_script",
                  versionId: row._id,
                  decision: "changes_requested",
                  note,
                });
                if (result) setRequesting(false);
              }}
            >
              <Field label="What needs to change?">
                <Textarea
                  disabled={pending}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  required
                  maxLength={4000}
                  placeholder="Be specific about what to improve…"
                  className="min-h-32"
                />
              </Field>
              <ErrorMessage error={error} />
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRequesting(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Sending…" : "Send feedback"}
                  <ArrowUpRight aria-hidden />
                </Button>
              </div>
            </form>
          </WorkspaceDialog>
        </div>
      ) : null}
      {!requesting ? <ErrorMessage error={error} /> : null}
    </div>
  );
}
function Research({
  row,
  readOnly = false,
}: {
  row: Doc<"researchVersions">;
  readOnly?: boolean;
}) {
  const { write, pending, error } = useRelayWrite();
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(row.summary);
  const [claims, setClaims] = useState(row.claims);
  const [baseId, setBaseId] = useState(row._id);
  useDraftProtection(
    editing &&
      (summary !== row.summary ||
        claims.some((claim, index) => {
          const original = row.claims[index];
          return (
            !original ||
            claim.text !== original.text ||
            claim.assessment !== original.assessment ||
            claim.note !== original.note
          );
        })),
  );
  return (
    <section className="max-w-[720px]">
      {!readOnly && !editing ? (
        <div className="mb-7 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {row.claims.length} findings ·{" "}
            {row.claims.reduce(
              (count, claim) => count + claim.evidence.length,
              0,
            )}{" "}
            sources
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              setSummary(row.summary);
              setBaseId(row._id);
              setClaims(row.claims);
              setEditing(true);
            }}
          >
            <Pencil aria-hidden />
            Edit
          </Button>
        </div>
      ) : null}
      {!readOnly && !editing ? (
        <Review
          row={row}
          kind="research"
          compact
          blocked={row.claims.some(
            (claim) =>
              claim.assessment !== "supported" || claim.evidence.length === 0,
          )}
        />
      ) : null}
      {editing ? (
        <form
          className="grid gap-6"
          action={async () => {
            const result = await write({
              kind: "save_research",
              topicId: row.topicId,
              baseId,
              summary,
              claims,
            });
            if (result) setEditing(false);
          }}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Pencil size={13} aria-hidden />
            Editing research
          </div>
          {baseId !== row._id ? (
            <p role="alert" className="text-sm text-destructive">
              New research was saved while you were editing. Your changes are
              still here. Copy them before cancelling to load the latest
              version.
            </p>
          ) : null}
          <Field label="Summary">
            <Textarea
              disabled={pending}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              maxLength={20000}
            />
          </Field>
          {claims.map((claim, index) => (
            <div key={index} className="grid gap-4 border-t border-border pt-5">
              <Field label={`Finding ${index + 1}`}>
                <Textarea
                  disabled={pending}
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
                  disabled={pending}
                  className={workspaceSelectClass}
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
                  disabled={pending}
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
            <Button type="submit" disabled={pending || baseId !== row._id}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (
                  (summary === row.summary &&
                    claims.every((claim, index) => {
                      const original = row.claims[index];
                      return (
                        original &&
                        claim.text === original.text &&
                        claim.assessment === original.assessment &&
                        claim.note === original.note
                      );
                    })) ||
                  window.confirm("Discard your unsaved changes?")
                )
                  setEditing(false);
              }}
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
          <div className="mt-8 space-y-6">
            {row.claims.map((claim, index) => (
              <article key={index}>
                <p className="whitespace-pre-wrap text-[15px] leading-7">
                  {claim.text}{" "}
                  {claim.evidence.map((source, sourceIndex) => (
                    <sup key={sourceKey(source)} className="ms-1">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        title={source.title}
                        aria-label={`Source ${index + 1}.${sourceIndex + 1}: ${source.title}`}
                        className="rounded-sm px-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-2"
                      >
                        [{index + 1}.{sourceIndex + 1}]
                      </a>
                    </sup>
                  ))}
                </p>
                {claim.assessment !== "supported" ? (
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    <span className="capitalize">{claim.assessment}</span>
                    {claim.note ? ` · ${claim.note}` : ""}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          <details className="mt-10 border-t border-border py-4">
            <summary className="min-h-9 cursor-pointer text-sm font-medium">
              Sources
            </summary>
            {row.claims.map((claim, index) => (
              <div key={index} className="mt-5 space-y-4">
                {!claim.evidence.length ? (
                  <p className="text-sm text-muted-foreground">
                    Finding {index + 1} has no attached sources.
                  </p>
                ) : null}
                {claim.evidence.map((source, sourceIndex) => (
                  <details key={sourceKey(source)} className="text-sm">
                    <summary className="cursor-pointer leading-6">
                      [{index + 1}.{sourceIndex + 1}] {source.title}
                    </summary>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block break-all underline underline-offset-4"
                    >
                      Open source
                    </a>
                    <p className="my-3 whitespace-pre-wrap leading-7">
                      {source.excerpt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {source.retrievedAt === undefined
                        ? "Source supplied with this document"
                        : `Retrieved ${new Date(source.retrievedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}`}
                    </p>
                  </details>
                ))}
              </div>
            ))}
          </details>
          {readOnly && row.review.kind === "changes_requested" ? (
            <p className="mt-4 text-sm">{row.review.note}</p>
          ) : null}
          {!readOnly &&
          row.claims.some(
            (claim) =>
              claim.assessment !== "supported" || claim.evidence.length === 0,
          ) ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Some findings need supporting evidence. Edit the research or
              request changes before approving.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
function ScriptDocument({
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
  const [baseId, setBaseId] = useState(row._id);
  const [showVisuals, setShowVisuals] = useState(false);
  useDraftProtection(
    editing &&
      (title !== row.title ||
        JSON.stringify(scenes) !== JSON.stringify(row.scenes)),
  );
  const source = research.find((item) => item._id === row.researchVersionId);
  const latest = research[0];
  const outdated =
    !source || source.review.kind !== "approved" || latest?._id !== source._id;
  return (
    <section className="max-w-[720px]">
      <p className="mb-4 text-xs text-muted-foreground">
        Based on approved research{" "}
        {source?.draftRevision
          ? `revision ${source.draftRevision}`
          : source
            ? `saved ${new Date(source._creationTime).toLocaleDateString()}`
            : row.researchVersionId}
        . Approval remains attached to that exact version.
      </p>
      {!editing ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {row.scenes.length} scenes ·{" "}
            {row.scenes.reduce(
              (total, scene) =>
                total + scene.narration.trim().split(/\s+/).length,
              0,
            )}{" "}
            words
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              aria-pressed={showVisuals}
              onClick={() => setShowVisuals(!showVisuals)}
            >
              {showVisuals ? "Hide visuals" : "Show visuals"}
            </Button>
            <Button
              variant="ghost"
              disabled={outdated}
              onClick={() => {
                setTitle(row.title);
                setBaseId(row._id);
                setScenes(row.scenes);
                setEditing(true);
              }}
            >
              <Pencil aria-hidden />
              Edit
            </Button>
          </div>
        </div>
      ) : null}
      {outdated ? (
        <p className="mb-6 text-sm" role="status">
          This script uses older research. Ask your agent to revise it against
          the current approved version.
        </p>
      ) : (
        <p className="mb-6 text-xs text-muted-foreground">
          Based on approved research
        </p>
      )}
      {editing ? (
        <form
          className="grid gap-5"
          action={async () => {
            const result = await write({
              kind: "save_script",
              researchVersionId: row.researchVersionId,
              baseId,
              title,
              scenes,
            });
            if (result) setEditing(false);
          }}
        >
          <Field label="Title">
            <Input
              disabled={pending}
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
                  disabled={pending}
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
                  disabled={pending}
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
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (
                  (title === row.title &&
                    JSON.stringify(scenes) === JSON.stringify(row.scenes)) ||
                  window.confirm("Discard your unsaved changes?")
                )
                  setEditing(false);
              }}
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
            <article className="mt-6" key={sceneKey(scene)}>
              <h3 className="mb-2 text-xs text-muted-foreground">
                Scene {index + 1}
              </h3>
              <p className="whitespace-pre-wrap text-[15px] leading-7">
                {scene.narration}
              </p>
              {showVisuals ? (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-surface-subtle p-4 text-sm leading-7 text-muted-foreground">
                  {scene.visual}
                </p>
              ) : null}
            </article>
          ))}
          <Review row={row} kind="script" blocked={outdated} />
        </>
      )}
    </section>
  );
}
