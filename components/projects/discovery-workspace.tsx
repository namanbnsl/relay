"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock3,
  SlidersHorizontal,
  ArrowRight,
  Plus,
  Radio,
} from "lucide-react";
import { useCommand } from "./workspace-actions";
import { Field } from "./workspace-field";
import { formValue } from "./workspace-form";
import { createRequestKey } from "./workspace-request-key";
import {
  ResearchSchedule,
  TimezoneField,
} from "./research-schedule";
import {
  formatScheduleTime,
  formatUtcDateTime,
} from "./workspace-time";
import { workspaceSelectClass } from "./workspace-ui";
import {
  AgentPrompt,
  DocumentLoading,
  EmptyDocument,
  WorkspaceDialog,
} from "./workspace-interactions";

function stamp(at?: number) {
  return at === undefined ? "Not checked yet" : formatUtcDateTime(at);
}
type DiscoveryData = FunctionReturnType<typeof api.discovery.read>;
export function WorkspaceNavigation({
  projectId,
  discover,
}: {
  projectId: string;
  discover: boolean;
}) {
  return (
    <nav aria-label="Workspace destinations" className="workspace-destinations">
      {[
        {
          title: "Topics",
          href: `/projects/${projectId}`,
          selected: !discover,
        },
        {
          title: "Discover",
          href: `/projects/${projectId}?view=discover`,
          selected: discover,
        },
      ].map((item) => (
        <Link
          key={item.title}
          href={item.href}
          aria-current={item.selected ? "page" : undefined}
          className="workspace-destination"
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
  return (
    <DiscoverContent
      projectId={projectId}
      topics={topics}
      data={data}
      view={view}
      showDismissed={showDismissed}
      onViewChange={setView}
      onShowDismissedChange={setShowDismissed}
    />
  );
}

function nextMonitorCheck(monitors: DiscoveryData["monitors"]) {
  let next: number | undefined;
  for (const source of monitors) {
    if (
      !source.paused &&
      source.nextCheck !== undefined &&
      (next === undefined || source.nextCheck < next)
    )
      next = source.nextCheck;
  }
  return next;
}

function DiscoverContent({
  projectId,
  topics,
  data,
  view,
  showDismissed,
  onViewChange,
  onShowDismissedChange,
}: {
  projectId: string;
  topics: Doc<"topics">[];
  data: DiscoveryData;
  view: "updates" | "sources";
  showDismissed: boolean;
  onViewChange: (view: "updates" | "sources") => void;
  onShowDismissedChange: (show: boolean) => void;
}) {
  const updates = data.updates.filter((u) => showDismissed || !u.dismissed);
  const sources = data.monitors.filter((m) => !m.removed);
  const next = nextMonitorCheck(sources);
  return (
    <div>
      <div className="workspace-heading-row">
        <div>
          <p className="workspace-eyebrow">
            A little inspiration, on your terms
          </p>
          <h1>Discover your next story.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Follow what matters. Turn a promising update into a topic.
          </p>
        </div>
        <DiscoverySettings projectId={projectId} config={data.config} />
      </div>
      <div className="workspace-schedule-line">
        <Clock3 size={15} aria-hidden />
        <p>
          {data.config.cadence === "daily"
            ? data.config.schedule
              ? `Every day at ${data.config.schedule.time} · ${data.config.schedule.timezone.replaceAll("_", " ")}`
              : "Daily discovery · choose a time in Schedule"
            : "Discover when you ask, or set a daily schedule."}
          {next ? (
            <span className="block mt-1 text-xs text-muted-foreground">
              Next check:{" "}
              {formatScheduleTime(next, data.config.schedule?.timezone)}
            </span>
          ) : null}
        </p>
      </div>
      {data.config.cadence === "daily" && !data.setup.available ? (
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          Your schedule is saved. Automatic discovery is currently unavailable.
        </p>
      ) : null}
      <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Discover views" className="workspace-view-switch">
          <button
            aria-pressed={view === "updates"}
            onClick={() => onViewChange("updates")}
          >
            For you <span>{updates.length}</span>
          </button>
          <button
            aria-pressed={view === "sources"}
            onClick={() => onViewChange("sources")}
          >
            Following <span>{sources.length}</span>
          </button>
        </nav>
        {view === "sources" ? (
          <MonitorEditor projectId={projectId} />
        ) : (
          <label className="workspace-checkbox flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-foreground"
              checked={showDismissed}
              onChange={(e) => onShowDismissedChange(e.target.checked)}
            />
            Show dismissed
          </label>
        )}
      </div>
      <DiscoverView
        view={view}
        updates={updates}
        sources={sources}
        topics={topics}
        showDismissed={showDismissed}
        available={data.setup.available}
        onChooseSources={() => onViewChange("sources")}
      />
    </div>
  );
}

function DiscoverView({
  view,
  updates,
  sources,
  topics,
  showDismissed,
  available,
  onChooseSources,
}: {
  view: "updates" | "sources";
  updates: DiscoveryData["updates"];
  sources: DiscoveryData["monitors"];
  topics: Doc<"topics">[];
  showDismissed: boolean;
  available: boolean;
  onChooseSources: () => void;
}) {
  if (view === "sources")
    return <SourceList sources={sources} available={available} />;
  return (
    <div className="workspace-feed">
      {updates.length ? (
        updates.map((update) => (
          <UpdateCard key={update._id} update={update} topics={topics} />
        ))
      ) : (
        <EmptyDocument
          title={showDismissed ? "No updates yet" : "You’re all caught up"}
          description={
            sources.length
              ? "New discoveries will appear here after your next check."
              : "Tell Relay what to follow. Your next good idea can start here."
          }
        >
          <Button variant="outline" onClick={onChooseSources}>
            Choose what to follow <ArrowRight aria-hidden />
          </Button>
        </EmptyDocument>
      )}
    </div>
  );
}

function SourceList({
  sources,
  available,
}: {
  sources: DiscoveryData["monitors"];
  available: boolean;
}) {
  return (
    <div className="mt-5">
      <p className="mb-6 max-w-xl text-sm leading-6 text-muted-foreground">
        The subjects and websites Relay watches for new developments.
      </p>
      {!available ? (
        <p role="status" className="mb-5 text-sm text-muted-foreground">
          Automatic discovery is currently unavailable. Your sources are saved.
        </p>
      ) : null}
      {sources.length ? (
        sources.map((monitor) => (
          <MonitorRow
            key={monitor._id}
            monitor={monitor}
            available={available}
          />
        ))
      ) : (
        <EmptyDocument
          title="What should Relay follow?"
          description="Add a subject, a website, or ask your connected agent to set up your sources."
        />
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
  const [open, setOpen] = useState(false);
  return (
    <WorkspaceDialog
      open={open}
      onOpenChange={setOpen}
      title="Your discovery schedule"
      description="Choose when Relay checks the sources you follow for fresh ideas."
      trigger={
        <Button variant="outline">
          <Clock3 size={15} aria-hidden />
          Schedule
        </Button>
      }
    >
      <DiscoverySettingsForm
        projectId={projectId}
        config={config}
        onSaved={() => setOpen(false)}
      />
    </WorkspaceDialog>
  );
}
function DiscoverySettingsForm({
  projectId,
  config,
  onSaved,
}: {
  projectId: string;
  config: NonNullable<Doc<"projects">["discovery"]>;
  onSaved: () => void;
}) {
  const action = useCommand();
  const [daily, setDaily] = useState(config.cadence === "daily");
  return (
    <form
      className="grid gap-5"
      action={async (data) => {
        const id = await action.run({
          kind: "configure_discovery",
          projectId,
          config: {
            brief: formValue(data, "brief"),
            region: formValue(data, "region"),
            language: formValue(data, "language"),
            scope:
              formValue(data, "scope") === "websites" ? "websites" : "web",
            cadence: daily ? "daily" : "manual",
            ...(daily
              ? {
                  schedule: {
                    time: formValue(data, "time"),
                    timezone: formValue(data, "timezone"),
                  },
                }
              : {}),
            candidates:
              formValue(data, "candidates") === "automatic"
                ? "automatic"
                : "suggest",
          },
        });
        if (id) onSaved();
      }}
    >
      <Field label="Check for updates">
        <select
          className={workspaceSelectClass}
          value={daily ? "daily" : "manual"}
          onChange={(e) => setDaily(e.target.value === "daily")}
        >
          <option value="manual">Only when I ask</option>
          <option value="daily">Every day</option>
        </select>
      </Field>
      {daily ? (
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <Field label="Start time">
            <Input
              type="time"
              required
              name="time"
              defaultValue={config.schedule?.time ?? "09:00"}
            />
          </Field>
          <TimezoneField defaultValue={config.schedule?.timezone} />
        </div>
      ) : null}
      <Field label="When Relay finds something">
        <select
          className={workspaceSelectClass}
          name="candidates"
          defaultValue={config.candidates}
        >
          <option value="suggest">Let me choose what becomes a topic</option>
          <option value="automatic">Add new topics automatically</option>
        </select>
      </Field>
      <details className="workspace-disclosure">
        <summary>Fine-tune what you discover</summary>
        <div className="mt-4 grid gap-4">
          <Field label="What interests you?">
            <Textarea
              name="brief"
              defaultValue={config.brief}
              maxLength={12000}
              placeholder="Subjects to follow, what matters to your audience, and what to skip"
            />
          </Field>
          <Field label="Search in">
            <select
              name="scope"
              className={workspaceSelectClass}
              defaultValue={config.scope}
            >
              <option value="web">My websites and the wider web</option>
              <option value="websites">Only my selected websites</option>
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Region (optional)">
              <Input
                name="region"
                defaultValue={config.region}
                maxLength={100}
              />
            </Field>
            <Field label="Language (optional)">
              <Input
                name="language"
                defaultValue={config.language}
                maxLength={100}
              />
            </Field>
          </div>
        </div>
      </details>
      <p className="text-xs leading-6 text-muted-foreground">
        {daily
          ? "Checks start at your chosen local time, including after daylight saving changes. New ideas appear here when the search finishes."
          : "Your sources stay saved. Check for updates whenever you’re ready."}
      </p>
      {action.feedback}
      <Button type="submit" disabled={action.busy}>
        {action.busy ? "Saving…" : "Save schedule"}
      </Button>
    </form>
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
  const [open, setOpen] = useState(false);
  return (
    <WorkspaceDialog
      open={open}
      onOpenChange={setOpen}
      title={monitor ? "Edit source" : "Follow something new"}
      description="Tell Relay what to look for. You can focus on specific websites or explore the wider web."
      trigger={
        <Button variant="ghost" size="sm">
          {monitor ? (
            <SlidersHorizontal size={14} aria-hidden />
          ) : (
            <Plus size={15} aria-hidden />
          )}
          {monitor ? "Edit" : "Follow a source"}
        </Button>
      }
    >
      <MonitorForm
        projectId={projectId}
        monitor={monitor}
        onSaved={() => setOpen(false)}
      />
    </WorkspaceDialog>
  );
}
function MonitorForm({
  projectId,
  monitor,
  onSaved,
}: {
  projectId: string;
  monitor?: PublicMonitor;
  onSaved: () => void;
}) {
  const action = useCommand();
  const [requestKey] = useState(createRequestKey);
  return (
    <form
      className="grid gap-5"
      action={async (data) => {
        const saved = await action.run({
          kind: "save_monitor",
          projectId,
          requestKey,
          ...(monitor ? { monitorId: monitor._id } : {}),
          name: formValue(data, "name"),
          query: formValue(data, "query"),
          domains: formValue(data, "domains")
            .split(/[\s,]+/)
            .filter(Boolean),
          paused: monitor?.paused ?? false,
        });
        if (saved) onSaved();
      }}
    >
      <Field label="Name">
        <Input
          name="name"
          defaultValue={monitor?.name}
          placeholder="e.g. Open model releases"
          required
          maxLength={160}
        />
      </Field>
      <Field label="What should Relay look for?">
        <Textarea
          name="query"
          defaultValue={monitor?.query}
          placeholder="New open-source AI models, practical tests, and pricing changes"
          required
          maxLength={4000}
        />
      </Field>
      <Field label="Websites (optional)">
        <Input
          name="domains"
          defaultValue={monitor?.domains.join(", ")}
          placeholder="example.org, example.com"
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Leave websites empty to search more widely.
      </p>
      {action.feedback}
      <Button type="submit" disabled={action.busy}>
        {action.busy ? "Saving…" : monitor ? "Save source" : "Follow source"}
      </Button>
    </form>
  );
}
function MonitorRow({
  monitor: m,
  available,
}: {
  monitor: PublicMonitor;
  available: boolean;
}) {
  return (
    <article className="workspace-source-row">
      <Radio size={18} className="mt-1 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-sm font-medium">{m.name}</h2>
          <span className="text-xs text-muted-foreground">
            {monitorStatus(m, available)}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {m.query}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {m.domains.join(" · ") || "Across the web"}
          {m.lastCheck ? ` · Last checked ${stamp(m.lastCheck)}` : ""}
        </p>
        {m.error && available ? (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            This source needs attention. Relay will try reconnecting
            automatically.
          </p>
        ) : null}
        <MonitorActions monitor={m} available={available} />
      </div>
    </article>
  );
}

function monitorStatus(monitor: PublicMonitor, available: boolean) {
  if (monitor.paused) return "Paused";
  if (!available) return "Saved";
  if (monitor.sync === "ready") return "Following";
  return monitor.sync === "error" ? "Reconnecting" : "Connecting…";
}

function MonitorActions({
  monitor,
  available,
}: {
  monitor: PublicMonitor;
  available: boolean;
}) {
  const action = useCommand();
  const [checkKey] = useState(createRequestKey);
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={action.busy || !available || monitor.sync !== "ready"}
          onClick={async () => {
            await action.run({
              kind: "monitor_action",
              monitorId: monitor._id,
              action: "check",
              requestKey: `${checkKey}:${monitor.lastCheck ?? 0}`,
            });
          }}
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
              monitorId: monitor._id,
              action: monitor.paused ? "resume" : "pause",
            })
          }
        >
          {monitor.paused ? "Resume" : "Pause"}
        </Button>
        <MonitorEditor projectId={monitor.projectId} monitor={monitor} />
        <Button
          size="sm"
          variant="ghost"
          disabled={action.busy}
          onClick={() =>
            action.run({
              kind: "monitor_action",
              monitorId: monitor._id,
              action: "remove",
            })
          }
        >
          Unfollow
        </Button>
      </div>
      {action.feedback}
    </>
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
  const router = useRouter();
  const [attaching, setAttaching] = useState(false);
  return (
    <article className="workspace-update">
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
        Found {stamp(u.discoveredAt)}
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
            disabled={action.busy}
            onClick={async () => {
              const id = await action.run({
                kind: "topic_from_update",
                updateId: u._id,
                title: u.title,
                question: u.question,
                angle: u.angle,
              });
              if (id) router.push(`/projects/${u.projectId}?topic=${id}`);
            }}
          >
            Make this a topic <ArrowRight size={14} aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={action.busy || topics.length === 0}
            onClick={() => {
              setAttaching(!attaching);
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
      {attaching ? (
        <form
          className="flex flex-wrap items-end gap-3"
          action={async (data) => {
            const id = await action.run({
              kind: "attach_update",
              updateId: u._id,
              topicId: formValue(data, "topic"),
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
export function TopicBrief({
  topic: t,
  onResearch,
}: {
  topic: Doc<"topics">;
  onResearch?: () => void;
}) {
  const context = useQuery(api.discovery.topicContext, { topicId: t._id });
  const [editing, setEditing] = useState(false);
  return (
    <div className="workspace-topic-brief">
      <div className="workspace-heading-row !mb-6">
        <h2 className="text-sm font-medium">The direction</h2>
        <WorkspaceDialog
          open={editing}
          onOpenChange={setEditing}
          title="Edit the brief"
          description="Give your agent the direction it needs. A clear question is enough to start."
          trigger={
            <Button variant="ghost" size="sm">
              <SlidersHorizontal size={14} aria-hidden />
              Edit brief
            </Button>
          }
        >
          <BriefEditor topic={t} onSaved={() => setEditing(false)} />
        </WorkspaceDialog>
      </div>
      {t.angle || t.coverage ? (
        <dl className="workspace-brief-details">
          {t.angle ? (
            <div>
              <dt>Angle</dt>
              <dd>{t.angle}</dd>
            </div>
          ) : null}
          {t.coverage ? (
            <div>
              <dt>What to cover</dt>
              <dd>{t.coverage}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="max-w-xl text-sm leading-7 text-muted-foreground">
          Your question is ready. Your agent can develop the angle and coverage
          as it researches.
        </p>
      )}
      <div className="workspace-next-step">
        <p className="workspace-eyebrow">Up next</p>
        <h2 className="text-lg font-medium">
          Let your agent take it from here.
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
          Ask your connected agent to research this topic. The findings and
          sources appear here, ready for your review.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <AgentPrompt
            label="Research with my agent"
            prompt={`Research the Relay topic “${t.title}” (topic ID ${t._id}) in project ${t.projectId}. Investigate: ${t.question}. Break the question into useful subtopics, develop the angle and coverage, read supporting sources, and cross-check material claims with an independent model. Record uncertainty and verification honestly, then save the completed research in Relay for my review. Manage the intermediate steps yourself.`}
          />
          {onResearch ? (
            <Button variant="ghost" onClick={onResearch}>
              View research <ArrowRight size={14} aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-6">
        <ResearchSchedule topic={t} />
        {t.nextResearchAt ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Next starts{" "}
            {formatScheduleTime(
              t.nextResearchAt,
              t.frequency?.kind !== "once" ? t.frequency?.timezone : undefined,
            )}
          </p>
        ) : null}
      </div>
      {context?.updates.length ? (
        <details className="workspace-disclosure mt-9">
          <summary>Inspiration & sources · {context.updates.length}</summary>
          {context.updates.map((u) => (
            <div key={u._id} className="py-4">
              <p className="text-sm font-medium">{u.title}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {u.explanation}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {u.links.map((url) => (
                  <a
                    className="text-xs underline underline-offset-4"
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
          ))}
        </details>
      ) : null}
      {t.parentTopicId ? (
        <Link
          className="mt-6 block text-sm underline underline-offset-4"
          href={`/projects/${t.projectId}?topic=${t.parentTopicId}`}
        >
          Original topic →
        </Link>
      ) : null}
    </div>
  );
}
function BriefEditor({
  topic: t,
  onSaved,
}: {
  topic: Doc<"topics">;
  onSaved: () => void;
}) {
  const action = useCommand();
  return (
    <form
      className="grid gap-5"
      action={async (data) => {
        const saved = await action.run({
          kind: "save_brief",
          topicId: t._id,
          title: formValue(data, "title"),
          question: formValue(data, "question"),
          angle: formValue(data, "angle"),
          coverage: formValue(data, "coverage"),
          status:
            formValue(data, "status") === "archived"
              ? "archived"
              : formValue(data, "status") === "completed"
                ? "completed"
                : "active",
          frequency: t.frequency ?? { kind: "once" },
        });
        if (saved) onSaved();
      }}
    >
      <Field label="Title">
        <Input name="title" defaultValue={t.title} required maxLength={160} />
      </Field>
      <Field label="Research question">
        <Textarea
          name="question"
          defaultValue={t.question}
          required
          maxLength={12000}
        />
      </Field>
      <details className="workspace-disclosure">
        <summary>More direction (optional)</summary>
        <div className="mt-4 grid gap-4">
          <Field label="Angle">
            <Textarea name="angle" defaultValue={t.angle} maxLength={8000} />
          </Field>
          <Field label="What to cover">
            <Textarea
              name="coverage"
              defaultValue={t.coverage}
              maxLength={12000}
            />
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
        </div>
      </details>
      {action.feedback}
      <Button type="submit" disabled={action.busy}>
        {action.busy ? "Saving…" : "Save brief"}
      </Button>
    </form>
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
          ? "Sources are ready for your agent"
          : current.state.kind === "provider"
            ? "Gathering fresh sources…"
            : current.state.kind === "unavailable"
              ? "Research unavailable"
              : current.state.outcome === "no_material_update"
                ? "No material update"
                : "Research updated"}
      </p>
      {current.state.kind === "waiting_for_agent" ? (
        <div className="mt-3">
          <AgentPrompt
            prompt={`Finish the pending research for Relay topic ${topicId}, investigation ${current._id}. Read the collected sources, investigate gaps, and cross-check material claims with an independent model. Record uncertainty and verification honestly, save the findings in Relay, and close this investigation against the saved research. Then leave it for my review. If nothing significant changed, explain why.`}
          />
        </div>
      ) : null}
      {current.state.kind === "unavailable" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Research couldn’t finish this time. Ask your agent to try again.
        </p>
      ) : null}
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Recent research</summary>
        {rows.map((i) => (
          <p key={i._id} className="my-3">
            {stamp(i.due)} ·{" "}
            {i.state.kind === "closed"
              ? `${i.state.outcome.replaceAll("_", " ")} · ${i.state.explanation}`
              : i.state.kind === "provider"
                ? "Gathering sources"
                : i.state.kind === "waiting_for_agent"
                  ? "Ready for your agent"
                  : "Couldn’t complete research"}
          </p>
        ))}
      </details>
    </section>
  );
}
