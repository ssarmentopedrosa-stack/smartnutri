export const RATE_LIMITS = {
  analyzePhoto: 8,
  analyzeText: 12,
  sendChat: 20,
  lookupBarcode: 30,
  askInsight: 10,
  askCoach: 8,
  weeklyCoach: 4,
} as const;

export type RateAction = keyof typeof RATE_LIMITS;

export function rateWindowId(nowMs: number, windowMs = 60_000): number {
  return Math.floor(nowMs / windowMs);
}

/**
 * Incrementa só enquanto hits < limite ($4).
 * Estourou: o UPDATE não acontece e RETURNING volta vazio — rejeição não soma de novo.
 */
export const HIT_RATE_SQL = `insert into rate_limits (user_id, action, window_id, hits)
  values ($1, $2, $3, 1)
  on conflict (user_id, action, window_id)
  do update set hits = rate_limits.hits + 1
  where rate_limits.hits < $4
  returning hits`;

/** Remove janelas anteriores à informada. Chamado de forma preguiçosa a cada hit. */
export const CLEANUP_RATE_SQL = `delete from rate_limits where window_id < $1`;
