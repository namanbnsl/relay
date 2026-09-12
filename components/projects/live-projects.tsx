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
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Circle,
  FileText,
  Folder,
  History,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
} from "lucide-react";
import {
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast-manager";
import { Field } from "./workspace-field";
import { createRequestKey } from "./workspace-request-key";
import { formatUtcDate } from "./workspace-time";
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
type ProjectData = Extract<
  FunctionReturnType<typeof api.relay.read>,
  { kind: "project" }
>;
export function useRelayWrite() {
  const mutate = useMutation(api.relay.write);
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function write(command: Command) {
    if (locked.current) return null;
    locked.current = true;
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
      locked.current = false;
      setPending(false);
    }
  }
  return { write, pending, error };
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
  const router = useRouter();
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
                  {formatUtcDate(project._creationTime)}
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
        description="A home for your ideas and the work you create with your agent."
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
              router.push(`/projects/${result.id}`);
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
  if (!data || data.kind !== "project")
    return (
      <ProjectFrame title="Workspace">
        <DocumentLoading />
      </ProjectFrame>
    );
  return <LoadedProject projectId={projectId} data={data} />;
}

function LoadedProject({
  projectId,
  data,
}: {
  projectId: string;
  data: ProjectData;
}) {
  const searchParams = useSearchParams();
  const selected = searchParams.get("topic") ?? "";
  const discover = searchParams.get("view") === "discover";
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
  return (
    <ProjectFrame title={data.project.name}>
      {!selected || discover ? (
        <WorkspaceNavigation projectId={projectId} discover={discover} />
      ) : null}
      <ProjectView
        projectId={projectId}
        data={data}
        selected={selected}
        discover={discover}
        onSelect={setSelected}
      />
    </ProjectFrame>
  );
}

function ProjectView({
  projectId,
  data,
  selected,
  discover,
  onSelect,
}: {
  projectId: string;
  data: ProjectData;
  selected: string;
  discover: boolean;
  onSelect: (topicId: string) => void;
}) {
  if (discover) return <Discover projectId={projectId} topics={data.topics} />;
  if (selected)
    return (
      <Topic
        key={selected}
        topicId={selected}
        projectId={projectId}
        onBack={() => onSelect("")}
      />
    );
  return <ProjectTopics projectId={projectId} data={data} onSelect={onSelect} />;
}

function ProjectTopics({
  projectId,
  data,
  onSelect,
}: {
  projectId: string;
  data: ProjectData;
  onSelect: (topicId: string) => void;
}) {
  const { write, pending, error } = useRelayWrite();
  const topicRequest = useRef<string | null>(null);
  const [adding, setAdding] = useState(false);
  const createTrigger = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.toLowerCase();
  const topicRows = data.topics.reduce<ReactNode[]>((rows, topic) => {
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
              onSelect(topic._id);
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
                  : topic.nextResearchAt
                    ? "Scheduled"
                    : "On demand"}{" "}
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
    <>
          <WorkspaceHeading
            title={data.project.name}
            description="Your ideas, research, and scripts. Pick up where you left off."
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
                  requestKey: (topicRequest.current ??= createRequestKey()),
                  projectId,
                  title: String(values.get("title") ?? ""),
                  question: String(values.get("question") ?? ""),
                });
                if (result) {
                  topicRequest.current = null;
                  setAdding(false);
                  onSelect(result.id);
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
          <div className="workspace-topic-toolbar mb-2 flex items-center justify-between gap-4">
            <h2 className="shrink-0 text-sm font-medium">
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
  const [selectedTab, setTab] = useState<
    "brief" | "research" | "script" | null
  >(null);
  if (!data || data.kind !== "topic") return <DocumentLoading />;
  if (data.topic.projectId !== projectId)
    return <p>Topic not found in this workspace.</p>;
  const latest = data.research[0];
  const script = data.scripts[0];
  const tab =
    selectedTab ?? (script ? "script" : latest ? "research" : "brief");
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
                <span className="workspace-step-number">
                  {item === "brief" ? "1" : item === "research" ? "2" : "3"}
                </span>
                {item}
              </button>
            ),
          )}
        </nav>
        {tab !== "brief" ? <TopicHistory topicId={topicId} tab={tab} /> : null}
      </div>
      {tab === "brief" ? (
        <TopicBrief topic={data.topic} onResearch={() => setTab("research")} />
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
  if (tab === "research")
    return <ResearchTopicDocument latest={latest} data={data} />;
  if (script)
    return (
      <div className="workspace-document">
        <ScriptDocument row={script} research={data.research} />
      </div>
    );
  return (
    <EmptyScriptDocument
      latest={latest}
      data={data}
      onViewResearch={onViewResearch}
    />
  );
}

function ResearchTopicDocument({
  latest,
  data,
}: {
  latest: Doc<"researchVersions"> | undefined;
  data: TopicData;
}) {
  return (
    <div className="workspace-document">
      {latest ? (
        <>
          <Research row={latest} />
          {data.draft?.openQuestions.length ? (
            <section className="mt-8">
              <h3 className="text-sm font-medium">Gaps & open questions</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {data.draft.openQuestions.map((question) => (
                  <li key={question}>{question}</li>
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
            prompt={`Research the Relay topic “${data.topic.title}” (topic ID ${data.topic._id}) in project ${data.topic.projectId}. Investigate: ${data.topic.question} Break the question into useful subtopics, read supporting sources, resolve important gaps, and cross-check material claims with an independent model. Record uncertainty and verification honestly, then save the completed research in Relay for my review. Continue through research and saving without asking me to manage intermediate steps.`}
          />
        </EmptyDocument>
      )}
    </div>
  );
}

function EmptyScriptDocument({
  latest,
  data,
  onViewResearch,
}: {
  latest: Doc<"researchVersions"> | undefined;
  data: TopicData;
  onViewResearch: () => void;
}) {
  const ready = latest?.review.kind === "approved";
  return (
    <div className="workspace-document">
      <EmptyDocument
        title={
          ready
            ? "Your research is ready to become a story"
            : "Research comes first"
        }
        description={
          ready
            ? "Ask your agent to turn the approved findings into narration and a visual plan."
            : "Review and approve the research, then build your script on a solid foundation."
        }
      >
        {ready ? (
          <AgentPrompt
            prompt={`Read the current approved research for the Relay topic “${data.topic.title}”. Write and save a video script with a clear title, hook, ordered scenes, narration, and a concrete visual plan for each scene. Use charts, sourced data, or real assets where the evidence supports them. Stop for my review.`}
          />
        ) : (
          <Button variant="outline" onClick={onViewResearch}>
            View research
            <ChevronRight aria-hidden />
          </Button>
        )}
      </EmptyDocument>
    </div>
  );
}
function sceneKey(scene: { narration: string; visual: string }) {
  return `${scene.narration}\u0000${scene.visual}`;
}
function sourceKey(source: unknown) {
  return JSON.stringify(source);
}
function fixedRows<T>(prefix: string, values: T[]) {
  return values.map((value, index) => ({
    key: `${prefix}:${index}`,
    value,
  }));
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
function approvalBlockers(row: Doc<"researchVersions">) {
  return row.claims.flatMap((claim, index) => {
    const reasons: string[] = [];
    if (claim.assessment !== "supported") reasons.push(claim.assessment);
    if (claim.evidence.length === 0) reasons.push("no attached source");
    return reasons.length
      ? [`Finding ${index + 1}: ${reasons.join(" and ")}.`]
      : [];
  });
}
function Review({
  row,
  kind,
  blockers = [],
  compact = false,
}: {
  row: Doc<"researchVersions"> | Doc<"scriptVersions">;
  kind: "research" | "script";
  blockers?: string[];
  compact?: boolean;
}) {
  const { write, pending, error } = useRelayWrite();
  const [note, setNote] = useState("");
  const [requesting, setRequesting] = useState(false);
  const blockerId = `approval-blockers-${row._id}`;
  const commandKind =
    kind === "research" ? "review_research" : "review_script";
  return (
    <div className={`workspace-review ${compact ? "!mt-0 mb-7" : ""}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <ReviewIcon kind={row.review.kind} />
        {reviewLabel(row.review)}
      </div>
      {row.review.kind === "changes_requested" ? (
        <p className="mb-4 text-sm">{row.review.note}</p>
      ) : null}
      <ReviewBlockers
        show={row.review.kind === "pending"}
        kind={kind}
        blockers={blockers}
        blockerId={blockerId}
      />
      {row.review.kind === "pending" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            aria-describedby={blockers.length ? blockerId : undefined}
            disabled={pending || blockers.length > 0}
            onClick={() =>
              write({
                kind: commandKind,
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
                  kind: commandKind,
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

function ReviewIcon({
  kind,
}: {
  kind: Doc<"researchVersions">["review"]["kind"];
}) {
  if (kind === "approved") return <Check size={16} aria-hidden />;
  if (kind === "changes_requested")
    return <MessageSquare size={16} aria-hidden />;
  return <Circle size={14} aria-hidden />;
}

function ReviewBlockers({
  show,
  kind,
  blockers,
  blockerId,
}: {
  show: boolean;
  kind: "research" | "script";
  blockers: string[];
  blockerId: string;
}) {
  if (!show || blockers.length === 0) return null;
  return (
    <div
      id={blockerId}
      role="status"
      className="w-full rounded-lg bg-surface-subtle p-4 text-sm leading-6"
    >
      <p className="font-medium">Approval needs attention</p>
      <p className="mt-1 text-muted-foreground">
        {kind === "research"
          ? "Every finding must be supported and have at least one source."
          : "The script must use the current approved research."}
      </p>
      <ul className="mt-2 list-disc space-y-1 ps-5 text-muted-foreground">
        {blockers.map((blocker) => (
          <li key={blocker}>{blocker}</li>
        ))}
      </ul>
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
  const [editableClaims, setEditableClaims] = useState(() =>
    fixedRows(`${row._id}:claim`, row.claims),
  );
  const [baseId, setBaseId] = useState(row._id);
  const blockers = approvalBlockers(row);
  const documentClaims = row.claims.map((claim, index) => ({
    claim,
    verification: row.findings?.[index]?.verification,
    key: row.findings?.[index]?.id ?? sourceKey(claim),
  }));
  const claims = editableClaims.map(({ value }) => value);
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
              setEditableClaims(fixedRows(`${row._id}:claim`, row.claims));
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
          blockers={blockers}
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
          {editableClaims.map(({ key, value: claim }, index) => (
            <div key={key} className="grid gap-4 border-t border-border pt-5">
              <Field label={`Finding ${index + 1}`}>
                <Textarea
                  disabled={pending}
                  value={claim.text}
                  required
                  maxLength={4000}
                  onChange={(e) =>
                    setEditableClaims(
                      editableClaims.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              value: { ...item.value, text: e.target.value },
                            }
                          : item,
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
                      setEditableClaims(
                        editableClaims.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                value: { ...item.value, assessment: value },
                              }
                            : item,
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
                    setEditableClaims(
                      editableClaims.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              value: { ...item.value, note: e.target.value },
                            }
                          : item,
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
            {documentClaims.map(({ claim, key, verification }, index) => (
              <article key={key}>
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
                {verification ? (
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    Cross-checked by {verification.model} · {verification.verdict}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          <details className="mt-10 border-t border-border py-4">
            <summary className="min-h-9 cursor-pointer text-sm font-medium">
              Sources
            </summary>
            {documentClaims.map(({ claim, key }, index) => (
              <div key={key} className="mt-5 space-y-4">
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
  const [editing, setEditing] = useState(false);
  const [showVisuals, setShowVisuals] = useState(false);
  const source = research.find((item) => item._id === row.researchVersionId);
  const latest = research[0];
  const outdated =
    !source || source.review.kind !== "approved" || latest?._id !== source._id;
  return (
    <section className="max-w-[720px]">
      <ScriptSource source={source} fallbackId={row.researchVersionId} />
      {!editing ? (
        <ScriptToolbar
          row={row}
          showVisuals={showVisuals}
          outdated={outdated}
          onToggleVisuals={() => setShowVisuals((shown) => !shown)}
          onEdit={() => setEditing(true)}
        />
      ) : null}
      {outdated ? (
        <p className="mb-6 text-sm" role="status">
          This script uses older research. Ask your agent to revise it against
          the current approved version.
        </p>
      ) : null}
      {editing ? (
        <ScriptEditor
          row={row}
          outdated={outdated}
          onClose={() => setEditing(false)}
        />
      ) : (
        <PublishedScript row={row} showVisuals={showVisuals} outdated={outdated} />
      )}
    </section>
  );
}

function ScriptSource({
  source,
  fallbackId,
}: {
  source: Doc<"researchVersions"> | undefined;
  fallbackId: string;
}) {
  const label = source?.draftRevision
    ? `revision ${source.draftRevision}`
    : source
      ? `saved ${formatUtcDate(source._creationTime)}`
      : fallbackId;
  return (
    <p className="mb-4 text-xs text-muted-foreground">
      Based on approved research {label}. Approval remains attached to that
      exact version.
    </p>
  );
}

function ScriptToolbar({
  row,
  showVisuals,
  outdated,
  onToggleVisuals,
  onEdit,
}: {
  row: Doc<"scriptVersions">;
  showVisuals: boolean;
  outdated: boolean;
  onToggleVisuals: () => void;
  onEdit: () => void;
}) {
  const words = row.scenes.reduce(
    (total, scene) => total + scene.narration.trim().split(/\s+/).length,
    0,
  );
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">
        {row.scenes.length} scenes · {words} words
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" aria-pressed={showVisuals} onClick={onToggleVisuals}>
          {showVisuals ? "Hide visuals" : "Show visuals"}
        </Button>
        <Button variant="ghost" disabled={outdated} onClick={onEdit}>
          <Pencil aria-hidden />
          Edit
        </Button>
      </div>
    </div>
  );
}

function ScriptEditor({
  row,
  outdated,
  onClose,
}: {
  row: Doc<"scriptVersions">;
  outdated: boolean;
  onClose: () => void;
}) {
  const { write, pending, error } = useRelayWrite();
  const [title, setTitle] = useState(row.title);
  const [editableScenes, setEditableScenes] = useState(() =>
    fixedRows(`${row._id}:scene`, row.scenes),
  );
  const scenes = editableScenes.map(({ value }) => value);
  const dirty =
    title !== row.title || JSON.stringify(scenes) !== JSON.stringify(row.scenes);
  useDraftProtection(dirty);
  function updateScene(
    index: number,
    field: "narration" | "visual",
    value: string,
  ) {
    setEditableScenes((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, value: { ...item.value, [field]: value } }
          : item,
      ),
    );
  }
  return (
    <form
      className="grid gap-5"
      action={async () => {
        const result = await write({
          kind: "save_script",
          researchVersionId: row.researchVersionId,
          baseId: row._id,
          title,
          scenes,
        });
        if (result) onClose();
      }}
    >
      <Field label="Title">
        <Input
          disabled={pending}
          value={title}
          required
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {editableScenes.map(({ key, value: scene }, index) => (
        <div key={key} className="grid gap-4 border-t border-border pt-5">
          <Field label={`Scene ${index + 1} narration`}>
            <Textarea
              disabled={pending}
              required
              value={scene.narration}
              maxLength={10000}
              onChange={(event) =>
                updateScene(index, "narration", event.target.value)
              }
            />
          </Field>
          <Field label="Visual plan">
            <Textarea
              disabled={pending}
              required
              value={scene.visual}
              maxLength={10000}
              onChange={(event) =>
                updateScene(index, "visual", event.target.value)
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
            if (!dirty || window.confirm("Discard your unsaved changes?"))
              onClose();
          }}
        >
          Cancel
        </Button>
      </div>
      <ErrorMessage error={error} />
    </form>
  );
}

function PublishedScript({
  row,
  showVisuals,
  outdated,
}: {
  row: Doc<"scriptVersions">;
  showVisuals: boolean;
  outdated: boolean;
}) {
  return (
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
      <Review
        row={row}
        kind="script"
        blockers={outdated ? ["This script is based on older research."] : []}
      />
    </>
  );
}
