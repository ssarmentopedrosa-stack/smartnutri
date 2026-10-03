import type { Sql } from "@/lib/db";
import { AI_LIMITS, type PlanId } from "./domain.ts";
import { ensureUsageSql, quotaColumn, releaseQuotaSql, reserveQuotaSql, type QuotaKind } from "./quota.ts";
import { HIT_RATE_SQL, CLEANUP_RATE_SQL, RATE_LIMITS, rateWindowId, type RateAction } from "./rate-limit.ts";
import { canonicalOperation, priceCall } from "./pricing.ts";
import { logEvent } from "./observe.ts";
import { dayKeyInTimeZone } from "./timezone.ts";

const QUOTA_LABEL: Record<QuotaKind, string> = {
  image: "análises de foto",
  text: "interpretações de texto",
  chat: "mensagens para a Calu",
};

export async function effectivePlan(sql: Sql, userId: string): Promise<PlanId> {
  const rows = await sql<{ plan: string; status: string }>`
    select plan, status from subscriptions
    where user_id = ${userId} and status in ('active', 'trialing')
    order by updated_at desc
    limit 1
  `;
  return rows[0]?.plan === "premium" ? "premium" : "free";
}

export async function quotaDay(sql: Sql, userId: string, now = new Date()): Promise<string> {
  const rows = await sql<{ timezone: string }>`select timezone from profiles where user_id = ${userId}`;
  return dayKeyInTimeZone(now, rows[0]?.timezone || "America/Sao_Paulo");
}

export async function isMinorUser(sql: Sql, userId: string): Promise<boolean> {
  const rows = await sql<{ age: number | null }>`select age from profiles where user_id = ${userId}`;
  const age = Number(rows[0]?.age);
  return Number.isFinite(age) && age > 0 && age < 18;
}

export async function reserveQuota(
  sql: Sql,
  userId: string,
  day: string,
  kind: QuotaKind,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const plan = await effectivePlan(sql, userId);
  const limit = AI_LIMITS[plan][kind];
  const reserved = await sql.transaction(async (tx) => {
    await tx.query(ensureUsageSql(), [userId, day]);
    const rows = await tx.query<Record<string, number>>(reserveQuotaSql(kind), [userId, day, limit]);
    return rows.length > 0;
  });
  if (reserved) return { ok: true };
  const label = plan === "premium" ? "Premium" : "gratuito";
  return {
    ok: false,
    error: `Você chegou ao limite de ${limit} ${QUOTA_LABEL[kind]} de hoje no plano ${label}. O registro manual continua disponível.`,
  };
}

export async function releaseQuota(sql: Sql, userId: string, day: string, kind: QuotaKind): Promise<void> {
  await sql.query(releaseQuotaSql(kind), [userId, day]);
}

export async function hitRateLimit(
  sql: Sql,
  userId: string,
  action: RateAction,
  nowMs = Date.now(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  const windowId = rateWindowId(nowMs);
  const limit = RATE_LIMITS[action];
  await sql.query(CLEANUP_RATE_SQL, [windowId - 2]).catch(() => undefined);
  const rows = await sql.query<{ hits: number }>(HIT_RATE_SQL, [userId, action, windowId, limit]);
  if (!rows[0]) {
    logEvent("rate_limit_rejected", {
      category: "RATE_LIMIT",
      userId,
      operation: action,
      success: false,
    });
    return { ok: false, error: "Muitas tentativas em pouco tempo. Espere um minuto e tente de novo." };
  }
  return { ok: true };
}

export async function recordAiCall(
  sql: Sql,
  input: {
    userId: string;
    operation: string;
    provider: string | null;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    success: boolean;
    durationMs: number;
    requestId: string;
    errorType?: string | null;
  },
): Promise<void> {
  const priced = priceCall({
    provider: input.provider,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
  });
  const operation = canonicalOperation(input.operation);
  await sql`
    insert into ai_calls (
      id, user_id, operation, provider, model, input_tokens, output_tokens, total_tokens,
      estimated_cost, pricing_version, success, duration_ms, request_id, error_type
    ) values (
      ${crypto.randomUUID()}, ${input.userId}, ${operation}, ${input.provider}, ${input.model},
      ${input.inputTokens}, ${input.outputTokens}, ${priced.totalTokens}, ${priced.estimatedCost},
      ${priced.pricingVersion}, ${input.success}, ${input.durationMs}, ${input.requestId},
      ${input.errorType ?? null}
    )
  `;
}

export async function findOwnedMeal(sql: Sql, userId: string, mealId: string): Promise<{ id: string } | null> {
  const rows = await sql.query<{ id: string }>(
    "select id from meals where id = $1 and user_id = $2",
    [mealId, userId],
  );
  return rows[0] ?? null;
}

export async function wipeUserData(sql: Sql, userId: string): Promise<void> {
  await sql`delete from food_items where user_id = ${userId}`;
  await sql`delete from meals where user_id = ${userId}`;
  await sql`delete from water_logs where user_id = ${userId}`;
  await sql`delete from weight_logs where user_id = ${userId}`;
  await sql`delete from habit_checks where user_id = ${userId}`;
  await sql`delete from habits where user_id = ${userId}`;
  await sql`delete from micro_habits where user_id = ${userId}`;
  await sql`delete from ai_messages where user_id = ${userId}`;
  await sql`delete from ai_memory where user_id = ${userId}`;
  await sql`delete from ai_usage where user_id = ${userId}`;
  await sql`delete from ai_calls where user_id = ${userId}`;
  await sql`delete from notification_prefs where user_id = ${userId}`;
  await sql`delete from goals where user_id = ${userId}`;
  await sql`delete from analytics_events where user_id = ${userId}`;
  await sql`delete from rate_limits where user_id = ${userId}`;
  await sql`delete from daily_insights where user_id = ${userId}`;
  await sql`delete from subscriptions where user_id = ${userId}`;
  await sql`delete from profiles where user_id = ${userId}`;
}

export async function wipeAuthIdentity(sql: Sql, userId: string): Promise<void> {
  const users = await sql<{ email: string }>`select email from "user" where id = ${userId}`;
  const email = users[0]?.email;
  if (email) await sql`delete from "verification" where identifier = ${email}`;
  await sql`delete from "session" where "userId" = ${userId}`;
  await sql`delete from "account" where "userId" = ${userId}`;
  await sql`delete from "user" where id = ${userId}`;
}

export function quotaKindColumn(kind: QuotaKind): string {
  return quotaColumn(kind);
}
