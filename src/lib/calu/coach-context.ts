import { round1 } from "./domain.ts";
import { weightTrend } from "./longitudinal.ts";
import { isValidTimeZone } from "./timezone.ts";

export type CoachGoals = {
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fiber: number | null;
  waterMl: number | null;
};

export type CoachToday = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  waterMl: number;
  mealCount: number;
  incompleteItems: number;
  weightKg: number | null;
  habitsDone: number;
  habitsTotal: number;
};

export type CoachHistoryDay = {
  day: string;
  calories: number;
  protein: number;
  waterMl: number;
  meals: number;
  weightKg: number | null;
};

export type CoachHistory = {
  span: 7;
  recordedDays: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgWaterMl: number | null;
  proteinDaysMet: number | null;
  waterTrend: "up" | "down" | "stable" | "insufficient";
  waterTrendText: string | null;
  proteinTrendText: string | null;
  weightText: string | null;
};

export type CoachContext = {
  date: string;
  timezone: string;
  hour: number;
  qualitative: boolean;
  tracksWeight: boolean;
  goals: CoachGoals;
  today: CoachToday;
  history: CoachHistory;
};

export type CoachContextInput = {
  date: string;
  timezone: string;
  hour: number;
  qualitative: boolean;
  tracksWeight: boolean;
  goals: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
    waterMl: number;
  } | null;
  today: CoachToday;
  historyDays: CoachHistoryDay[];
};

const PRIVATE_KEY = /^(userId|user_id|email|name|token|password|secret|authorization|image|photo|prompt)$/i;

function positive(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function finite(value: number, digits: 0 | 1 = 1): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (digits === 0) return Math.round(value);
  return round1(value);
}

/** O número do cliente nunca substitui o que o servidor calculou. */
export function clientNutritionIgnored(serverValue: number, clientValue: unknown): number {
  void clientValue;
  return serverValue;
}

/** O id da sessão é a única identidade. Um userId enviado pelo cliente é ignorado. */
export function scopedUserId(sessionUserId: string, clientBody: unknown): string {
  if (clientBody && typeof clientBody === "object") return sessionUserId;
  return sessionUserId;
}

export function fillHistoryDays(
  days: string[],
  meals: { day: string; meals: number; calories: number; protein: number }[],
  water: { day: string; ml: number }[],
  weights: { day: string; kg: number }[],
): CoachHistoryDay[] {
  return days.map((day) => {
    const meal = meals.find((row) => row.day === day);
    const ml = water.find((row) => row.day === day);
    const weight = weights.find((row) => row.day === day);
    return {
      day,
      calories: meal ? finite(meal.calories, 0) : 0,
      protein: meal ? finite(meal.protein) : 0,
      waterMl: ml ? finite(ml.ml, 0) : 0,
      meals: meal ? finite(meal.meals, 0) : 0,
      weightKg: weight && Number.isFinite(weight.kg) ? round1(weight.kg) : null,
    };
  });
}

export function summarizeCoachHistory(days: CoachHistoryDay[], proteinTarget: number | null): CoachHistory {
  const recorded = days.filter((day) => day.meals > 0);
  const recordedDays = recorded.length;
  const avgCalories = recordedDays
    ? Math.round(recorded.reduce((sum, day) => sum + day.calories, 0) / recordedDays)
    : null;
  const avgProtein = recordedDays
    ? round1(recorded.reduce((sum, day) => sum + day.protein, 0) / recordedDays)
    : null;
  const waterDays = days.filter((day) => day.waterMl > 0);
  const avgWaterMl = waterDays.length
    ? Math.round(waterDays.reduce((sum, day) => sum + day.waterMl, 0) / waterDays.length)
    : null;
  const proteinDaysMet =
    proteinTarget != null && proteinTarget > 0
      ? days.filter((day) => day.meals > 0 && day.protein >= proteinTarget).length
      : null;
  const recent = days.slice(-3);
  const prior = days.slice(-6, -3);
  const logged = (rows: CoachHistoryDay[]) => rows.filter((day) => day.waterMl > 0);
  const meanWater = (rows: CoachHistoryDay[]) => {
    const used = logged(rows);
    if (used.length < 2) return null;
    return used.reduce((sum, day) => sum + day.waterMl, 0) / used.length;
  };
  const recentMean = meanWater(recent);
  const priorMean = meanWater(prior);
  let waterTrend: CoachHistory["waterTrend"] = "insufficient";
  if (recentMean != null && priorMean != null && priorMean > 0) {
    if (recentMean >= priorMean * 1.15) waterTrend = "up";
    else if (recentMean <= priorMean * 0.85) waterTrend = "down";
    else waterTrend = "stable";
  }
  const waterTrendText =
    waterTrend === "up"
      ? "Seu consumo de água melhorou nos últimos 3 dias."
      : waterTrend === "stable"
        ? "A água registrada ficou estável nos últimos dias."
        : waterTrend === "down"
          ? "A água registrada ficou menor nos últimos 3 dias do que nos dias anteriores."
          : null;
  const proteinTrendText =
    proteinDaysMet != null && proteinDaysMet > 0
      ? `Você atingiu sua meta de proteína em ${proteinDaysMet} dos últimos 7 dias.`
      : null;
  const weight = weightTrend(
    days
      .filter((day) => day.weightKg != null)
      .map((day) => ({ day: day.day, kg: day.weightKg as number })),
  );
  const weightText =
    weight.status === "stable"
      ? "Seu peso permaneceu estável na última semana."
      : weight.status === "insufficient"
        ? null
        : weight.narrative;
  return {
    span: 7,
    recordedDays,
    avgCalories,
    avgProtein,
    avgWaterMl,
    proteinDaysMet,
    waterTrend,
    waterTrendText,
    proteinTrendText,
    weightText,
  };
}

export function buildCoachContext(input: CoachContextInput): CoachContext {
  const timezone = isValidTimeZone(input.timezone) ? input.timezone : "America/Sao_Paulo";
  const hour = Number.isFinite(input.hour) ? Math.min(23, Math.max(0, Math.round(input.hour))) : 12;
  const hideTargets = input.qualitative;
  const goals: CoachGoals = {
    calories: hideTargets ? null : positive(input.goals?.calories),
    protein: hideTargets ? null : positive(input.goals?.protein),
    carbohydrates: hideTargets ? null : positive(input.goals?.carbohydrates),
    fat: hideTargets ? null : positive(input.goals?.fat),
    fiber: hideTargets ? null : positive(input.goals?.fiber),
    waterMl: positive(input.goals?.waterMl),
  };
  const today: CoachToday = {
    calories: clientNutritionIgnored(finite(input.today.calories, 0), null),
    protein: clientNutritionIgnored(finite(input.today.protein), null),
    carbohydrates: finite(input.today.carbohydrates),
    fat: finite(input.today.fat),
    fiber: finite(input.today.fiber),
    waterMl: finite(input.today.waterMl, 0),
    mealCount: finite(input.today.mealCount, 0),
    incompleteItems: finite(input.today.incompleteItems, 0),
    weightKg: input.today.weightKg != null && Number.isFinite(input.today.weightKg) ? round1(input.today.weightKg) : null,
    habitsDone: finite(input.today.habitsDone, 0),
    habitsTotal: finite(input.today.habitsTotal, 0),
  };
  return {
    date: input.date,
    timezone,
    hour,
    qualitative: input.qualitative,
    tracksWeight: input.tracksWeight,
    goals,
    today,
    history: summarizeCoachHistory(input.historyDays, goals.protein),
  };
}

export function coachContextForModel(ctx: CoachContext): Record<string, unknown> {
  const pct = (consumed: number, target: number | null) =>
    target != null && target > 0 ? Math.round((consumed / target) * 100) : null;
  return {
    version: "v32",
    date: ctx.date,
    hour: ctx.hour,
    qualitative: ctx.qualitative,
    goals: ctx.goals,
    today: ctx.today,
    percentages: {
      calories: pct(ctx.today.calories, ctx.goals.calories),
      protein: pct(ctx.today.protein, ctx.goals.protein),
      water: pct(ctx.today.waterMl, ctx.goals.waterMl),
    },
    history: {
      span: ctx.history.span,
      recordedDays: ctx.history.recordedDays,
      avgCalories: ctx.qualitative ? null : ctx.history.avgCalories,
      avgProtein: ctx.history.avgProtein,
      avgWaterMl: ctx.history.avgWaterMl,
      proteinDaysMet: ctx.history.proteinDaysMet,
      waterTrendText: ctx.history.waterTrendText,
      proteinTrendText: ctx.history.proteinTrendText,
      weightText: ctx.history.weightText,
    },
  };
}

export function contextHasPrivateKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => contextHasPrivateKeys(item));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nested]) => PRIVATE_KEY.test(key) || contextHasPrivateKeys(nested));
}
