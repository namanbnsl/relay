import type { Doc } from "../_generated/dataModel";

export function sameFrequency(
  a: NonNullable<Doc<"topics">["frequency"]>,
  b: NonNullable<Doc<"topics">["frequency"]>,
) {
  switch (a.kind) {
    case "once":
      return b.kind === "once";
    case "scheduled":
      return (
        b.kind === "scheduled" && a.at === b.at && a.timezone === b.timezone
      );
    case "daily":
      return (
        b.kind === "daily" &&
        a.time === b.time &&
        a.timezone === b.timezone &&
        a.paused === b.paused
      );
  }
}

/** First future local start, once per local date. DST gaps start at the first
 * available minute after the configured time; repeated hours run only once. */
export function nextStart(after: number, time: string, timezone: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error("Invalid start time.");
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = (at: number) => {
    const p = fmt.formatToParts(at);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      p.find((x) => x.type === type)?.value ?? "";
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}`,
    };
  };
  const now = parts(after);
  const skipToday = now.time >= time;
  for (
    let at = Math.floor(after / 60000) * 60000 + 60000;
    at <= after + 3 * 86400000;
    at += 60000
  ) {
    const local = parts(at);
    if ((!skipToday || local.date !== now.date) && local.time >= time)
      return at;
  }
  throw new Error("Could not resolve timezone schedule.");
}
