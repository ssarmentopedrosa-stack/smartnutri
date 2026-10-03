export const RATE_LIMITS = {
  analyzePhoto: 8,
  analyzeText: 12,
  sendChat: 20,
  lookupBarcode: 30,
  askInsight: 10,
  weeklyCoach: 4,
} as const;

export type RateAction = keyof typeof RATE_LIMITS;

export function rateWindowId(nowMs: number, windowMs = 60_000): number {
  return Math.floor(nowMs / windowMs);
}

export const HIT_RATE_SQL = `insert into rate_limits (user_id, action, window_id, hits)
  values ($1, $2, $3, 1)
  on conflict (user_id, action, window_id)
  do update set hits = rate_limits.hits + 1
  returning hits`;
