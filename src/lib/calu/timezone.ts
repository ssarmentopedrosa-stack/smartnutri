const ZONE = /^[A-Za-z0-9_+-]{1,32}(?:\/[A-Za-z0-9_+-]{1,32}){0,2}$/;

export const COMMON_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Fortaleza",
  "America/Recife",
  "America/Belem",
  "America/Manaus",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
] as const;

export function isValidTimeZone(value: string): boolean {
  if (!ZONE.test(value) || value.length > 64) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function dayKeyInTimeZone(date: Date, timeZone: string): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : "America/Sao_Paulo";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function shiftDayKey(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function daysInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = start;
  while (cursor <= end && out.length < 400) {
    out.push(cursor);
    cursor = shiftDayKey(cursor, 1);
  }
  return out;
}
