type ZonedParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

function partsInZone(date: Date, timeZone: string): ZonedParts {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const picked = new Map(
    formatted
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hour = picked.get("hour") === "24" ? "00" : (picked.get("hour") ?? "00");
  return {
    year: picked.get("year") ?? "",
    month: picked.get("month") ?? "",
    day: picked.get("day") ?? "",
    hour,
    minute: picked.get("minute") ?? "00",
    second: picked.get("second") ?? "00",
  };
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = partsInZone(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** Calendar date of an instant in an IANA time zone, YYYY-MM-DD. */
export function localDate(startedAt: string, timeZone: string): string {
  const parts = partsInZone(new Date(startedAt), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function todayLocalDate(timeZone: string): string {
  return localDate(new Date().toISOString(), timeZone);
}

export function datetimeLocalValue(startedAt: string, timeZone: string): string {
  const parts = partsInZone(new Date(startedAt), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function zonedLocalToUtc(localDateTime: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localDateTime);
  if (!match) throw new Error("Start time is incomplete.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = zoneOffsetMs(new Date(utcGuess), timeZone);
  let utc = utcGuess - offset;
  // A guess on the other side of a DST change has the wrong offset.
  const offsetAtInstant = zoneOffsetMs(new Date(utc), timeZone);
  if (offsetAtInstant !== offset) utc = utcGuess - offsetAtInstant;
  return new Date(utc).toISOString();
}

export function formatDayLabel(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(utc);
}

export function formatClock(startedAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startedAt));
}
