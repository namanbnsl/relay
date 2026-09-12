const utcDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const utcDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

const scheduleFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatUtcDate(at: number) {
  return utcDateFormatter.format(at);
}

export function formatUtcDateTime(at: number) {
  return utcDateTimeFormatter.format(at);
}

export function formatScheduleTime(at: number, timezone = "UTC") {
  let formatter = scheduleFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    });
    scheduleFormatters.set(timezone, formatter);
  }
  return formatter.format(at);
}
