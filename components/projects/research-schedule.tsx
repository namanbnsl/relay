"use client";
import { useState } from "react";
import { Clock3 } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceDialog } from "./workspace-interactions";
import { useCommand } from "./workspace-actions";
import { Field } from "./workspace-field";
import { formValue } from "./workspace-form";
import { formatScheduleTime } from "./workspace-time";
import { workspaceSelectClass } from "./workspace-ui";

const supportedTimezones = Intl.supportedValuesOf("timeZone");

export function TimezoneField({ defaultValue }: { defaultValue?: string }) {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = [
    ...new Set([
      defaultValue ?? local,
      local,
      "UTC",
      "Asia/Kolkata",
      ...supportedTimezones,
    ]),
  ];
  return (
    <Field label="Timezone">
      <select
        required
        name="timezone"
        defaultValue={defaultValue ?? local}
        className={workspaceSelectClass}
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replaceAll("_", " ").replaceAll("/", " / ")}
            {zone === local ? " (your time)" : ""}
          </option>
        ))}
      </select>
    </Field>
  );
}
function localDateTime(at: number) {
  const date = new Date(at);
  return new Date(at - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function ResearchSchedule({ topic }: { topic: Doc<"topics"> }) {
  const [open, setOpen] = useState(false);
  const frequency = topic.frequency;
  const label =
    frequency?.kind === "daily"
      ? frequency.paused
        ? "Research paused"
        : `Research daily at ${frequency.time}`
      : topic.nextResearchAt
        ? `Research ${formatScheduleTime(
            topic.nextResearchAt,
            frequency?.kind === "scheduled" ? frequency.timezone : undefined,
          )}`
        : "Schedule research";
  return (
    <WorkspaceDialog
      open={open}
      onOpenChange={setOpen}
      title="Schedule research"
      description="Choose when Relay gathers fresh sources for this topic. Your connected agent turns the findings into research for you to review."
      trigger={
        <Button variant="ghost" size="sm">
          <Clock3 size={15} aria-hidden />
          {label}
        </Button>
      }
    >
      <ScheduleForm topic={topic} onSaved={() => setOpen(false)} />
    </WorkspaceDialog>
  );
}
function ScheduleForm({
  topic,
  onSaved,
}: {
  topic: Doc<"topics">;
  onSaved: () => void;
}) {
  const action = useCommand();
  const [openedAt] = useState(() => Date.now());
  const [mode, setMode] = useState<"once" | "scheduled" | "daily">(
    topic.frequency?.kind ?? "once",
  );
  const [error, setError] = useState("");
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <form
      className="grid gap-5"
      action={async (form) => {
        setError("");
        const at = new Date(formValue(form, "at")).getTime();
        if (
          mode === "scheduled" &&
          (!Number.isFinite(at) ||
            at <= openedAt ||
            localDateTime(at) !== formValue(form, "at"))
        ) {
          setError(
            "Choose a future date and time. This time may not exist when the clocks change.",
          );
          return;
        }
        const saved = await action.run({
          kind: "save_schedule",
          topicId: topic._id,
          frequency:
            mode === "daily"
              ? {
                  kind: "daily",
                  time: formValue(form, "time"),
                  timezone: formValue(form, "timezone"),
                  paused: false,
                }
              : mode === "scheduled"
                ? { kind: "scheduled", at, timezone: localZone }
                : { kind: "once" },
        });
        if (saved) onSaved();
      }}
    >
      <Field label="When">
        <select
          className={workspaceSelectClass}
          value={mode}
          onChange={(event) =>
            setMode(
              event.target.value === "daily"
                ? "daily"
                : event.target.value === "scheduled"
                  ? "scheduled"
                  : "once",
            )
          }
        >
          <option value="once">Only when I ask</option>
          <option value="scheduled">On a specific date</option>
          <option value="daily">Every day</option>
        </select>
      </Field>
      {mode === "scheduled" ? (
        <>
          <Field label="Date and time">
            <Input
              type="datetime-local"
              name="at"
              required
              min={localDateTime(openedAt + 60000)}
              defaultValue={localDateTime(
                topic.nextResearchAt && topic.nextResearchAt > openedAt
                  ? topic.nextResearchAt
                  : openedAt + 3600000,
              )}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Your timezone: {localZone.replaceAll("_", " ")}
          </p>
        </>
      ) : null}
      {mode === "daily" ? (
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <Field label="Start time">
            <Input
              type="time"
              name="time"
              required
              defaultValue={
                topic.frequency?.kind === "daily"
                  ? topic.frequency.time
                  : "09:00"
              }
            />
          </Field>
          <TimezoneField
            defaultValue={
              topic.frequency?.kind === "daily"
                ? topic.frequency.timezone
                : undefined
            }
          />
        </div>
      ) : null}
      <p className="text-xs leading-6 text-muted-foreground">
        {mode === "once"
          ? "Automatic research is off. You can ask your agent to research whenever you’re ready."
          : "Research starts at this time; results take a little longer. Your connected agent still needs to finish the write-up."}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {action.feedback}
      <Button type="submit" disabled={action.busy}>
        {action.busy ? "Saving…" : "Save schedule"}
      </Button>
    </form>
  );
}
