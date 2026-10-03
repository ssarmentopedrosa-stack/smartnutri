const SECRET = /api[_-]?key|authorization|bearer|token|password|secret|image|photo|prompt|base64/i;

export const LOG_CATEGORIES = [
  "AUTH",
  "NUTRITION",
  "AI",
  "QUOTA",
  "RATE_LIMIT",
  "DATABASE",
  "SECURITY",
  "ACCOUNT",
  "COACH",
  "PERFORMANCE",
] as const;

export type LogCategory = (typeof LOG_CATEGORIES)[number];

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = { event, ts: new Date().toISOString() };
  const category = fields.category;
  if (typeof category === "string" && (LOG_CATEGORIES as readonly string[]).includes(category)) {
    safe.category = category;
  }
  for (const [key, value] of Object.entries(fields)) {
    if (key === "category") continue;
    if (SECRET.test(key)) continue;
    if (typeof value === "string" && (value.length > 300 || value.includes("base64,") || value.startsWith("eyJ"))) continue;
    safe[key] = value;
  }
  console.info(JSON.stringify(safe));
}
