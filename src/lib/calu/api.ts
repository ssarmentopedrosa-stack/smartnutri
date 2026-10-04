import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  ACTIVITIES,
  AI_LIMITS,
  ANALYTICS_EVENTS,
  DIETS,
  GOALS,
  LEGAL_VERSIONS,
  UNITS,
  asksMemory,
  estimateGoals,
  extractJson,
  makeFood,
  mealLabel,
  memoryCommand,
  safetyReply,
  sumFoods,
  type ActivityId,
  type AnalyticsEvent,
  type DietId,
  type FoodDraft,
  type GoalId,
  type GoalTargets,
  type MealType,
  type PlanId,
  type SexId,
  MEAL_TYPES,
} from "./domain";
import { enrichAnalysis } from "./pipeline";
import { logEvent, newRequestId } from "./observe";
import {
  effectivePlan,
  findOwnedMeal,
  hitRateLimit,
  isMinorUser,
  quotaDay,
  recordAiCall,
  releaseQuota,
  reserveQuota,
  wipeAuthIdentity,
  wipeUserData,
} from "./ops";
import { normalizeOffProduct, type OffNormalized } from "./off";
import { calculateNutrition } from "./nutrition";
import { resolveFoodName } from "./resolver";
import { preferStructuredSource } from "./search";
import { authorizeRecordedFood } from "./authority";
import { parseBarcode, parseDay, parseEntityId, parseImageBase64, parseAge, parseNotificationEnabled, assertNotFutureDay } from "./validation";
import { isValidTimeZone, shiftDayKey, dayKeyInTimeZone, hourInTimeZone, daysInclusive } from "./timezone";
import { buildDailyBoard, contextHash, foodRecordState, insightContext, parseDailyInsight, rescaleRecordedFood, type DailyBoard } from "./daily-board";
import { buildCoachContext, fillHistoryDays, scopedUserId, type CoachContext, coachContextForModel } from "./coach-context";
import {
  decideCoach,
  fallbackCoachAnswer,
  parseCoachAsk,
  resolveCoachAsk,
  coachQuestionHash,
  type CoachAnswer,
  type DailyCoachCard,
} from "./daily-coach";
import { getDailySummary, summarizeWindow, type DailySummary, type DayAgg } from "./longitudinal";
import { fallbackCoach, parseCoach } from "./coach";
import type { TokenUsage } from "./ai.server";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };
type Result<T> = Ok<T> | Err;

const FAIL = "Não consegui concluir isso agora. Tente de novo em instantes.";

function dayOf(value: unknown): string {
  return parseDay(value);
}

async function rejectFuture(sql: Sql, userId: string, day: string): Promise<string> {
  const rows = await sql<{ timezone: string }>`select timezone from profiles where user_id = ${userId}`;
  const today = dayKeyInTimeZone(new Date(), rows[0]?.timezone || "America/Sao_Paulo");
  return assertNotFutureDay(day, today);
}

function boardFor(
  day: string,
  hour: number,
  qualitative: boolean,
  meals: MealDTO[],
  waterMl: number,
  goals: (GoalTargets & { qualitative?: boolean }) | null,
): DailyBoard {
  const foods = meals.flatMap((meal) => meal.foods);
  return buildDailyBoard({
    day,
    hour,
    qualitative,
    mealCount: meals.length,
    calories: meals.reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0),
    protein: meals.reduce((sum, meal) => sum + Number(meal.protein ?? 0), 0),
    carbohydrates: meals.reduce((sum, meal) => sum + Number(meal.carbohydrates ?? 0), 0),
    fat: meals.reduce((sum, meal) => sum + Number(meal.fat ?? 0), 0),
    fiber: meals.reduce((sum, meal) => sum + Number(meal.fiber ?? 0), 0),
    waterMl,
    targets: goals,
    incompleteItems: foods.filter((food) => foodRecordState(food) !== "CONFIRMED").length,
  });
}

function coachContextFrom(input: {
  day: string;
  timezone: string;
  hour: number;
  qualitative: boolean;
  tracksWeight: boolean;
  goals: GoalTargets | null;
  meals: MealDTO[];
  waterMl: number;
  weightKg: number | null;
  habitsDone: number;
  habitsTotal: number;
  historyDays: ReturnType<typeof fillHistoryDays>;
}): CoachContext {
  const foods = input.meals.flatMap((meal) => meal.foods);
  return buildCoachContext({
    date: input.day,
    timezone: input.timezone,
    hour: input.hour,
    qualitative: input.qualitative,
    tracksWeight: input.tracksWeight,
    goals: input.goals,
    today: {
      calories: input.meals.reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0),
      protein: input.meals.reduce((sum, meal) => sum + Number(meal.protein ?? 0), 0),
      carbohydrates: input.meals.reduce((sum, meal) => sum + Number(meal.carbohydrates ?? 0), 0),
      fat: input.meals.reduce((sum, meal) => sum + Number(meal.fat ?? 0), 0),
      fiber: input.meals.reduce((sum, meal) => sum + Number(meal.fiber ?? 0), 0),
      waterMl: input.waterMl,
      mealCount: input.meals.length,
      incompleteItems: foods.filter((food) => foodRecordState(food) !== "CONFIRMED").length,
      weightKg: input.weightKg,
      habitsDone: input.habitsDone,
      habitsTotal: input.habitsTotal,
    },
    historyDays: input.historyDays,
  });
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function plainRow(row: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value == null) out[key] = null;
    else if (value instanceof Date) out[key] = value.toISOString();
    else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") out[key] = value;
    else out[key] = String(value);
  }
  return out;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

async function quiet<T>(fn: () => Promise<T>): Promise<T | Err> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message && error.message.length < 180 && !/sql|postgres|duplicate/i.test(error.message)) {
      return { ok: false, error: error.message };
    }
    console.error(JSON.stringify({ event: "calu_request_failed" }));
    return { ok: false, error: FAIL };
  }
}

type ProfileRow = {
  user_id: string;
  name: string;
  age: number | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string;
  activity: string;
  diet: string;
  diet_note: string | null;
  restrictions: string | null;
  plan: string;
  consent_at: unknown;
  timezone?: string | null;
  consent_version?: string | null;
  terms_version?: string | null;
  privacy_version?: string | null;
};

export type ProfileDTO = {
  name: string;
  age: number | null;
  sex: SexId;
  heightCm: number | null;
  weightKg: number | null;
  goal: GoalId;
  activity: ActivityId;
  diet: DietId;
  dietNote: string;
  restrictions: string;
  plan: PlanId;
  consentAt: string | null;
  timezone: string;
  consentVersion: string | null;
  termsVersion: string | null;
  privacyVersion: string | null;
};

function mapProfile(row: ProfileRow): ProfileDTO {
  const sex: SexId = row.sex === "feminino" || row.sex === "masculino" ? row.sex : "nao_informar";
  const goal = GOALS.some((g) => g.id === row.goal) ? (row.goal as GoalId) : "acompanhar";
  const activity = ACTIVITIES.some((a) => a.id === row.activity) ? (row.activity as ActivityId) : "leve";
  const diet = DIETS.some((d) => d.id === row.diet) ? (row.diet as DietId) : "livre";
  return {
    name: row.name,
    age: num(row.age),
    sex,
    heightCm: num(row.height_cm),
    weightKg: num(row.weight_kg),
    goal,
    activity,
    diet,
    dietNote: row.diet_note ?? "",
    restrictions: row.restrictions ?? "",
    plan: row.plan === "premium" ? "premium" : "free",
    consentAt: row.consent_at ? iso(row.consent_at) : null,
    timezone: row.timezone && isValidTimeZone(row.timezone) ? row.timezone : "America/Sao_Paulo",
    consentVersion: row.consent_version ?? null,
    termsVersion: row.terms_version ?? null,
    privacyVersion: row.privacy_version ?? null,
  };
}

type GoalRow = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  water_ml: number;
  is_estimate: unknown;
  source?: string | null;
  qualitative?: unknown;
};

function mapGoals(row: GoalRow): GoalTargets & { isEstimate: boolean; qualitative: boolean; source: string } {
  return {
    calories: Math.round(Number(row.calories)),
    protein: Number(row.protein),
    carbohydrates: Number(row.carbohydrates),
    fat: Number(row.fat),
    fiber: Number(row.fiber),
    waterMl: Math.round(Number(row.water_ml)),
    isEstimate: asBool(row.is_estimate),
    qualitative: asBool(row.qualitative),
    source: row.source === "USER_DEFINED" || row.source === "QUALITATIVE" || row.source === "GENERIC_REFERENCE" ? row.source : "AI_ESTIMATE",
  };
}

function mapFood(row: Record<string, unknown>): FoodDraft {
  return {
    id: String(row.id),
    name: String(row.name),
    quantity: Number(row.quantity),
    unit: String(row.unit),
    calories: num(row.calories),
    protein: num(row.protein),
    carbohydrates: num(row.carbohydrates),
    fat: num(row.fat),
    fiber: num(row.fiber),
    confidence: num(row.confidence),
    source: (["ai", "taco", "user", "barcode"].includes(String(row.source))
      ? String(row.source)
      : "user") as FoodDraft["source"],
    dataStatus: (["estimate", "reference", "unavailable"].includes(String(row.data_status))
      ? String(row.data_status)
      : "unavailable") as FoodDraft["dataStatus"],
    baseQuantity: Number(row.base_quantity ?? row.quantity),
    baseCalories: num(row.base_calories),
    baseProtein: num(row.base_protein),
    baseCarbohydrates: num(row.base_carbohydrates),
    baseFat: num(row.base_fat),
    baseFiber: num(row.base_fiber),
    nutritionSource: (["TACO", "OPEN_FOOD_FACTS", "USER_CONFIRMED", "AI_ESTIMATE"].includes(String(row.nutrition_source))
      ? String(row.nutrition_source)
      : undefined) as FoodDraft["nutritionSource"],
    identificationConfidence: num(row.identification_confidence),
    portionConfidence: num(row.portion_confidence),
    nutritionConfidence: num(row.nutrition_confidence),
  };
}

export type MealDTO = {
  id: string;
  day: string;
  mealType: MealType;
  eatenAt: string;
  source: string;
  note: string;
  uncertainties: string[];
  insight: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  incomplete: boolean;
  foods: FoodDraft[];
};

async function loadMeals(sql: Sql, userId: string, day: string): Promise<MealDTO[]> {
  const meals = await sql<Record<string, unknown>>`
    select id, day, meal_type, eaten_at, source, note, uncertainties, insight,
           calories, protein, carbohydrates, fat, fiber, incomplete
    from meals
    where user_id = ${userId} and day = ${day}
    order by eaten_at asc
  `;
  if (meals.length === 0) return [];
  const foods = await sql<Record<string, unknown>>`
    select f.*
    from food_items f
    join meals m on m.id = f.meal_id and m.user_id = f.user_id
    where f.user_id = ${userId} and m.day = ${day}
    order by f.position asc
  `;
  const byMeal = new Map<string, FoodDraft[]>();
  for (const food of foods) {
    const mealId = String(food.meal_id);
    const list = byMeal.get(mealId) ?? [];
    list.push(mapFood(food));
    byMeal.set(mealId, list);
  }
  return meals.map((meal) => {
    const type = MEAL_TYPES.some((m) => m.id === meal.meal_type) ? (meal.meal_type as MealType) : "snack";
    let uncertainties: string[] = [];
    try {
      const parsed = JSON.parse(String(meal.uncertainties ?? "[]"));
      if (Array.isArray(parsed)) uncertainties = parsed.map((item) => String(item)).slice(0, 8);
    } catch {
      uncertainties = [];
    }
    return {
      id: String(meal.id),
      day: String(meal.day),
      mealType: type,
      eatenAt: iso(meal.eaten_at),
      source: String(meal.source),
      note: String(meal.note ?? ""),
      uncertainties,
      insight: String(meal.insight ?? ""),
      calories: Number(meal.calories ?? 0),
      protein: Number(meal.protein ?? 0),
      carbohydrates: Number(meal.carbohydrates ?? 0),
      fat: Number(meal.fat ?? 0),
      fiber: Number(meal.fiber ?? 0),
      incomplete: asBool(meal.incomplete),
      foods: byMeal.get(String(meal.id)) ?? [],
    };
  });
}

function parseFoods(input: unknown): { foods: FoodDraft[]; barcodes: Record<string, string> } {
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) {
    throw new Error("Inclua pelo menos um alimento.");
  }
  const barcodes: Record<string, string> = {};
  const foods = input.map((item) => {
    const food = item as Partial<FoodDraft> & { barcode?: unknown };
    const name = String(food.name ?? "").trim();
    if (name.length < 1) throw new Error("Todo alimento precisa de um nome.");
    const unit = UNITS.includes(food.unit as (typeof UNITS)[number]) ? String(food.unit) : "g";
    const quantity = num(food.quantity);
    if (quantity == null || quantity <= 0 || quantity > 10000) throw new Error("Quantidade inválida.");
    const rawId = String(food.id ?? "");
    const id = /^[0-9a-f-]{16,40}$/i.test(rawId) ? rawId : crypto.randomUUID();
    const barcode = String(food.barcode ?? "").replace(/\D/g, "");
    if (barcode.length >= 8 && barcode.length <= 32) barcodes[id] = barcode;
    const draft = makeFood({
      id,
      name,
      quantity,
      unit,
      calories: num(food.calories) == null ? null : Math.round(num(food.calories)!),
      protein: num(food.protein),
      carbohydrates: num(food.carbohydrates),
      fat: num(food.fat),
      fiber: num(food.fiber),
      confidence: num(food.confidence),
      source: (["ai", "taco", "user", "barcode"].includes(String(food.source))
        ? String(food.source)
        : "user") as FoodDraft["source"],
      dataStatus: (["estimate", "reference", "unavailable"].includes(String(food.dataStatus))
        ? String(food.dataStatus)
        : "unavailable") as FoodDraft["dataStatus"],
    });
    draft.nutritionSource = (["TACO", "OPEN_FOOD_FACTS", "USER_CONFIRMED", "AI_ESTIMATE"].includes(String(food.nutritionSource))
      ? food.nutritionSource
      : food.source === "taco"
        ? "TACO"
        : food.source === "barcode"
          ? "OPEN_FOOD_FACTS"
          : food.source === "user"
            ? "USER_CONFIRMED"
            : "AI_ESTIMATE") as FoodDraft["nutritionSource"];
    draft.identificationConfidence = num(food.identificationConfidence);
    draft.portionConfidence = num(food.portionConfidence);
    draft.nutritionConfidence = num(food.nutritionConfidence);
    draft.review = food.review === "high" || food.review === "medium" || food.review === "low" ? food.review : undefined;
    return draft;
  });
  return { foods, barcodes };
}

async function writeFoods(sql: Sql, userId: string, mealId: string, foods: FoodDraft[]) {
  await sql`delete from food_items where meal_id = ${mealId} and user_id = ${userId}`;
  for (let i = 0; i < foods.length; i++) {
    const food = foods[i]!;
    const clash = await sql<{ id: string }>`select id from food_items where id = ${food.id} limit 1`;
    const id = clash[0] ? crypto.randomUUID() : food.id;
    await sql`
      insert into food_items (
        id, meal_id, user_id, name, quantity, unit, calories, protein, carbohydrates, fat, fiber,
        confidence, source, data_status, base_quantity, base_calories, base_protein, base_carbohydrates,
        base_fat, base_fiber, nutrition_source, identification_confidence, portion_confidence,
        nutrition_confidence, position, updated_at
      ) values (
        ${id}, ${mealId}, ${userId}, ${food.name}, ${food.quantity}, ${food.unit},
        ${food.calories}, ${food.protein}, ${food.carbohydrates}, ${food.fat}, ${food.fiber},
        ${food.confidence}, ${food.source}, ${food.dataStatus}, ${food.baseQuantity}, ${food.baseCalories},
        ${food.baseProtein}, ${food.baseCarbohydrates}, ${food.baseFat}, ${food.baseFiber},
        ${food.nutritionSource ?? "AI_ESTIMATE"}, ${food.identificationConfidence ?? null},
        ${food.portionConfidence ?? null}, ${food.nutritionConfidence ?? null}, ${i}, now()
      )
    `;
  }
}

type ProfileInput = {
  name: string;
  age: number | null;
  sex: SexId;
  heightCm: number | null;
  weightKg: number | null;
  goal: GoalId;
  activity: ActivityId;
  diet: DietId;
  dietNote: string;
  restrictions: string;
  consent: boolean;
  recalculate: boolean;
  timezone: string;
};

function parseProfile(input: unknown): ProfileInput {
  const body = (input ?? {}) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (name.length < 2 || name.length > 60) throw new Error("Informe como quer ser chamado.");
  const ageRaw = parseAge(body.age);
  const sex: SexId =
    body.sex === "feminino" || body.sex === "masculino" ? body.sex : "nao_informar";
  const height = body.heightCm === "" || body.heightCm == null ? null : Number(body.heightCm);
  const weight = body.weightKg === "" || body.weightKg == null ? null : Number(body.weightKg);
  if (height != null && (height < 120 || height > 230)) throw new Error("Altura fora da faixa esperada.");
  if (weight != null && (weight < 30 || weight > 300)) throw new Error("Peso fora da faixa esperada.");
  const goal = GOALS.some((g) => g.id === body.goal) ? (body.goal as GoalId) : "acompanhar";
  const activity = ACTIVITIES.some((a) => a.id === body.activity) ? (body.activity as ActivityId) : "leve";
  const diet = DIETS.some((d) => d.id === body.diet) ? (body.diet as DietId) : "livre";
  return {
    name,
    age: ageRaw,
    sex,
    heightCm: height,
    weightKg: weight,
    goal,
    activity,
    diet,
    dietNote: String(body.dietNote ?? "").trim().slice(0, 160),
    restrictions: String(body.restrictions ?? "").trim().slice(0, 240),
    consent: body.consent === true,
    recalculate: body.recalculate === true,
    timezone: isValidTimeZone(String(body.timezone ?? "")) ? String(body.timezone) : "America/Sao_Paulo",
  };
}

async function trackEvent(sql: Sql, userId: string, name: string) {
  if (!ANALYTICS_EVENTS.includes(name as AnalyticsEvent)) return;
  await sql`insert into analytics_events (id, user_id, name) values (${crypto.randomUUID()}, ${userId}, ${name})`;
}

export const track = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((name: string) => String(name ?? ""))
  .handler(async ({ data, context }): Promise<Result<{ saved: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await trackEvent(sql, context.userId, data);
      return { ok: true as const, data: { saved: true as const } };
    });
  });

export const getHome = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day?: string }) => ({ day: dayOf(input?.day) }))
  .handler(async ({ data, context }): Promise<Result<HomeData>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      const profiles = await sql<ProfileRow>`select * from profiles where user_id = ${uid}`;
      const profile = profiles[0] ? mapProfile(profiles[0]) : null;
      const goalRows = await sql<GoalRow>`select * from goals where user_id = ${uid}`;
      const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
      const meals = await loadMeals(sql, uid, data.day);
      const waterRows = await sql<{ total: number }>`
        select coalesce(sum(amount_ml), 0)::float as total from water_logs
        where user_id = ${uid} and day = ${data.day}
      `;
      const habitRows = await sql<Record<string, unknown>>`select * from habits where user_id = ${uid}`;
      const checks = await sql<{ habit: string; done: unknown }>`
        select habit, done from habit_checks where user_id = ${uid} and day = ${data.day}
      `;
      const memory = await sql<{ id: string; fact: string }>`
        select id, fact from ai_memory where user_id = ${uid} order by created_at desc limit 30
      `;
      const usageDay = await quotaDay(sql, uid);
      const usageRows = await sql<{ image_count: number; text_count: number; chat_count: number }>`
        select image_count, text_count, chat_count from ai_usage where user_id = ${uid} and day = ${usageDay}
      `;
      const prefs = await sql<{ enabled: unknown }>`select enabled from notification_prefs where user_id = ${uid}`;
      const usage = usageRows[0] ?? { image_count: 0, text_count: 0, chat_count: 0 };
      const plan = await effectivePlan(sql, uid);
      if (profile) profile.plan = plan;
      const weekStart = shiftDayKey(data.day, -6);
      const weekMeals = await sql<DayAgg>`
        select day, count(*)::float as meals,
          coalesce(sum(calories), 0)::float as calories,
          coalesce(sum(protein), 0)::float as protein,
          coalesce(sum(carbohydrates), 0)::float as carbohydrates,
          coalesce(sum(fat), 0)::float as fat,
          coalesce(sum(fiber), 0)::float as fiber
        from meals
        where user_id = ${uid} and day >= ${weekStart} and day <= ${data.day}
        group by day
      `;
      const weekWater = await sql<{ day: string; ml: number }>`
        select day, coalesce(sum(amount_ml), 0)::float as ml from water_logs
        where user_id = ${uid} and day >= ${weekStart} and day <= ${data.day}
        group by day
      `;
      const weekWeights = await sql<{ day: string; kg: number }>`
        select day, weight_kg as kg from weight_logs
        where user_id = ${uid} and day >= ${weekStart} and day <= ${data.day}
        order by day asc
      `;
      const weekChecks = await sql<{ day: string; done: unknown }>`
        select day, done from habit_checks where user_id = ${uid} and day >= ${weekStart} and day <= ${data.day}
      `;
      const qualitative = Boolean(goals?.qualitative || (profile?.age != null && profile.age < 18));
      const week = summarizeWindow({
        span: 7,
        mealsByDay: weekMeals.map((row) => ({
          day: String(row.day),
          meals: Number(row.meals),
          calories: Number(row.calories),
          protein: Number(row.protein),
          carbohydrates: Number(row.carbohydrates),
          fat: Number(row.fat),
          fiber: Number(row.fiber),
        })),
        waterByDay: weekWater.map((row) => ({ day: row.day, ml: Number(row.ml) })),
        weights: weekWeights.map((row) => ({ day: row.day, kg: Number(row.kg) })),
        habitChecks: weekChecks.map((row) => ({ day: String(row.day), done: asBool(row.done) })),
        goals: goals ? { protein: goals.protein, fiber: goals.fiber, waterMl: goals.waterMl } : null,
        qualitative,
      });
      const microHabits = await sql<{ id: string; label: string }>`
        select id, label from micro_habits where user_id = ${uid} and active = true order by created_at desc limit 12
      `;
      const weightToday = await sql<{ kg: number }>`
        select weight_kg as kg from weight_logs where user_id = ${uid} and day = ${data.day} order by updated_at desc limit 1
      `;
      const habitFlags = habitRows[0]
        ? [habitRows[0].water, habitRows[0].produce, habitRows[0].meals, habitRows[0].activity, habitRows[0].sleep]
        : [true, false, true, false, false];
      const habitsTotal = habitFlags.filter((flag) => asBool(flag)).length + microHabits.length;
      const daily = getDailySummary({
        meals: meals.length,
        calories: meals.reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0),
        protein: meals.reduce((sum, meal) => sum + Number(meal.protein ?? 0), 0),
        carbohydrates: meals.reduce((sum, meal) => sum + Number(meal.carbohydrates ?? 0), 0),
        fat: meals.reduce((sum, meal) => sum + Number(meal.fat ?? 0), 0),
        fiber: meals.reduce((sum, meal) => sum + Number(meal.fiber ?? 0), 0),
        waterMl: Math.round(Number(waterRows[0]?.total ?? 0)),
        weightKg: weightToday[0] ? Number(weightToday[0].kg) : null,
        habitsDone: checks.filter((check) => asBool(check.done)).length,
        habitsTotal,
        incomplete: meals.some((meal) => asBool(meal.incomplete)),
      });
      const hour = hourInTimeZone(new Date(), profile?.timezone || "America/Sao_Paulo");
      const waterMl = Math.round(Number(waterRows[0]?.total ?? 0));
      const board = boardFor(data.day, hour, qualitative, meals, waterMl, goals);
      const insightHash = contextHash(JSON.stringify(insightContext(board)));
      const cachedRows = await sql<{ text: string; context_hash: string }>`
        select text, context_hash from daily_insights where user_id = ${uid} and day = ${data.day}
      `;
      const cachedInsight = cachedRows[0]?.context_hash === insightHash ? cachedRows[0].text : null;
      const habitsDone = checks.filter((check) => asBool(check.done)).length;
      const zone = profile?.timezone || "America/Sao_Paulo";
      const coachHour = data.day < dayKeyInTimeZone(new Date(), zone) ? 21 : hour;
      const coach = decideCoach(
        coachContextFrom({
          day: data.day,
          timezone: zone,
          hour: coachHour,
          qualitative,
          tracksWeight: Boolean(profile && ["controlar", "massa", "manter"].includes(profile.goal)) || weekWeights.length > 0,
          goals,
          meals,
          waterMl,
          weightKg: weightToday[0] ? Number(weightToday[0].kg) : null,
          habitsDone,
          habitsTotal,
          historyDays: fillHistoryDays(
            daysInclusive(weekStart, data.day),
            weekMeals.map((row) => ({
              day: String(row.day),
              meals: Number(row.meals),
              calories: Number(row.calories),
              protein: Number(row.protein),
            })),
            weekWater.map((row) => ({ day: String(row.day), ml: Number(row.ml) })),
            weekWeights.map((row) => ({ day: String(row.day), kg: Number(row.kg) })),
          ),
        }),
      );
      return {
        ok: true as const,
        data: {
          profile,
          goals,
          meals,
          waterMl: Math.round(Number(waterRows[0]?.total ?? 0)),
          habits: {
            water: habitRows[0] ? asBool(habitRows[0].water) : true,
            produce: habitRows[0] ? asBool(habitRows[0].produce) : false,
            meals: habitRows[0] ? asBool(habitRows[0].meals) : true,
            activity: habitRows[0] ? asBool(habitRows[0].activity) : false,
            sleep: habitRows[0] ? asBool(habitRows[0].sleep) : false,
          },
          checks: checks.map((c) => ({ habit: c.habit, done: asBool(c.done) })),
          memory,
          notifications: prefs[0] ? asBool(prefs[0].enabled) : false,
          usage: {
            image: Number(usage.image_count ?? 0),
            text: Number(usage.text_count ?? 0),
            chat: Number(usage.chat_count ?? 0),
            limits: AI_LIMITS[plan],
          },
          week: { lines: week.lines, recordedDays: week.recordedDays, sampleNote: week.sampleNote },
          microHabits,
          daily,
          board,
          cachedInsight,
          coach,
        },
      };
    });
  });

export type HomeData = {
  profile: ProfileDTO | null;
  goals: (GoalTargets & { isEstimate: boolean; qualitative: boolean; source: string }) | null;
  meals: MealDTO[];
  waterMl: number;
  habits: { water: boolean; produce: boolean; meals: boolean; activity: boolean; sleep: boolean };
  checks: { habit: string; done: boolean }[];
  memory: { id: string; fact: string }[];
  notifications: boolean;
  usage: { image: number; text: number; chat: number; limits: { image: number; text: number; chat: number } };
  week?: { lines: string[]; recordedDays: number; sampleNote: string };
  microHabits?: { id: string; label: string }[];
  daily?: DailySummary;
  board?: DailyBoard;
  cachedInsight?: string | null;
  coach?: DailyCoachCard;
};

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseProfile(input))
  .handler(async ({ data, context }): Promise<Result<{ profile: ProfileDTO }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      const existing = await sql<{ user_id: string }>`select user_id from profiles where user_id = ${uid}`;
      if (!existing[0] && !data.consent) {
        return { ok: false, error: "É preciso aceitar a política e os termos para criar o perfil." };
      }
      const profile = await sql.transaction(async (tx) => {
        if (existing[0]) {
          await tx`
            update profiles set
              name = ${data.name}, age = ${data.age}, sex = ${data.sex}, height_cm = ${data.heightCm},
              weight_kg = ${data.weightKg}, goal = ${data.goal}, activity = ${data.activity}, diet = ${data.diet},
              diet_note = ${data.dietNote}, restrictions = ${data.restrictions}, timezone = ${data.timezone},
              updated_at = now()
            where user_id = ${uid}
          `;
        } else {
          await tx`
            insert into profiles (
              user_id, name, age, sex, height_cm, weight_kg, goal, activity, diet, diet_note, restrictions,
              timezone, consent_at, consent_version, terms_version, privacy_version
            ) values (
              ${uid}, ${data.name}, ${data.age}, ${data.sex}, ${data.heightCm}, ${data.weightKg},
              ${data.goal}, ${data.activity}, ${data.diet}, ${data.dietNote}, ${data.restrictions},
              ${data.timezone}, now(), ${LEGAL_VERSIONS.consent}, ${LEGAL_VERSIONS.terms}, ${LEGAL_VERSIONS.privacy}
            )
          `;
          await trackEvent(tx, uid, "onboarding_completed");
        }
        const goalRows = await tx`select user_id from goals where user_id = ${uid}`;
        if (!goalRows[0] || data.recalculate) {
          const estimated = estimateGoals(data);
          const source = estimated.qualitative ? "QUALITATIVE" : estimated.audience === "insufficient" ? "GENERIC_REFERENCE" : "AI_ESTIMATE";
          await tx`
            insert into goals (
              user_id, calories, protein, carbohydrates, fat, fiber, water_ml, is_estimate, source, qualitative, updated_at
            ) values (
              ${uid}, ${estimated.targets.calories}, ${estimated.targets.protein}, ${estimated.targets.carbohydrates},
              ${estimated.targets.fat}, ${estimated.targets.fiber}, ${estimated.targets.waterMl}, true,
              ${source}, ${estimated.qualitative}, now()
            )
            on conflict (user_id) do update set
              calories = excluded.calories,
              protein = excluded.protein,
              carbohydrates = excluded.carbohydrates,
              fat = excluded.fat,
              fiber = excluded.fiber,
              water_ml = excluded.water_ml,
              is_estimate = true,
              source = excluded.source,
              qualitative = excluded.qualitative,
              updated_at = now()
          `;
        }
        const profiles = await tx<ProfileRow>`select * from profiles where user_id = ${uid}`;
        return mapProfile(profiles[0]!);
      });
      return { ok: true as const, data: { profile } };
    });
  });

export const saveGoals = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const body = (input ?? {}) as Record<string, unknown>;
    const calories = Number(body.calories);
    const protein = Number(body.protein);
    const carbohydrates = Number(body.carbohydrates);
    const fat = Number(body.fat);
    const fiber = Number(body.fiber);
    const waterMl = Number(body.waterMl);
    if (calories < 1500) {
      throw new Error("Metas abaixo de 1.500 kcal não são aceitas aqui. Não sugerimos ingestão muito baixa.");
    }
    if (calories > 6000 || protein < 20 || protein > 400 || carbohydrates < 0 || carbohydrates > 900) {
      throw new Error("Revise os números da meta.");
    }
    if (fat < 15 || fat > 300 || fiber < 0 || fiber > 120 || waterMl < 500 || waterMl > 6000) {
      throw new Error("Revise os números da meta.");
    }
    return { calories, protein, carbohydrates, fat, fiber, waterMl };
  })
  .handler(async ({ data, context }): Promise<Result<{ saved: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      if (await isMinorUser(sql, uid)) {
        return {
          ok: false,
          error: "Para menores de 18 anos não definimos meta calórica. O acompanhamento fica no registro, na água e nos hábitos.",
        };
      }
      await sql.transaction(async (tx) => {
        await tx`
          insert into goals (
            user_id, calories, protein, carbohydrates, fat, fiber, water_ml, is_estimate, source, qualitative, updated_at
          ) values (
            ${uid}, ${Math.round(data.calories)}, ${data.protein}, ${data.carbohydrates}, ${data.fat},
            ${data.fiber}, ${Math.round(data.waterMl)}, false, ${"USER_DEFINED"}, false, now()
          )
          on conflict (user_id) do update set
            calories = excluded.calories, protein = excluded.protein, carbohydrates = excluded.carbohydrates,
            fat = excluded.fat, fiber = excluded.fiber, water_ml = excluded.water_ml,
            is_estimate = false, source = 'USER_DEFINED', qualitative = false, updated_at = now()
        `;
        await trackEvent(tx, uid, "goal_changed");
      });
      return { ok: true as const, data: { saved: true as const } };
    });
  });

type SaveMealInput = {
  id: string;
  day: string;
  mealType: MealType;
  eatenAt: string;
  source: string;
  note: string;
  uncertainties: string[];
  insight: string;
  foods: FoodDraft[];
  barcodes: Record<string, string>;
};

function parseMeal(input: unknown): SaveMealInput {
  const body = (input ?? {}) as Record<string, unknown>;
  const id = String(body.id ?? "");
  if (!/^[0-9a-f-]{16,40}$/i.test(id)) throw new Error("Registro inválido.");
  const mealType = MEAL_TYPES.some((m) => m.id === body.mealType) ? (body.mealType as MealType) : "snack";
  const source = ["photo", "text", "voice", "manual", "barcode", "search"].includes(String(body.source))
    ? String(body.source)
    : "manual";
  const eatenAt = String(body.eatenAt ?? "");
  if (Number.isNaN(Date.parse(eatenAt))) throw new Error("Horário inválido.");
  const uncertainties = Array.isArray(body.uncertainties)
    ? body.uncertainties.map((item) => String(item).slice(0, 180)).slice(0, 6)
    : [];
  const parsedFoods = parseFoods(body.foods);
  return {
    id,
    day: dayOf(body.day),
    mealType,
    eatenAt: new Date(eatenAt).toISOString(),
    source,
    note: String(body.note ?? "").slice(0, 280),
    uncertainties,
    insight: String(body.insight ?? "").slice(0, 320),
    foods: parsedFoods.foods,
    barcodes: parsedFoods.barcodes,
  };
}

async function loadCachedOff(sql: Sql, code: string): Promise<OffNormalized | null> {
  const cached = await sql<{ payload: string }>`select payload from barcode_cache where code = ${code} limit 1`;
  if (!cached[0]) return null;
  try {
    const parsed = normalizeOffProduct(JSON.parse(cached[0].payload));
    return "error" in parsed ? null : parsed;
  } catch {
    return null;
  }
}

async function authorizeIncoming(sql: Sql, userId: string, foods: FoodDraft[], barcodes: Record<string, string>): Promise<FoodDraft[]> {
  const authorized: FoodDraft[] = [];
  for (const food of foods) {
    const off = barcodes[food.id] ? await loadCachedOff(sql, barcodes[food.id]!) : null;
    const rows = await sql<Record<string, unknown>>`select * from food_items where id = ${food.id} and user_id = ${userId} limit 1`;
    const stored = rows[0] ? mapFood(rows[0]) : null;
    authorized.push(authorizeRecordedFood(food, { fromClient: true, off, stored }));
  }
  return authorized;
}

export const saveMeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseMeal(input))
  .handler(async ({ data, context }): Promise<Result<{ mealId: string }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      await rejectFuture(sql, uid, data.day);
      const foods = await authorizeIncoming(sql, uid, data.foods, data.barcodes);
      const totals = sumFoods(foods);
      const uncertaintyJson = JSON.stringify(data.uncertainties);
      await sql.transaction(async (tx) => {
        const owned = await tx<{ user_id: string }>`select user_id from meals where id = ${data.id}`;
        if (owned[0] && owned[0].user_id !== uid) throw new Error("Esse registro não é seu.");
        if (owned[0]) {
          await tx`
            update meals set
              day = ${data.day}, meal_type = ${data.mealType}, eaten_at = ${data.eatenAt}, source = ${data.source},
              note = ${data.note}, uncertainties = ${uncertaintyJson}, insight = ${data.insight},
              calories = ${totals.calories}, protein = ${totals.protein}, carbohydrates = ${totals.carbohydrates},
              fat = ${totals.fat}, fiber = ${totals.fiber}, incomplete = ${totals.incomplete}, updated_at = now()
            where id = ${data.id} and user_id = ${uid}
          `;
          await trackEvent(tx, uid, "meal_edited");
        } else {
          await tx`
            insert into meals (
              id, user_id, day, meal_type, eaten_at, source, note, uncertainties, insight,
              calories, protein, carbohydrates, fat, fiber, incomplete
            ) values (
              ${data.id}, ${uid}, ${data.day}, ${data.mealType}, ${data.eatenAt}, ${data.source}, ${data.note},
              ${uncertaintyJson}, ${data.insight}, ${totals.calories}, ${totals.protein}, ${totals.carbohydrates},
              ${totals.fat}, ${totals.fiber}, ${totals.incomplete}
            )
          `;
          await trackEvent(tx, uid, "meal_created");
          if (data.source === "voice") await trackEvent(tx, uid, "voice_meal_created");
          if (data.source === "barcode") await trackEvent(tx, uid, "barcode_used");
        }
        await writeFoods(tx, uid, data.id, foods);
      });
      return { ok: true as const, data: { mealId: data.id } };
    });
  });

export const deleteMeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => parseEntityId(id))
  .handler(async ({ data, context }): Promise<Result<{ deleted: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await sql.transaction(async (tx) => {
        const owned = await findOwnedMeal(tx, context.userId, data);
        if (!owned) return;
        await tx`delete from food_items where meal_id = ${data} and user_id = ${context.userId}`;
        await tx`delete from meals where id = ${data} and user_id = ${context.userId}`;
        await trackEvent(tx, context.userId, "meal_deleted");
      });
      return { ok: true as const, data: { deleted: true as const } };
    });
  });

export const duplicateMeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; day?: string }) => ({ id: parseEntityId(input?.id), day: dayOf(input?.day) }))
  .handler(async ({ data, context }): Promise<Result<{ mealId: string }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      await rejectFuture(sql, uid, data.day);
      const meals = await loadMeals(
        sql,
        uid,
        (
          await sql<{ day: string }>`select day from meals where id = ${data.id} and user_id = ${uid}`
        )[0]?.day ?? data.day,
      );
      const source = meals.find((meal) => meal.id === data.id);
      if (!source) return { ok: false, error: "Refeição não encontrada." };
      const id = crypto.randomUUID();
      const foods = source.foods.map((food) => authorizeRecordedFood({ ...food, id: crypto.randomUUID() }, { fromClient: false }));
      const totals = sumFoods(foods);
      await sql.transaction(async (tx) => {
        await tx`
          insert into meals (
            id, user_id, day, meal_type, eaten_at, source, note, uncertainties, insight,
            calories, protein, carbohydrates, fat, fiber, incomplete
          ) values (
            ${id}, ${uid}, ${data.day}, ${source.mealType}, ${new Date().toISOString()}, ${source.source},
            ${source.note}, ${JSON.stringify(source.uncertainties)}, ${source.insight},
            ${totals.calories}, ${totals.protein}, ${totals.carbohydrates}, ${totals.fat}, ${totals.fiber},
            ${totals.incomplete}
          )
        `;
        await writeFoods(tx, uid, id, foods);
      });
      return { ok: true as const, data: { mealId: id } };
    });
  });

export const repeatFood = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const body = (input ?? {}) as Record<string, unknown>;
    const quantity = Number(body.quantity);
    const unit = String(body.unit ?? "g");
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) throw new Error("Quantidade inválida.");
    if (!UNITS.includes(unit as (typeof UNITS)[number])) throw new Error("Unidade inválida.");
    const mealType = MEAL_TYPES.some((meal) => meal.id === body.mealType) ? (body.mealType as MealType) : "snack";
    return { foodId: parseEntityId(body.foodId), day: dayOf(body.day), quantity, unit, mealType };
  })
  .handler(async ({ data, context }): Promise<Result<{ mealId: string }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      await rejectFuture(sql, uid, data.day);
      const rows = await sql<Record<string, unknown>>`
        select * from food_items where id = ${data.foodId} and user_id = ${uid} limit 1
      `;
      const source = rows[0] ? mapFood(rows[0]) : null;
      if (!source) return { ok: false, error: "Alimento não encontrado." };
      const food = authorizeRecordedFood(rescaleRecordedFood({ ...source, id: crypto.randomUUID() }, data.quantity, data.unit), { fromClient: false });
      const mealId = crypto.randomUUID();
      const totals = sumFoods([food]);
      await sql.transaction(async (tx) => {
        await tx`
          insert into meals (
            id, user_id, day, meal_type, eaten_at, source, note, uncertainties, insight,
            calories, protein, carbohydrates, fat, fiber, incomplete
          ) values (
            ${mealId}, ${uid}, ${data.day}, ${data.mealType}, ${new Date().toISOString()}, ${"manual"},
            ${""}, ${"[]"}, ${""},
            ${totals.calories}, ${totals.protein}, ${totals.carbohydrates}, ${totals.fat}, ${totals.fiber},
            ${totals.incomplete}
          )
        `;
        await writeFoods(tx, uid, mealId, [food]);
      });
      return { ok: true as const, data: { mealId } };
    });
  });

function hintFrom(input: Record<string, unknown>): string {
  return String(input.hint ?? "").slice(0, 500);
}

async function guardedAi<T>(
  userId: string,
  kind: "image" | "text" | "chat",
  action: "analyzePhoto" | "analyzeText" | "sendChat" | "askInsight" | "weeklyCoach" | "askCoach",
  operation: string,
  run: (minor: boolean) => Promise<{ value: T; usage: TokenUsage }>,
): Promise<Result<T>> {
  const requestId = newRequestId();
  const started = Date.now();
  const sql = await getSql();
  const limited = await hitRateLimit(sql, userId, action);
  if (!limited.ok) {
    logEvent("rate_limit_rejected", {
      category: "RATE_LIMIT",
      requestId,
      userId,
      operation,
      success: false,
      durationMs: Date.now() - started,
    });
    return limited;
  }
  const day = await quotaDay(sql, userId);
  const reserved = await reserveQuota(sql, userId, day, kind);
  if (!reserved.ok) {
    logEvent("quota_rejected", {
      category: "QUOTA",
      requestId,
      userId,
      operation,
      success: false,
      durationMs: Date.now() - started,
    });
    return reserved;
  }
  const minor = await isMinorUser(sql, userId);
  try {
    const result = await run(minor);
    await recordAiCall(sql, {
      userId,
      operation,
      provider: result.usage.provider,
      model: result.usage.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      success: true,
      durationMs: Date.now() - started,
      requestId,
    });
    logEvent("ai_analysis_completed", {
      category: "AI",
      requestId,
      userId,
      provider: result.usage.provider,
      model: result.usage.model,
      durationMs: Date.now() - started,
      success: true,
      operation,
    });
    return { ok: true, data: result.value };
  } catch (error) {
    await releaseQuota(sql, userId, day, kind);
    const { aiErrorMessage, classifyAiFailure } = await import("./ai.server");
    await recordAiCall(sql, {
      userId,
      operation,
      provider: null,
      model: null,
      inputTokens: null,
      outputTokens: null,
      success: false,
      durationMs: Date.now() - started,
      requestId,
      errorType: classifyAiFailure(error),
    }).catch(() => undefined);
    logEvent("ai_analysis_failed", {
      category: "AI",
      requestId,
      userId,
      operation,
      durationMs: Date.now() - started,
      success: false,
      errorType: classifyAiFailure(error),
    });
    return { ok: false, error: aiErrorMessage(error) };
  }
}

export const analyzePhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const body = (input ?? {}) as Record<string, unknown>;
    return { image: parseImageBase64(body.imageBase64), hint: hintFrom(body), hour: Number(body.hour) || 12, day: dayOf(body.day) };
  })
  .handler(async ({ data, context }): Promise<Result<{ analysis: import("./domain").Analysis }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await trackEvent(sql, context.userId, "photo_started");
      const result = await guardedAi(context.userId, "image", "analyzePhoto", "analyzePhoto", async (minor) => {
        const { getAIProvider } = await import("./ai.server");
        const call = await getAIProvider().analyzeMealImage(data.image, data.hint, data.hour, { minor });
        return { value: enrichAnalysis(call.value), usage: call.usage };
      });
      if (result.ok) await trackEvent(sql, context.userId, "photo_completed");
      else await trackEvent(sql, context.userId, "photo_failed");
      if (!result.ok) return result;
      return { ok: true as const, data: { analysis: result.data } };
    });
  });

export const analyzeText = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const body = (input ?? {}) as Record<string, unknown>;
    const text = String(body.text ?? "").trim();
    if (text.length < 2 || text.length > 800) throw new Error("Descreva a refeição em uma frase.");
    const source = body.source === "voice" ? "voice" : "text";
    return { text, source, hint: hintFrom(body), hour: Number(body.hour) || 12, day: dayOf(body.day) };
  })
  .handler(async ({ data, context }): Promise<Result<{ analysis: import("./domain").Analysis }>> => {
    return quiet(async () => {
      const result = await guardedAi(context.userId, "text", "analyzeText", "analyzeText", async (minor) => {
        const { getAIProvider } = await import("./ai.server");
        const provider = getAIProvider();
        const call =
          data.source === "voice"
            ? await provider.analyzeMealVoice(data.text, data.hint, data.hour, { minor })
            : await provider.analyzeMealText(data.text, data.hint, data.hour, { minor });
        return { value: enrichAnalysis(call.value), usage: call.usage };
      });
      if (!result.ok) return result;
      return { ok: true as const, data: { analysis: result.data } };
    });
  });

export const addWater = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day?: string; amountMl?: number }) => {
    const amount = Number(input?.amountMl);
    if (!Number.isInteger(amount) || amount < 50 || amount > 2000) throw new Error("Quantidade de água inválida.");
    return { day: dayOf(input?.day), amountMl: amount };
  })
  .handler(async ({ data, context }): Promise<Result<{ waterMl: number }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await rejectFuture(sql, context.userId, data.day);
      await sql`
        insert into water_logs (id, user_id, day, amount_ml) values (${crypto.randomUUID()}, ${context.userId}, ${data.day}, ${data.amountMl})
      `;
      const rows = await sql<{ total: number }>`
        select coalesce(sum(amount_ml), 0)::float as total from water_logs where user_id = ${context.userId} and day = ${data.day}
      `;
      return { ok: true as const, data: { waterMl: Math.round(Number(rows[0]?.total ?? 0)) } };
    });
  });

export const saveWeight = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day?: string; weightKg?: number }) => {
    const weight = Number(input?.weightKg);
    if (!Number.isFinite(weight) || weight < 30 || weight > 300) throw new Error("Informe um peso entre 30 e 300 kg.");
    return { day: dayOf(input?.day), weightKg: Math.round(weight * 10) / 10 };
  })
  .handler(async ({ data, context }): Promise<Result<{ saved: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await rejectFuture(sql, context.userId, data.day);
      await sql.transaction(async (tx) => {
        const existing = await tx<{ id: string }>`
          select id from weight_logs where user_id = ${context.userId} and day = ${data.day} limit 1
        `;
        if (existing[0]) {
          await tx`
            update weight_logs set weight_kg = ${data.weightKg}, updated_at = now()
            where id = ${existing[0].id} and user_id = ${context.userId}
          `;
        } else {
          await tx`
            insert into weight_logs (id, user_id, day, weight_kg) values (${crypto.randomUUID()}, ${context.userId}, ${data.day}, ${data.weightKg})
          `;
        }
        await tx`update profiles set weight_kg = ${data.weightKg}, updated_at = now() where user_id = ${context.userId}`;
      });
      return { ok: true as const, data: { saved: true as const } };
    });
  });

export const getProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { endDay?: string; span?: number }) => {
    const span = Number(input?.span);
    if (![1, 7, 30, 90].includes(span)) throw new Error("Período inválido.");
    return { endDay: dayOf(input?.endDay), span };
  })
  .handler(async ({ data, context }) => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      const start = shiftDayKey(data.endDay, -(data.span - 1));
      const meals = await sql<{ day: string; calories: number; protein: number; fiber: number; carbohydrates: number; fat: number }>`
        select day,
          coalesce(sum(calories), 0)::float as calories,
          coalesce(sum(protein), 0)::float as protein,
          coalesce(sum(fiber), 0)::float as fiber,
          coalesce(sum(carbohydrates), 0)::float as carbohydrates,
          coalesce(sum(fat), 0)::float as fat,
          count(*)::float as meals
        from meals
        where user_id = ${uid} and day >= ${start} and day <= ${data.endDay}
        group by day
      `;
      const water = await sql<{ day: string; ml: number }>`
        select day, sum(amount_ml)::float as ml from water_logs
        where user_id = ${uid} and day >= ${start} and day <= ${data.endDay}
        group by day
      `;
      const weights = await sql<{ day: string; weight_kg: number }>`
        select day, weight_kg from weight_logs
        where user_id = ${uid} and day >= ${start} and day <= ${data.endDay}
        order by day asc
      `;
      const checks = await sql<{ day: string; done: unknown }>`
        select day, done from habit_checks where user_id = ${uid} and day >= ${start} and day <= ${data.endDay}
      `;
      const goalRows = await sql<GoalRow>`select * from goals where user_id = ${uid}`;
      const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
      const profiles = await sql<{ age: number | null }>`select age from profiles where user_id = ${uid}`;
      const age = Number(profiles[0]?.age);
      const longitudinal = summarizeWindow({
        span: data.span,
        mealsByDay: meals.map((row) => ({
          day: String(row.day),
          meals: Number((row as { meals?: number }).meals ?? 1),
          calories: Number(row.calories),
          protein: Number(row.protein),
          carbohydrates: Number(row.carbohydrates),
          fat: Number(row.fat),
          fiber: Number(row.fiber),
        })),
        waterByDay: water.map((row) => ({ day: row.day, ml: Number(row.ml) })),
        weights: weights.map((row) => ({ day: row.day, kg: Number(row.weight_kg) })),
        habitChecks: checks.map((row) => ({ day: String(row.day), done: asBool(row.done) })),
        goals: goals ? { protein: goals.protein, fiber: goals.fiber, waterMl: goals.waterMl } : null,
        qualitative: Boolean(goals?.qualitative || (Number.isFinite(age) && age < 18)),
      });
      await trackEvent(sql, uid, "progress_viewed");
      if (data.span >= 7) await trackEvent(sql, uid, "weekly_summary_viewed");
      return {
        ok: true as const,
        data: {
          start,
          meals: meals.map((m) => ({
            day: m.day,
            calories: Number(m.calories),
            protein: Number(m.protein),
            fiber: Number(m.fiber),
          })),
          water: water.map((w) => ({ day: w.day, ml: Math.round(Number(w.ml)) })),
          weights: weights.map((w) => ({ day: w.day, kg: Number(w.weight_kg) })),
          longitudinal,
        },
      };
    });
  });

export const saveHabits = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const body = (input ?? {}) as Record<string, unknown>;
    return {
      water: body.water === true,
      produce: body.produce === true,
      meals: body.meals === true,
      activity: body.activity === true,
      sleep: body.sleep === true,
    };
  })
  .handler(async ({ data, context }): Promise<Result<{ saved: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await sql`
        insert into habits (user_id, water, produce, meals, activity, sleep, updated_at)
        values (${context.userId}, ${data.water}, ${data.produce}, ${data.meals}, ${data.activity}, ${data.sleep}, now())
        on conflict (user_id) do update set
          water = excluded.water, produce = excluded.produce, meals = excluded.meals,
          activity = excluded.activity, sleep = excluded.sleep, updated_at = now()
      `;
      return { ok: true as const, data: { saved: true as const } };
    });
  });

export const toggleCheck = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day?: string; habit?: string; done?: boolean }) => {
    const habit = String(input?.habit ?? "");
    if (!["produce", "activity", "sleep"].includes(habit) && !/^[0-9a-f-]{16,40}$/i.test(habit)) {
      throw new Error("Hábito inválido.");
    }
    return { day: dayOf(input?.day), habit, done: input?.done === true };
  })
  .handler(async ({ data, context }): Promise<Result<{ saved: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await rejectFuture(sql, context.userId, data.day);
      if (!["produce", "activity", "sleep"].includes(data.habit)) {
        const owned = await sql<{ id: string }>`
          select id from micro_habits where id = ${data.habit} and user_id = ${context.userId} and active = true
        `;
        if (!owned[0]) return { ok: false, error: "Hábito inválido." };
      }
      await sql`
        insert into habit_checks (id, user_id, day, habit, done)
        values (${crypto.randomUUID()}, ${context.userId}, ${data.day}, ${data.habit}, ${data.done})
        on conflict (user_id, day, habit) do update set done = ${data.done}
      `;
      if (data.done) await trackEvent(sql, context.userId, "habit_completed");
      return { ok: true as const, data: { saved: true as const } };
    });
  });

export const setNotifications = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((enabled: unknown) => parseNotificationEnabled(enabled))
  .handler(async ({ data, context }): Promise<Result<{ enabled: boolean }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await sql`
        insert into notification_prefs (user_id, enabled, updated_at)
        values (${context.userId}, ${data}, now())
        on conflict (user_id) do update set enabled = ${data}, updated_at = now()
      `;
      return { ok: true as const, data: { enabled: data } };
    });
  });

async function diaryContext(sql: Sql, userId: string, day: string): Promise<string> {
  const profiles = await sql<ProfileRow>`select * from profiles where user_id = ${userId}`;
  const profile = profiles[0] ? mapProfile(profiles[0]) : null;
  const goalRows = await sql<GoalRow>`select * from goals where user_id = ${userId}`;
  const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
  const meals = await loadMeals(sql, userId, day);
  const memory = await sql<{ fact: string }>`select fact from ai_memory where user_id = ${userId} order by created_at desc limit 20`;
  const totals = meals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories;
      acc.protein += meal.protein;
      return acc;
    },
    { calories: 0, protein: 0 },
  );
  const mealLines = meals.map((meal) => `${mealLabel(meal.mealType)}: ${meal.foods.map((f) => f.name).join(", ")} (${Math.round(meal.calories)} kcal, estimativa)`);
  return [
    profile ? `Nome: ${profile.name}. Objetivo: ${profile.goal}. Dieta: ${profile.diet}. Restrições informadas: ${profile.restrictions || "nenhuma"}.` : "Sem perfil.",
    goals ? `Metas estimadas ou editadas: ${goals.calories} kcal, ${goals.protein} g proteína, ${goals.carbohydrates} g carboidrato, ${goals.fat} g gordura, ${goals.fiber} g fibra, ${goals.waterMl} ml água.` : "Sem metas.",
    `Registrado hoje: ${Math.round(totals.calories)} kcal e ${Math.round(totals.protein)} g de proteína.`,
    mealLines.length ? mealLines.join("\n") : "Nenhuma refeição registrada hoje.",
    memory.length ? `Memória confirmada pelo usuário:\n- ${memory.map((m) => m.fact).join("\n- ")}` : "Nenhuma memória salva.",
  ].join("\n");
}

export const sendChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { message?: string; day?: string }) => {
    const message = String(input?.message ?? "").trim();
    if (message.length < 1 || message.length > 1500) throw new Error("Escreva uma mensagem curta.");
    return { message, day: dayOf(input?.day) };
  })
  .handler(async ({ data, context }): Promise<Result<{ reply: string }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      await sql`insert into ai_messages (id, user_id, role, content) values (${crypto.randomUUID()}, ${uid}, ${"user"}, ${data.message})`;
      const blocked = safetyReply(data.message);
      const remembered = memoryCommand(data.message);
      let reply = blocked;
      if (!reply && remembered) {
        const count = await sql<{ n: number }>`select count(*)::float as n from ai_memory where user_id = ${uid}`;
        if (Number(count[0]?.n ?? 0) >= 30) {
          reply = "Sua memória já está cheia. Apague algum item em Perfil para guardar outro.";
        } else {
          await sql`insert into ai_memory (id, user_id, fact) values (${crypto.randomUUID()}, ${uid}, ${remembered})`;
          reply = "Guardei isso. Você pode ler ou apagar em Perfil, na memória. Eu só uso o que você confirmar.";
        }
      }
      if (!reply && asksMemory(data.message)) {
        const memory = await sql<{ fact: string }>`select fact from ai_memory where user_id = ${uid} order by created_at desc limit 30`;
        reply = memory.length
          ? `Isto é o que você pediu para eu guardar:\n${memory.map((m) => `• ${m.fact}`).join("\n")}\nSe algo estiver errado, apague em Perfil.`
          : "Ainda não guardei preferências. Você pode dizer “lembre que…” ou escrever em Perfil.";
      }
      if (!reply) {
        const history = await sql<{ role: string; content: string }>`
          select role, content from ai_messages where user_id = ${uid} order by created_at desc limit 10
        `;
        const ordered = history.reverse().filter((m) => m.role === "user" || m.role === "assistant") as {
          role: "user" | "assistant";
          content: string;
        }[];
        await trackEvent(sql, uid, "chat_started");
        const result = await guardedAi(uid, "chat", "sendChat", "sendChat", async (minor) => {
          const { getAIProvider } = await import("./ai.server");
          const call = await getAIProvider().chat(ordered, await diaryContext(sql, uid, data.day), { minor });
          return { value: call.value, usage: call.usage };
        });
        reply = result.ok ? result.data : result.error;
        if (result.ok) await trackEvent(sql, uid, "chat_completed");
      }
      await sql`insert into ai_messages (id, user_id, role, content) values (${crypto.randomUUID()}, ${uid}, ${"assistant"}, ${reply})`;
      return { ok: true as const, data: { reply: reply! } };
    });
  });

export const listChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { before?: string } | undefined) => {
    const before = input && typeof input === "object" ? String(input.before ?? "") : "";
    if (before && Number.isNaN(Date.parse(before))) throw new Error("Página inválida.");
    return { before };
  })
  .handler(async ({ data, context }): Promise<Result<{ messages: { id: string; role: string; content: string; createdAt: string }[] }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const rows = data.before
        ? await sql<{ id: string; role: string; content: string; created_at: unknown }>`
            select id, role, content, created_at from ai_messages
            where user_id = ${context.userId} and created_at < ${data.before}
            order by created_at desc limit 40
          `
        : await sql<{ id: string; role: string; content: string; created_at: unknown }>`
            select id, role, content, created_at from ai_messages
            where user_id = ${context.userId}
            order by created_at desc limit 40
          `;
      return {
        ok: true as const,
        data: {
          messages: rows.reverse().map((row) => ({
            id: row.id,
            role: row.role,
            content: row.content,
            createdAt: iso(row.created_at),
          })),
        },
      };
    });
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => parseEntityId(id))
  .handler(async ({ data, context }): Promise<Result<{ deleted: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await sql`delete from ai_memory where id = ${data} and user_id = ${context.userId}`;
      return { ok: true as const, data: { deleted: true as const } };
    });
  });

export const addMemory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((fact: string) => {
    const text = String(fact ?? "").trim();
    if (text.length < 3 || text.length > 240) throw new Error("Escreva um fato curto.");
    return text;
  })
  .handler(async ({ data, context }): Promise<Result<{ id: string }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const count = await sql<{ n: number }>`select count(*)::float as n from ai_memory where user_id = ${context.userId}`;
      if (Number(count[0]?.n ?? 0) >= 30) return { ok: false, error: "A memória está cheia. Apague um item antes." };
      const id = crypto.randomUUID();
      await sql`insert into ai_memory (id, user_id, fact) values (${id}, ${context.userId}, ${data})`;
      return { ok: true as const, data: { id } };
    });
  });

export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: string) => parseBarcode(code))
  .handler(async ({ data, context }): Promise<Result<{
    name: string;
    quantity: number;
    unit: string;
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fat: number | null;
    fiber: number | null;
    note: string;
    completeness: "complete" | "partial" | "unavailable";
    nutritionSource: "OPEN_FOOD_FACTS" | "TACO";
  }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const limited = await hitRateLimit(sql, context.userId, "lookupBarcode");
      if (!limited.ok) return limited;
      const cached = await sql<{ payload: string; fetched_at: unknown }>`
        select payload, fetched_at from barcode_cache where code = ${data}
      `;
      const fresh = cached[0] && Date.now() - Date.parse(iso(cached[0].fetched_at)) < 7 * 24 * 60 * 60 * 1000;
      let normalized: ReturnType<typeof normalizeOffProduct> | null = null;
      if (fresh && cached[0]) {
        try {
          normalized = normalizeOffProduct(JSON.parse(cached[0].payload));
        } catch {
          normalized = null;
        }
      }
      if (!normalized || "error" in normalized) {
        let res: Response | null = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(data)}.json`, {
              headers: { "User-Agent": "CaluAI/1.0 (meal diary; contact via app)" },
              signal: AbortSignal.timeout(8000),
            });
            if (res.status >= 500 && attempt === 0) continue;
            break;
          } catch {
            if (attempt === 1) return { ok: false, error: "Não consegui consultar o código agora. Tente de novo." };
          }
        }
        if (!res) return { ok: false, error: "Não consegui consultar o código agora. Tente de novo." };
        if (res.status === 404) return { ok: false, error: "Produto não encontrado." };
        if (!res.ok) return { ok: false, error: "Não consegui consultar o código agora. Tente de novo." };
        const body = await res.json().catch(() => null);
        const parsed = normalizeOffProduct(body);
        if ("error" in parsed) return { ok: false, error: parsed.error };
        normalized = parsed;
        const compact = {
          status: 1,
          product: {
            product_name: parsed.name,
            serving_quantity: parsed.quantity,
            nutriments: {
              "energy-kcal_100g": parsed.per100?.calories,
              proteins_100g: parsed.per100?.protein,
              carbohydrates_100g: parsed.per100?.carbohydrates,
              fat_100g: parsed.per100?.fat,
              fiber_100g: parsed.per100?.fiber,
              "energy-kcal_serving": parsed.perServing?.calories,
              proteins_serving: parsed.perServing?.protein,
              carbohydrates_serving: parsed.perServing?.carbohydrates,
              fat_serving: parsed.perServing?.fat,
              fiber_serving: parsed.perServing?.fiber,
            },
          },
        };
        await sql`
          insert into barcode_cache (code, payload, fetched_at)
          values (${data}, ${JSON.stringify(compact)}, now())
          on conflict (code) do update set payload = excluded.payload, fetched_at = now()
        `;
      }
      if ("error" in normalized) return { ok: false, error: String(normalized.error) };
      const resolved = resolveFoodName(normalized.name);
      const choice = preferStructuredSource({ taco: resolved, offPer100: normalized.per100 });
      let calories = normalized.calories == null ? null : Math.round(normalized.calories);
      let protein = normalized.protein;
      let carbohydrates = normalized.carbohydrates;
      let fat = normalized.fat;
      let fiber = normalized.fiber;
      let note = normalized.note;
      let nutritionSource: "OPEN_FOOD_FACTS" | "TACO" = "OPEN_FOOD_FACTS";
      if (choice.keptTaco && choice.per100) {
        const scaled = calculateNutrition(choice.per100, normalized.quantity);
        calories = scaled.calories;
        protein = scaled.protein;
        carbohydrates = scaled.carbohydrates;
        fat = scaled.fat;
        fiber = scaled.fiber;
        nutritionSource = "TACO";
        note = "Mantida a referência TACO. Open Food Facts não substituiu este item.";
      }
      await trackEvent(sql, context.userId, "barcode_used");
      return {
        ok: true as const,
        data: {
          name: normalized.name,
          quantity: normalized.quantity,
          unit: normalized.unit,
          calories,
          protein,
          carbohydrates,
          fat,
          fiber,
          note,
          completeness: normalized.completeness,
          nutritionSource,
        },
      };
    });
  });

export const exportData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      const profile = await sql`select name, age, sex, height_cm, weight_kg, goal, activity, diet, diet_note, restrictions, plan, created_at from profiles where user_id = ${uid}`;
      const goals = await sql`select calories, protein, carbohydrates, fat, fiber, water_ml, is_estimate from goals where user_id = ${uid}`;
      const meals = await sql`select id, day, meal_type, eaten_at, source, note, calories, protein, carbohydrates, fat, fiber from meals where user_id = ${uid} order by eaten_at desc limit 2000`;
      const foods = await sql`select meal_id, name, quantity, unit, calories, protein, carbohydrates, fat, fiber, source, data_status, nutrition_source from food_items where user_id = ${uid} limit 8000`;
      const water = await sql`select day, amount_ml, created_at from water_logs where user_id = ${uid} order by created_at desc limit 4000`;
      const weight = await sql`select day, weight_kg from weight_logs where user_id = ${uid} order by day desc limit 2000`;
      const memory = await sql`select fact, created_at from ai_memory where user_id = ${uid}`;
      return {
        ok: true as const,
        data: {
          exportedAt: new Date().toISOString(),
          profile: profile.map(plainRow),
          goals: goals.map(plainRow),
          meals: meals.map(plainRow),
          foods: foods.map(plainRow),
          water: water.map(plainRow),
          weight: weight.map(plainRow),
          memory: memory.map(plainRow),
        },
      };
    });
  });

export const deleteHistory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }): Promise<Result<{ deleted: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      await sql.transaction(async (tx) => {
        await tx`delete from food_items where user_id = ${uid}`;
        await tx`delete from meals where user_id = ${uid}`;
        await tx`delete from water_logs where user_id = ${uid}`;
        await tx`delete from weight_logs where user_id = ${uid}`;
        await tx`delete from habit_checks where user_id = ${uid}`;
      });
      return { ok: true as const, data: { deleted: true as const } };
    });
  });

export const deleteAccountData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }): Promise<Result<{ deleted: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      await sql.transaction(async (tx) => {
        await wipeUserData(tx, uid);
      });
      return { ok: true as const, data: { deleted: true as const } };
    });
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }): Promise<Result<{ deleted: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      await sql.transaction(async (tx) => {
        await wipeUserData(tx, uid);
        await wipeAuthIdentity(tx, uid);
      });
      return { ok: true as const, data: { deleted: true as const } };
    });
  });

export const acceptMicroHabit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((label: string) => {
    const text = String(label ?? "").trim();
    if (text.length < 3 || text.length > 120) throw new Error("Descreva um hábito curto.");
    return text;
  })
  .handler(async ({ data, context }): Promise<Result<{ id: string }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const count = await sql<{ n: number }>`select count(*)::float as n from micro_habits where user_id = ${context.userId} and active = true`;
      if (Number(count[0]?.n ?? 0) >= 8) return { ok: false, error: "Você já tem micro-hábitos suficientes. Desligue algum antes." };
      const id = crypto.randomUUID();
      await sql`insert into micro_habits (id, user_id, label, active) values (${id}, ${context.userId}, ${data}, true)`;
      await trackEvent(sql, context.userId, "habit_created");
      return { ok: true as const, data: { id } };
    });
  });

export const generateWeeklyCoach = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day?: string }) => ({ day: dayOf(input?.day) }))
  .handler(async ({ data, context }): Promise<Result<{ observed: string; attention: string; opportunity: string; habit: string; source: "ai" | "records" }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      const start = shiftDayKey(data.day, -6);
      const meals = await sql<DayAgg>`
        select day, count(*)::float as meals,
          coalesce(sum(calories), 0)::float as calories,
          coalesce(sum(protein), 0)::float as protein,
          coalesce(sum(carbohydrates), 0)::float as carbohydrates,
          coalesce(sum(fat), 0)::float as fat,
          coalesce(sum(fiber), 0)::float as fiber
        from meals where user_id = ${uid} and day >= ${start} and day <= ${data.day}
        group by day
      `;
      const water = await sql<{ day: string; ml: number }>`
        select day, coalesce(sum(amount_ml), 0)::float as ml from water_logs
        where user_id = ${uid} and day >= ${start} and day <= ${data.day} group by day
      `;
      const weights = await sql<{ day: string; kg: number }>`
        select day, weight_kg as kg from weight_logs where user_id = ${uid} and day >= ${start} and day <= ${data.day}
      `;
      const checks = await sql<{ day: string; done: unknown }>`
        select day, done from habit_checks where user_id = ${uid} and day >= ${start} and day <= ${data.day}
      `;
      const goalRows = await sql<GoalRow>`select * from goals where user_id = ${uid}`;
      const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
      const minor = await isMinorUser(sql, uid);
      const summary = summarizeWindow({
        span: 7,
        mealsByDay: meals.map((row) => ({
          day: String(row.day),
          meals: Number(row.meals),
          calories: Number(row.calories),
          protein: Number(row.protein),
          carbohydrates: Number(row.carbohydrates),
          fat: Number(row.fat),
          fiber: Number(row.fiber),
        })),
        waterByDay: water.map((row) => ({ day: row.day, ml: Number(row.ml) })),
        weights: weights.map((row) => ({ day: row.day, kg: Number(row.kg) })),
        habitChecks: checks.map((row) => ({ day: String(row.day), done: asBool(row.done) })),
        goals: goals ? { protein: goals.protein, fiber: goals.fiber, waterMl: goals.waterMl } : null,
        qualitative: minor || Boolean(goals?.qualitative),
      });
      if (summary.recordedDays < 2) {
        const fallback = fallbackCoach(summary);
        return { ok: true as const, data: { ...fallback, source: "records" as const } };
      }
      const contextText = [
        summary.consistency,
        summary.sampleNote,
        ...summary.patterns,
        summary.avgProtein != null ? `Proteína média nos dias registrados: ${summary.avgProtein} g.` : "",
        summary.avgFiber != null ? `Fibra média: ${summary.avgFiber} g.` : "",
        summary.avgWater != null ? `Água média: ${summary.avgWater} ml.` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const result = await guardedAi(uid, "text", "weeklyCoach", "weeklyCoach", async (isMinor) => {
        const { getAIProvider } = await import("./ai.server");
        const call = await getAIProvider().generateWeeklyCoach(contextText, { minor: isMinor });
        return { value: call.value, usage: call.usage };
      });
      const parsed = result.ok ? parseCoach(extractJson(result.data)) : null;
      if (!result.ok && /limite|Muitas tentativas/i.test(result.error)) return result;
      const coach = parsed ?? fallbackCoach(summary);
      return { ok: true as const, data: { ...coach, source: parsed ? ("ai" as const) : ("records" as const) } };
    });
  });

export const askInsight = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day?: string }) => ({ day: dayOf(input?.day) }))
  .handler(async ({ data, context }): Promise<Result<{ insight: string; source: "cache" | "ai" | "records" | "unavailable" }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      const profiles = await sql<ProfileRow>`select * from profiles where user_id = ${uid}`;
      const profile = profiles[0] ? mapProfile(profiles[0]) : null;
      const goalRows = await sql<GoalRow>`select * from goals where user_id = ${uid}`;
      const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
      const meals = await loadMeals(sql, uid, data.day);
      const waterRows = await sql<{ total: number }>`
        select coalesce(sum(amount_ml), 0)::float as total from water_logs where user_id = ${uid} and day = ${data.day}
      `;
      const qualitative = Boolean(goals?.qualitative || (profile?.age != null && profile.age < 18));
      const hour = hourInTimeZone(new Date(), profile?.timezone || "America/Sao_Paulo");
      const board = boardFor(data.day, hour, qualitative, meals, Math.round(Number(waterRows[0]?.total ?? 0)), goals);
      const payload = insightContext(board);
      const hash = contextHash(JSON.stringify(payload));
      const cached = await sql<{ text: string; context_hash: string }>`
        select text, context_hash from daily_insights where user_id = ${uid} and day = ${data.day}
      `;
      if (cached[0]?.context_hash === hash) {
        return { ok: true as const, data: { insight: cached[0].text, source: "cache" as const } };
      }
      const result = await guardedAi(uid, "text", "askInsight", "dailyInsight", async (minor) => {
        const { getAIProvider } = await import("./ai.server");
        const call = await getAIProvider().generateDailyInsight(JSON.stringify(payload), { minor });
        return { value: call.value, usage: call.usage };
      });
      if (!result.ok) {
        if (/limite|Muitas tentativas/i.test(result.error)) return result;
        return { ok: true as const, data: { insight: "CALU está indisponível no momento.", source: "unavailable" as const } };
      }
      const parsed = parseDailyInsight(result.data);
      if (!parsed) return { ok: true as const, data: { insight: board.note, source: "records" as const } };
      await sql`
        insert into daily_insights (user_id, day, context_hash, text)
        values (${uid}, ${data.day}, ${hash}, ${parsed})
        on conflict (user_id, day) do update set context_hash = excluded.context_hash, text = excluded.text, created_at = now()
      `;
      return { ok: true as const, data: { insight: parsed, source: "ai" as const } };
    });
  });

async function loadCoachContext(sql: Sql, uid: string, day: string): Promise<CoachContext> {
  const profiles = await sql<ProfileRow>`select * from profiles where user_id = ${uid}`;
  const profile = profiles[0] ? mapProfile(profiles[0]) : null;
  const goalRows = await sql<GoalRow>`select * from goals where user_id = ${uid}`;
  const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
  const meals = await loadMeals(sql, uid, day);
  const waterRows = await sql<{ total: number }>`
    select coalesce(sum(amount_ml), 0)::float as total from water_logs where user_id = ${uid} and day = ${day}
  `;
  const weightToday = await sql<{ kg: number }>`
    select weight_kg as kg from weight_logs where user_id = ${uid} and day = ${day} order by updated_at desc limit 1
  `;
  const checks = await sql<{ done: unknown }>`select done from habit_checks where user_id = ${uid} and day = ${day}`;
  const habitRows = await sql<Record<string, unknown>>`select * from habits where user_id = ${uid}`;
  const microHabits = await sql<{ id: string }>`select id from micro_habits where user_id = ${uid} and active = true`;
  const weekStart = shiftDayKey(day, -6);
  const weekMeals = await sql<{ day: string; meals: number; calories: number; protein: number }>`
    select day, count(*)::float as meals,
      coalesce(sum(calories), 0)::float as calories,
      coalesce(sum(protein), 0)::float as protein
    from meals
    where user_id = ${uid} and day >= ${weekStart} and day <= ${day}
    group by day
  `;
  const weekWater = await sql<{ day: string; ml: number }>`
    select day, coalesce(sum(amount_ml), 0)::float as ml from water_logs
    where user_id = ${uid} and day >= ${weekStart} and day <= ${day}
    group by day
  `;
  const weekWeights = await sql<{ day: string; kg: number }>`
    select day, weight_kg as kg from weight_logs
    where user_id = ${uid} and day >= ${weekStart} and day <= ${day}
  `;
  const zone = profile?.timezone || "America/Sao_Paulo";
  const nowHour = hourInTimeZone(new Date(), zone);
  const qualitative = Boolean(goals?.qualitative || (profile?.age != null && profile.age < 18));
  const habitFlags = habitRows[0]
    ? [habitRows[0].water, habitRows[0].produce, habitRows[0].meals, habitRows[0].activity, habitRows[0].sleep]
    : [true, false, true, false, false];
  return coachContextFrom({
    day,
    timezone: zone,
    hour: day < dayKeyInTimeZone(new Date(), zone) ? 21 : nowHour,
    qualitative,
    tracksWeight: Boolean(profile && ["controlar", "massa", "manter"].includes(profile.goal)) || weekWeights.length > 0,
    goals,
    meals,
    waterMl: Math.round(Number(waterRows[0]?.total ?? 0)),
    weightKg: weightToday[0] ? Number(weightToday[0].kg) : null,
    habitsDone: checks.filter((check) => asBool(check.done)).length,
    habitsTotal: habitFlags.filter((flag) => asBool(flag)).length + microHabits.length,
    historyDays: fillHistoryDays(
      daysInclusive(weekStart, day),
      weekMeals.map((row) => ({
        day: String(row.day),
        meals: Number(row.meals),
        calories: Number(row.calories),
        protein: Number(row.protein),
      })),
      weekWater.map((row) => ({ day: String(row.day), ml: Number(row.ml) })),
      weekWeights.map((row) => ({ day: String(row.day), kg: Number(row.kg) })),
    ),
  });
}

export const askCoach = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseCoachAsk(input))
  .handler(async ({ data, context }): Promise<Result<CoachAnswer>> => {
    return quiet(async () => {
      const started = Date.now();
      const sql = await getSql();
      const uid = scopedUserId(context.userId, data);
      const coachContext = await loadCoachContext(sql, uid, data.day);
      const qHash = coachQuestionHash(data.question);
      let cachedRow: { context_hash: string; payload: string } | undefined;
      try {
        const cached = await sql<{ context_hash: string; payload: string }>`
          select context_hash, payload from coach_cache
          where user_id = ${uid} and day = ${data.day} and question_hash = ${qHash}
        `;
        cachedRow = cached[0];
      } catch {
        cachedRow = undefined;
      }
      const first = resolveCoachAsk({
        context: coachContext,
        question: data.question,
        cached: cachedRow ? { contextHash: cachedRow.context_hash, payload: cachedRow.payload } : null,
      });
      const finish = async (answer: CoachAnswer, cache: "hit" | "miss" | "skip") => {
        logEvent("coach_resolved", {
          category: "COACH",
          userId: uid,
          operation: "dailyCoach",
          source: answer.source,
          cache,
          success: answer.source !== "fallback",
          durationMs: Date.now() - started,
        });
        return { ok: true as const, data: answer };
      };
      if (first.phase === "done") return finish(first.answer, first.answer.source === "cache" ? "hit" : "skip");
      logEvent("coach_cache_miss", {
        category: "COACH",
        userId: uid,
        operation: "dailyCoach",
        cache: "miss",
        success: true,
        durationMs: Date.now() - started,
      });
      const result = await guardedAi(uid, "text", "askCoach", "dailyCoach", async (minor) => {
        const { getAIProvider } = await import("./ai.server");
        const call = await getAIProvider().generateDailyCoach(JSON.stringify(coachContextForModel(coachContext)), data.question, { minor });
        return { value: call.value, usage: call.usage };
      });
      const second = resolveCoachAsk({
        context: coachContext,
        question: data.question,
        modelText: result.ok ? result.data : null,
        modelFailed: !result.ok,
      });
      const answer = second.phase === "done" ? second.answer : fallbackCoachAnswer(coachContext);
      if (second.phase === "done" && second.store) {
        const payload = second.store.payload;
        const hash = second.store.contextHash;
        const qHash = second.store.questionHash;
        await sql`
          insert into coach_cache (user_id, day, question_hash, context_hash, payload)
          values (${uid}, ${data.day}, ${qHash}, ${hash}, ${payload})
          on conflict (user_id, day, question_hash)
          do update set context_hash = excluded.context_hash, payload = excluded.payload, created_at = now()
        `.catch(() => undefined);
      }
      return finish(answer, "miss");
    });
  });
