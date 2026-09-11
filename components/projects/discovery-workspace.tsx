"use client";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionArgs } from "convex/server";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { workspaceSelectClass } from "./workspace-ui";
import {
  AgentPrompt,
  DocumentLoading,
  EmptyDocument,
} from "./workspace-interactions";

type Command = FunctionArgs<typeof api.discovery.write>["command"];
function useCommand() {
  const mutate = useMutation(api.discovery.write);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function run(command: Command) {
    if (locked.current) return null;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const id = await mutate({ command });
      setMessage("Saved");
      return id;
    } catch (e) {
      setError(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : "Could not save. Try again.",
      );
      return null;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    run,
    busy,
    feedback: (
      <>
        <p role="status" className="text-xs text-muted-foreground">
          {busy ? "Saving…" : message}
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </>
    ),
  };
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span>{label}</span>
      {children}
    </label>
  );
}
function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}
function stamp(at?: number) {
  return at === undefined ? "Not available" : new Date(at).toLocaleString();
}
export function WorkspaceNavigation({
  projectId,
  discover,
}: {
  projectId: string;
  discover: boolean;
}) {
  return (
    <nav
      aria-label="Workspace destinations"
      className="mb-8 flex gap-6 border-b border-border text-sm"
    >
      {[
        {
          title: "Discover",
          href: `/projects/${projectId}?view=discover`,
          selected: discover,
        },
        {
          title: "Topics",
          href: `/projects/${projectId}`,
          selected: !discover,
        },
      ].map((item) => (
        <Link
          key={item.title}
          href={item.href}
          aria-current={item.selected ? "page" : undefined}
          className={`min-h-11 border-b-2 py-3 ${item.selected ? "border-foreground" : "border-transparent text-muted-foreground"}`}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
export function Discover({
  projectId,
  topics,
}: {
  projectId: string;
  topics: Doc<"topics">[];
}) {
  const data = useQuery(api.discovery.read, { projectId });
  const [view, setView] = useState<"updates" | "sources">("updates");
  const [showDismissed, setShowDismissed] = useState(false);
  if (!data) return <DocumentLoading />;
  const updates = data.updates.filter((u) => showDismissed || !u.dismissed);
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Discover</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Developments worth turning into your next video.
        </p>
      </div>
      <DiscoverySettings projectId={projectId} config={data.config} />
      {!data.setup.available ? (
        <p
          role="status"
          className="border-l-2 border-border pl-4 text-sm text-muted-foreground"
        >
          {data.setup.reason}
        </p>
      ) : null}
      <nav aria-label="Discover views" className="flex gap-5">
        {(["updates", "sources"] satisfies Array<typeof view>).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            aria-pressed={view === tab}
            className={`min-h-10 border-b-2 text-sm capitalize ${view === tab ? "border-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </nav>
      {view === "updates" ? (
        <>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showDismissed}
              onChange={(e) => setShowDismissed(e.target.checked)}
            />
            Show dismissed
          </label>
          <div className="divide-y divide-border">
            {updates.length ? (
              updates.map((update) => (
                <UpdateCard key={update._id} update={update} topics={topics} />
              ))
            ) : (
              <EmptyDocument
                title="No updates yet"
                description="Add sources, then run a check or enable daily discovery. Only actual monitoring results appear here."
              >
                <Button variant="outline" onClick={() => setView("sources")}>
                  Manage sources
                </Button>
              </EmptyDocument>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Monitor websites and search queries here. These are discovery
            inputs; retrieved research evidence stays with its topic. Collection
            is not an exhaustive crawl or a guarantee of detecting every page
            edit.
          </p>
          <MonitorEditor projectId={projectId} />
          <div className="divide-y divide-border">
            {data.monitors
              .filter((m) => !m.removed || m.sync !== "ready")
              .map((m) => (
                <MonitorRow
                  key={m._id}
                  monitor={m}
                  available={data.setup.available}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
function DiscoverySettings({
  projectId,
  config,
}: {
  projectId: string;
  config: NonNullable<Doc<"projects">["discovery"]>;
}) {
  const action = useCommand();
  return (
    <details className="border-y border-border py-3">
      <summary className="cursor-pointer text-sm">Workspace settings</summary>
      <form
        key={JSON.stringify(config)}
        className="mt-5 grid max-w-2xl gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          await action.run({
            kind: "configure_discovery",
            projectId,
            config: {
              brief: value(data, "brief"),
              region: value(data, "region"),
              language: value(data, "language"),
              scope: value(data, "scope") === "websites" ? "websites" : "web",
              cadence: value(data, "cadence") === "daily" ? "daily" : "manual",
              candidates:
                value(data, "candidates") === "automatic"
                  ? "automatic"
                  : "suggest",
            },
          });
        }}
      >
        <Field label="Discovery brief">
          <Textarea
            name="brief"
            defaultValue={config.brief}
            maxLength={12000}
            placeholder="Interests, relevance criteria, and exclusions"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region (optional)">
            <Input name="region" defaultValue={config.region} maxLength={100} />
          </Field>
          <Field label="Language (optional)">
            <Input
              name="language"
              defaultValue={config.language}
              maxLength={100}
            />
          </Field>
          <Field label="Search scope">
            <select
              className={workspaceSelectClass}
              name="scope"
              defaultValue={config.scope}
            >
              <option value="websites">Selected websites only</option>
              <option value="web">Websites + wider web</option>
            </select>
          </Field>
          <Field label="Discovery cadence">
            <select
              className={workspaceSelectClass}
              name="cadence"
              defaultValue={config.cadence}
            >
              <option value="manual">Manual</option>
              <option value="daily">Daily</option>
            </select>
          </Field>
          <Field label="New candidates">
            <select
              className={workspaceSelectClass}
              name="candidates"
              defaultValue={config.candidates}
            >
              <option value="suggest">Suggest topics</option>
              <option value="automatic">Automatically add topics</option>
            </select>
          </Field>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">
          Automatically added topics use one-time research. Creating a topic
          does not start paid research. Daily discovery uses Exa’s collection
          interval, anchored to monitor creation.
        </p>
        <Button
          className="justify-self-start"
          disabled={action.busy}
          type="submit"
        >
          Save settings
        </Button>
        {action.feedback}
      </form>
    </details>
  );
}
type PublicMonitor = Omit<Doc<"monitors">, "secret">;
function MonitorEditor({
  projectId,
  monitor,
}: {
  projectId: string;
  monitor?: PublicMonitor;
}) {
  const action = useCommand();
  const key = useRef(crypto.randomUUID());
  return (
    <details className="py-3">
      <summary className="cursor-pointer text-sm">
        {monitor ? "Edit source" : "+ Add source"}
      </summary>
      <form
        className="mt-4 grid max-w-xl gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const saved = await action.run({
            kind: "save_monitor",
            projectId,
            requestKey: key.current,
            ...(monitor ? { monitorId: monitor._id } : {}),
            name: value(data, "name"),
            query: value(data, "query"),
            domains: value(data, "domains")
              .split(/[\s,]+/)
              .filter(Boolean),
            paused: data.get("paused") === "on",
          });
          if (saved && !monitor) {
            form.reset();
            key.current = crypto.randomUUID();
          }
        }}
      >
        <Field label="Source name">
          <Input
            name="name"
            defaultValue={monitor?.name}
            required
            maxLength={160}
          />
        </Field>
        <Field label="Search query">
          <Textarea
            name="query"
            defaultValue={monitor?.query}
            required
            maxLength={4000}
            placeholder="What developments should this source find?"
          />
        </Field>
        <Field label="Website domains (optional, comma separated)">
          <Input
            name="domains"
            defaultValue={monitor?.domains.join(", ")}
            placeholder="example.org, example.com"
          />
        </Field>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            name="paused"
            defaultChecked={monitor?.paused ?? false}
          />
          Pause collection
        </label>
        <Button
          type="submit"
          disabled={action.busy}
          className="justify-self-start"
        >
          {monitor ? "Save source" : "Add source"}
        </Button>
        {action.feedback}
      </form>
    </details>
  );
}
function MonitorRow({
  monitor: m,
  available,
}: {
  monitor: PublicMonitor;
  available: boolean;
}) {
  const action = useCommand();
  const checkKey = useRef(crypto.randomUUID());
  return (
    <article className="py-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-sm font-medium">{m.name}</h2>
        <span className="text-xs text-muted-foreground">
          {m.removed
            ? "Removal pending"
            : m.paused
              ? "Paused"
              : m.sync === "ready"
                ? (m.providerStatus ?? "Ready")
                : m.sync}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{m.query}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {m.domains.join(", ") || "Search query · workspace scope"}
      </p>
      <div className="my-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span>
          Last check: {stamp(m.lastCheck)}
          {m.lastOutcome ? ` · ${m.lastOutcome}` : ""}
        </span>
        <span>Next check: {stamp(m.nextCheck)}</span>
        <span>Provider: {m.providerStatus ?? "Not connected"}</span>
      </div>
      {m.error || m.collectionError ? (
        <p role="status" className="my-3 text-sm text-destructive">
          {m.error || m.collectionError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!m.removed ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={action.busy || !available || m.sync !== "ready"}
              onClick={() =>
                action.run({
                  kind: "monitor_action",
                  monitorId: m._id,
                  action: "check",
                  requestKey: `${checkKey.current}:${m.lastCheck ?? 0}`,
                })
              }
            >
              Check now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={action.busy}
              onClick={() =>
                action.run({
                  kind: "monitor_action",
                  monitorId: m._id,
                  action: m.paused ? "resume" : "pause",
                })
              }
            >
              {m.paused ? "Resume" : "Pause"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={action.busy}
              onClick={() =>
                action.run({
                  kind: "monitor_action",
                  monitorId: m._id,
                  action: "remove",
                })
              }
            >
              Remove
            </Button>
          </>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          disabled={action.busy || !available}
          onClick={() =>
            action.run({
              kind: "monitor_action",
              monitorId: m._id,
              action: "sync",
            })
          }
        >
          Reconcile
        </Button>
      </div>
      {!m.removed ? (
        <MonitorEditor projectId={m.projectId} monitor={m} />
      ) : null}
      {action.feedback}
    </article>
  );
}
function UpdateCard({
  update: u,
  topics,
}: {
  update: Doc<"discoveryUpdates">;
  topics: Doc<"topics">[];
}) {
  const action = useCommand();
  const [creating, setCreating] = useState(false);
  const [attaching, setAttaching] = useState(false);
  return (
    <article className="space-y-3 py-6">
      <h2 className="font-medium">{u.title}</h2>
      <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
        {u.explanation}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {u.links.map((url) => (
          <a
            key={url}
            className="underline underline-offset-4"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            {new URL(url).hostname} ↗
          </a>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Found {stamp(u.discoveredAt)} · Updated {stamp(u.updatedAt)}
      </p>
      {u.createdTopicId ? (
        <Link
          className="inline-block py-2 text-sm underline underline-offset-4"
          href={`/projects/${u.projectId}?topic=${u.createdTopicId}`}
        >
          Open topic →
        </Link>
      ) : u.dismissed ? (
        <p className="text-xs text-muted-foreground">Dismissed</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              setCreating(!creating);
              setAttaching(false);
            }}
          >
            Create topic
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setAttaching(!attaching);
              setCreating(false);
            }}
          >
            Attach to topic
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={action.busy}
            onClick={() =>
              action.run({ kind: "dismiss_update", updateId: u._id })
            }
          >
            Dismiss
          </Button>
        </div>
      )}
      {creating && !u.createdTopicId && !u.dismissed ? (
        <form
          className="grid max-w-xl gap-4 py-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const id = await action.run({
              kind: "topic_from_update",
              updateId: u._id,
              title: value(data, "title"),
              question: value(data, "question"),
              angle: value(data, "angle"),
            });
            if (id) setCreating(false);
          }}
        >
          <Field label="Title">
            <Input
              name="title"
              defaultValue={u.title}
              required
              maxLength={160}
            />
          </Field>
          <Field label="Central question">
            <Textarea
              name="question"
              defaultValue={u.question}
              required
              maxLength={12000}
            />
          </Field>
          <Field label="Angle">
            <Textarea name="angle" defaultValue={u.angle} maxLength={8000} />
          </Field>
          <p className="text-xs text-muted-foreground">
            One-time topic. Research starts only when requested.
          </p>
          <Button
            type="submit"
            disabled={action.busy}
            className="justify-self-start"
          >
            Create topic
          </Button>
        </form>
      ) : null}
      {attaching ? (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const id = await action.run({
              kind: "attach_update",
              updateId: u._id,
              topicId: value(data, "topic"),
            });
            if (id) setAttaching(false);
          }}
        >
          <Field label="Existing topic">
            <select name="topic" required className={workspaceSelectClass}>
              <option value="">Choose topic</option>
              {topics.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" size="sm" disabled={action.busy}>
            Attach context
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Adds context without changing research or starting a run.
          </p>
        </form>
      ) : null}
      {action.feedback}
    </article>
  );
}
export function TopicBrief({ topic: t }: { topic: Doc<"topics"> }) {
  const router = useRouter();
  const context = useQuery(api.discovery.topicContext, { topicId: t._id });
  const action = useCommand();
  const [mode, setMode] = useState(t.frequency?.kind ?? "once");
  const followKey = useRef(crypto.randomUUID());
  return (
    <div className="space-y-8">
      <form
        key={t._id}
        className="grid max-w-2xl gap-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          await action.run({
            kind: "save_brief",
            topicId: t._id,
            title: value(data, "title"),
            question: value(data, "question"),
            angle: value(data, "angle"),
            coverage: value(data, "coverage"),
            status:
              value(data, "status") === "archived"
                ? "archived"
                : value(data, "status") === "completed"
                  ? "completed"
                  : "active",
            frequency:
              mode === "daily"
                ? {
                    kind: "daily",
                    time: value(data, "time"),
                    timezone: value(data, "timezone"),
                    paused: data.get("paused") === "on",
                  }
                : { kind: "once" },
          });
        }}
      >
        <Field label="Title">
          <Input name="title" defaultValue={t.title} required maxLength={160} />
        </Field>
        <Field label="Central question">
          <Textarea
            name="question"
            defaultValue={t.question}
            required
            maxLength={12000}
          />
        </Field>
        <Field label="Angle">
          <Textarea name="angle" defaultValue={t.angle} maxLength={8000} />
        </Field>
        <Field label="Intended coverage">
          <Textarea
            name="coverage"
            defaultValue={t.coverage}
            maxLength={12000}
          />
        </Field>
        <details className="border-y border-border py-3">
          <summary className="cursor-pointer text-sm">
            Research settings ·{" "}
            {t.frequency?.kind === "daily"
              ? t.frequency.paused
                ? "Daily, paused"
                : "Daily"
              : "One-time"}
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Research frequency">
              <select
                className={workspaceSelectClass}
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value === "daily" ? "daily" : "once")
                }
              >
                <option value="once">One-time</option>
                <option value="daily">Daily</option>
              </select>
            </Field>
            <Field label="Topic status">
              <select
                className={workspaceSelectClass}
                name="status"
                defaultValue={t.status ?? "active"}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            {mode === "daily" ? (
              <>
                <Field label="Starts at (local time)">
                  <Input
                    name="time"
                    type="time"
                    required
                    defaultValue={
                      t.frequency?.kind === "daily" ? t.frequency.time : "09:00"
                    }
                  />
                </Field>
                <Field label="IANA timezone">
                  <Input
                    name="timezone"
                    required
                    defaultValue={
                      t.frequency?.kind === "daily"
                        ? t.frequency.timezone
                        : Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                    placeholder="Asia/Kolkata"
                  />
                </Field>
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="paused"
                    defaultChecked={
                      t.frequency?.kind === "daily" && t.frequency.paused
                    }
                  />
                  Pause daily research
                </label>
              </>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            {mode === "once"
              ? "Run explicitly and rerun when needed. Creating a topic does not start paid research."
              : "Paid provider work starts at the configured time. A connected agent must synthesize and save the findings. Completing or archiving pauses research; workspace discovery continues."}
          </p>
          {t.nextResearchAt ? (
            <p className="mt-2 text-xs">
              Next starts at {stamp(t.nextResearchAt)}
            </p>
          ) : null}
        </details>
        <Button
          type="submit"
          disabled={action.busy}
          className="justify-self-start"
        >
          Save brief
        </Button>
        {action.feedback}
      </form>
      {t.parentTopicId ? (
        <Link
          className="text-sm underline underline-offset-4"
          href={`/projects/${t.projectId}?topic=${t.parentTopicId}`}
        >
          Original video idea →
        </Link>
      ) : null}
      <section>
        <h2 className="mb-3 text-sm font-medium">Relevant discovery updates</h2>
        {!context ? (
          <DocumentLoading />
        ) : context.updates.length ? (
          context.updates.map((u) => (
            <div key={u._id} className="border-b border-border py-3">
              <p className="text-sm">{u.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {u.explanation}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {u.links.map((url) => (
                  <a
                    className="text-xs underline"
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {new URL(url).hostname} ↗
                  </a>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No discovery updates attached.
          </p>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium">Linked monitoring sources</h2>
        {context?.monitors.map((m) => (
          <p key={m._id} className="my-2 text-sm">
            {m.name} · {m.paused ? "Paused" : m.sync}
          </p>
        ))}
        <Link
          className="text-xs underline underline-offset-4"
          href={`/projects/${t.projectId}?view=discover`}
        >
          Manage sources in Discover
        </Link>
      </section>
      <details>
        <summary className="cursor-pointer text-sm">
          Create a follow-up video idea
        </summary>
        <form
          className="mt-4 grid max-w-xl gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const id = await action.run({
              kind: "follow_up",
              topicId: t._id,
              requestKey: followKey.current,
              title: value(data, "title"),
              question: value(data, "question"),
            });
            if (id) router.push(`/projects/${t.projectId}?topic=${id}`);
          }}
        >
          <Field label="Follow-up title">
            <Input name="title" required maxLength={160} />
          </Field>
          <Field label="Central question">
            <Textarea name="question" required maxLength={12000} />
          </Field>
          <Button
            type="submit"
            disabled={action.busy}
            className="justify-self-start"
          >
            Create linked topic
          </Button>
        </form>
      </details>
    </div>
  );
}
export function InvestigationStatus({
  projectId,
  topicId,
}: {
  projectId: string;
  topicId: string;
}) {
  const data = useQuery(api.discovery.read, { projectId });
  const rows = data?.investigations.filter((i) => i.topicId === topicId) ?? [];
  const current = rows[0];
  if (!current) return null;
  return (
    <section className="my-6 border-l-2 border-border pl-4">
      <p role="status" className="text-sm">
        {current.state.kind === "waiting_for_agent"
          ? "Waiting for agent"
          : current.state.kind === "provider"
            ? "Provider investigation in progress"
            : current.state.kind === "unavailable"
              ? "Research unavailable"
              : current.state.outcome === "no_material_update"
                ? "No material update"
                : "Research updated"}
      </p>
      {current.state.kind === "waiting_for_agent" ? (
        <div className="mt-3">
          <AgentPrompt
            prompt={`Read pending investigation ${current._id} for Relay topic ${topicId}. Inspect its provider packet and evidence, investigate gaps, then update the canonical research using expectedRevision. Finish the investigation with the exact saved revision; record no_material_update only if the completed investigation supports it. Human approval remains separate.`}
          />
        </div>
      ) : null}
      {current.state.kind === "unavailable" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {current.state.reason}
        </p>
      ) : null}
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Investigation history</summary>
        {rows.map((i) => (
          <p key={i._id} className="my-3">
            {stamp(i.due)} ·{" "}
            {i.state.kind === "closed"
              ? `${i.state.outcome.replaceAll("_", " ")} · ${i.state.explanation}`
              : i.state.kind.replaceAll("_", " ")}
          </p>
        ))}
      </details>
    </section>
  );
}
