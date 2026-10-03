const SECRET = /api[_-]?key|authorization|bearer|token|password|secret/i;

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = { event, ts: new Date().toISOString() };
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET.test(key)) continue;
    if (typeof value === "string" && value.length > 300) continue;
    safe[key] = value;
  }
  console.info(JSON.stringify(safe));
}
