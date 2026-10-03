import { AI_LIMITS, type PlanId } from "./domain.ts";

/**
 * Preços estimados, não tabela oficial do provedor.
 * Os números são os mesmos já usados na V2.1, agora com versão e vigência.
 */
export const AI_PRICING = [
  {
    provider: "grok",
    model: "grok",
    inputCostPer1M: 2,
    outputCostPer1M: 6,
    effectiveFrom: "2026-10-01",
    version: "2026-10-01",
    estimated: true,
  },
  {
    provider: "gemini",
    model: "gemini",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
    effectiveFrom: "2026-10-01",
    version: "2026-10-01",
    estimated: true,
  },
] as const;

export const AI_OPERATIONS = [
  "PHOTO_ANALYSIS",
  "TEXT_FOOD_IDENTIFICATION",
  "COACH",
  "FOOD_SEARCH_ASSIST",
  "OTHER",
] as const;

export type AiOperation = (typeof AI_OPERATIONS)[number];

const OPERATION_MAP: Record<string, AiOperation> = {
  PHOTO_ANALYSIS: "PHOTO_ANALYSIS",
  TEXT_FOOD_IDENTIFICATION: "TEXT_FOOD_IDENTIFICATION",
  COACH: "COACH",
  FOOD_SEARCH_ASSIST: "FOOD_SEARCH_ASSIST",
  OTHER: "OTHER",
  analyzePhoto: "PHOTO_ANALYSIS",
  analyzeText: "TEXT_FOOD_IDENTIFICATION",
  sendChat: "COACH",
  askInsight: "COACH",
  weeklyCoach: "COACH",
  lookupBarcode: "FOOD_SEARCH_ASSIST",
};

export function canonicalOperation(operation: string): AiOperation {
  return OPERATION_MAP[operation] ?? "OTHER";
}

export function pricingFor(provider: string | null | undefined) {
  return provider === "gemini" ? AI_PRICING[1] : AI_PRICING[0];
}

export function priceCall(input: {
  provider: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
}): { estimatedCost: number | null; pricingVersion: string; totalTokens: number | null } {
  const row = pricingFor(input.provider);
  if (input.inputTokens == null && input.outputTokens == null) {
    return { estimatedCost: null, pricingVersion: row.version, totalTokens: null };
  }
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const estimatedCost = (inputTokens * row.inputCostPer1M + outputTokens * row.outputCostPer1M) / 1_000_000;
  return { estimatedCost, pricingVersion: row.version, totalTokens: inputTokens + outputTokens };
}

export type UsageRow = {
  userId: string;
  operation: string;
  estimatedCost: number | null;
  totalTokens: number | null;
  success: boolean;
  createdAt: string;
};

export type UsageBucket = {
  calls: number;
  errors: number;
  tokens: number;
  estimatedCost: number;
  averageCost: number;
  errorRate: number;
};

function emptyBucket(): UsageBucket {
  return { calls: 0, errors: 0, tokens: 0, estimatedCost: 0, averageCost: 0, errorRate: 0 };
}

function finish(bucket: UsageBucket): UsageBucket {
  bucket.averageCost = bucket.calls === 0 ? 0 : bucket.estimatedCost / bucket.calls;
  bucket.errorRate = bucket.calls === 0 ? 0 : bucket.errors / bucket.calls;
  return bucket;
}

function add(bucket: UsageBucket, row: UsageRow) {
  bucket.calls += 1;
  if (!row.success) bucket.errors += 1;
  bucket.tokens += row.totalTokens ?? 0;
  bucket.estimatedCost += row.estimatedCost ?? 0;
}

export function aggregateUsage(rows: UsageRow[]) {
  const users = new Map<string, UsageBucket>();
  const operations = new Map<string, UsageBucket>();
  const daily = new Map<string, UsageBucket>();
  const monthly = new Map<string, UsageBucket>();
  for (const row of rows) {
    const user = users.get(row.userId) ?? emptyBucket();
    add(user, row);
    users.set(row.userId, user);
    const operation = operations.get(row.operation) ?? emptyBucket();
    add(operation, row);
    operations.set(row.operation, operation);
    const day = row.createdAt.slice(0, 10);
    const month = row.createdAt.slice(0, 7);
    const dayKey = `${row.userId}:${day}`;
    const monthKey = `${row.userId}:${month}`;
    const dayBucket = daily.get(dayKey) ?? emptyBucket();
    add(dayBucket, row);
    daily.set(dayKey, dayBucket);
    const monthBucket = monthly.get(monthKey) ?? emptyBucket();
    add(monthBucket, row);
    monthly.set(monthKey, monthBucket);
  }
  const pack = (map: Map<string, UsageBucket>) =>
    [...map.entries()].map(([key, bucket]) => ({ key, ...finish(bucket) }));
  return { users: pack(users), operations: pack(operations), daily: pack(daily), monthly: pack(monthly) };
}

/** Teto interno por plano. O cliente não escolhe o plano — isso só descreve a cota do servidor. */
export function planAllowance(plan: PlanId) {
  const daily = AI_LIMITS[plan];
  return {
    plan,
    daily,
    monthly: {
      image: daily.image * 30,
      text: daily.text * 30,
      chat: daily.chat * 30,
    },
  };
}
