import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  ACTIVITIES,
  AI_LIMITS,
  ANALYTICS_EVENTS,
  DIETS,
  GOALS,
  UNITS,
  asksMemory,
  estimateGoals,
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

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };
type Result<T> = Ok<T> | Err;

const FAIL = "Não consegui concluir isso agora. Tente de novo em instantes.";

function dayOf(value: unknown): string {
  const day = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Data inválida.");
  return day;
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
    console.error("calu_request_failed");
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
};

function mapGoals(row: GoalRow): GoalTargets & { isEstimate: boolean } {
  return {
    calories: Math.round(Number(row.calories)),
    protein: Number(row.protein),
    carbohydrates: Number(row.carbohydrates),
    fat: Number(row.fat),
    fiber: Number(row.fiber),
    waterMl: Math.round(Number(row.water_ml)),
    isEstimate: asBool(row.is_estimate),
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

function parseFoods(input: unknown): FoodDraft[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) {
    throw new Error("Inclua pelo menos um alimento.");
  }
  return input.map((item, index) => {
    const food = item as Partial<FoodDraft>;
    const name = String(food.name ?? "").trim();
    if (name.length < 1) throw new Error("Todo alimento precisa de um nome.");
    const unit = UNITS.includes(food.unit as (typeof UNITS)[number]) ? String(food.unit) : "g";
    const quantity = num(food.quantity);
    if (quantity == null || quantity <= 0 || quantity > 10000) throw new Error("Quantidade inválida.");
    const draft = makeFood({
      id: String(food.id || crypto.randomUUID()),
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
    draft.baseQuantity = num(food.baseQuantity) && num(food.baseQuantity)! > 0 ? num(food.baseQuantity)! : draft.quantity;
    draft.baseCalories = num(food.baseCalories);
    draft.baseProtein = num(food.baseProtein);
    draft.baseCarbohydrates = num(food.baseCarbohydrates);
    draft.baseFat = num(food.baseFat);
    draft.baseFiber = num(food.baseFiber);
    void index;
    return draft;
  });
}

async function writeFoods(sql: Sql, userId: string, mealId: string, foods: FoodDraft[]) {
  await sql`delete from food_items where meal_id = ${mealId} and user_id = ${userId}`;
  for (let i = 0; i < foods.length; i++) {
    const food = foods[i]!;
    await sql`
      insert into food_items (
        id, meal_id, user_id, name, quantity, unit, calories, protein, carbohydrates, fat, fiber,
        confidence, source, data_status, base_quantity, base_calories, base_protein, base_carbohydrates,
        base_fat, base_fiber, position, updated_at
      ) values (
        ${food.id}, ${mealId}, ${userId}, ${food.name}, ${food.quantity}, ${food.unit},
        ${food.calories}, ${food.protein}, ${food.carbohydrates}, ${food.fat}, ${food.fiber},
        ${food.confidence}, ${food.source}, ${food.dataStatus}, ${food.baseQuantity}, ${food.baseCalories},
        ${food.baseProtein}, ${food.baseCarbohydrates}, ${food.baseFat}, ${food.baseFiber}, ${i}, now()
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
};

function parseProfile(input: unknown): ProfileInput {
  const body = (input ?? {}) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (name.length < 2 || name.length > 60) throw new Error("Informe como quer ser chamado.");
  const ageRaw = body.age === "" || body.age == null ? null : Number(body.age);
  if (ageRaw != null && (!Number.isInteger(ageRaw) || ageRaw < 13 || ageRaw > 120)) {
    throw new Error("Idade entre 13 e 120, ou deixe em branco.");
  }
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
      const usageRows = await sql<{ image_count: number; text_count: number; chat_count: number }>`
        select image_count, text_count, chat_count from ai_usage where user_id = ${uid} and day = ${data.day}
      `;
      const prefs = await sql<{ enabled: unknown }>`select enabled from notification_prefs where user_id = ${uid}`;
      const usage = usageRows[0] ?? { image_count: 0, text_count: 0, chat_count: 0 };
      const plan = profile?.plan ?? "free";
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
        },
      };
    });
  });

export type HomeData = {
  profile: ProfileDTO | null;
  goals: (GoalTargets & { isEstimate: boolean }) | null;
  meals: MealDTO[];
  waterMl: number;
  habits: { water: boolean; produce: boolean; meals: boolean; activity: boolean; sleep: boolean };
  checks: { habit: string; done: boolean }[];
  memory: { id: string; fact: string }[];
  notifications: boolean;
  usage: { image: number; text: number; chat: number; limits: { image: number; text: number; chat: number } };
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
      if (existing[0]) {
        await sql`
          update profiles set
            name = ${data.name}, age = ${data.age}, sex = ${data.sex}, height_cm = ${data.heightCm},
            weight_kg = ${data.weightKg}, goal = ${data.goal}, activity = ${data.activity}, diet = ${data.diet},
            diet_note = ${data.dietNote}, restrictions = ${data.restrictions}, updated_at = now()
          where user_id = ${uid}
        `;
      } else {
        await sql`
          insert into profiles (
            user_id, name, age, sex, height_cm, weight_kg, goal, activity, diet, diet_note, restrictions, consent_at
          ) values (
            ${uid}, ${data.name}, ${data.age}, ${data.sex}, ${data.heightCm}, ${data.weightKg},
            ${data.goal}, ${data.activity}, ${data.diet}, ${data.dietNote}, ${data.restrictions}, now()
          )
        `;
        await trackEvent(sql, uid, "onboarding_completed");
      }
      const goalRows = await sql`select user_id from goals where user_id = ${uid}`;
      if (!goalRows[0] || data.recalculate) {
        const estimated = estimateGoals(data);
        await sql`
          insert into goals (user_id, calories, protein, carbohydrates, fat, fiber, water_ml, is_estimate, updated_at)
          values (
            ${uid}, ${estimated.targets.calories}, ${estimated.targets.protein}, ${estimated.targets.carbohydrates},
            ${estimated.targets.fat}, ${estimated.targets.fiber}, ${estimated.targets.waterMl}, true, now()
          )
          on conflict (user_id) do update set
            calories = excluded.calories,
            protein = excluded.protein,
            carbohydrates = excluded.carbohydrates,
            fat = excluded.fat,
            fiber = excluded.fiber,
            water_ml = excluded.water_ml,
            is_estimate = true,
            updated_at = now()
        `;
      }
      const profiles = await sql<ProfileRow>`select * from profiles where user_id = ${uid}`;
      return { ok: true as const, data: { profile: mapProfile(profiles[0]!) } };
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
      await sql`
        insert into goals (user_id, calories, protein, carbohydrates, fat, fiber, water_ml, is_estimate, updated_at)
        values (
          ${uid}, ${Math.round(data.calories)}, ${data.protein}, ${data.carbohydrates}, ${data.fat},
          ${data.fiber}, ${Math.round(data.waterMl)}, false, now()
        )
        on conflict (user_id) do update set
          calories = excluded.calories, protein = excluded.protein, carbohydrates = excluded.carbohydrates,
          fat = excluded.fat, fiber = excluded.fiber, water_ml = excluded.water_ml,
          is_estimate = false, updated_at = now()
      `;
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
  return {
    id,
    day: dayOf(body.day),
    mealType,
    eatenAt: new Date(eatenAt).toISOString(),
    source,
    note: String(body.note ?? "").slice(0, 280),
    uncertainties,
    insight: String(body.insight ?? "").slice(0, 320),
    foods: parseFoods(body.foods),
  };
}

export const saveMeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseMeal(input))
  .handler(async ({ data, context }): Promise<Result<{ mealId: string }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
      const totals = sumFoods(data.foods);
      const owned = await sql<{ user_id: string }>`select user_id from meals where id = ${data.id}`;
      if (owned[0] && owned[0].user_id !== uid) return { ok: false, error: "Esse registro não é seu." };
      const uncertaintyJson = JSON.stringify(data.uncertainties);
      if (owned[0]) {
        await sql`
          update meals set
            day = ${data.day}, meal_type = ${data.mealType}, eaten_at = ${data.eatenAt}, source = ${data.source},
            note = ${data.note}, uncertainties = ${uncertaintyJson}, insight = ${data.insight},
            calories = ${totals.calories}, protein = ${totals.protein}, carbohydrates = ${totals.carbohydrates},
            fat = ${totals.fat}, fiber = ${totals.fiber}, incomplete = ${totals.incomplete}, updated_at = now()
          where id = ${data.id} and user_id = ${uid}
        `;
      } else {
        await sql`
          insert into meals (
            id, user_id, day, meal_type, eaten_at, source, note, uncertainties, insight,
            calories, protein, carbohydrates, fat, fiber, incomplete
          ) values (
            ${data.id}, ${uid}, ${data.day}, ${data.mealType}, ${data.eatenAt}, ${data.source}, ${data.note},
            ${uncertaintyJson}, ${data.insight}, ${totals.calories}, ${totals.protein}, ${totals.carbohydrates},
            ${totals.fat}, ${totals.fiber}, ${totals.incomplete}
          )
        `;
        await trackEvent(sql, uid, "meal_created");
        if (data.source === "voice") await trackEvent(sql, uid, "voice_meal_created");
      }
      await writeFoods(sql, uid, data.id, data.foods);
      return { ok: true as const, data: { mealId: data.id } };
    });
  });

export const deleteMeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => String(id ?? ""))
  .handler(async ({ data, context }): Promise<Result<{ deleted: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await sql`delete from food_items where meal_id = ${data} and user_id = ${context.userId}`;
      await sql`delete from meals where id = ${data} and user_id = ${context.userId}`;
      return { ok: true as const, data: { deleted: true as const } };
    });
  });

export const duplicateMeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; day?: string }) => ({ id: String(input?.id ?? ""), day: dayOf(input?.day) }))
  .handler(async ({ data, context }): Promise<Result<{ mealId: string }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const uid = context.userId;
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
      const totals = sumFoods(source.foods);
      await sql`
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
      await writeFoods(
        sql,
        uid,
        id,
        source.foods.map((food) => ({ ...food, id: crypto.randomUUID() })),
      );
      return { ok: true as const, data: { mealId: id } };
    });
  });

async function assertQuota(sql: Sql, userId: string, day: string, kind: "image" | "text" | "chat") {
  const profiles = await sql<{ plan: string }>`select plan from profiles where user_id = ${userId}`;
  const plan: PlanId = profiles[0]?.plan === "premium" ? "premium" : "free";
  const rows = await sql<{ image_count: number; text_count: number; chat_count: number }>`
    select image_count, text_count, chat_count from ai_usage where user_id = ${userId} and day = ${day}
  `;
  const used = Number(rows[0]?.[kind === "image" ? "image_count" : kind === "text" ? "text_count" : "chat_count"] ?? 0);
  const limit = AI_LIMITS[plan][kind];
  if (used >= limit) {
    const label = kind === "image" ? "análises de foto" : kind === "chat" ? "mensagens para a Calu" : "interpretações de texto";
    throw new Error(
      `Você chegou ao limite de ${limit} ${label} de hoje no plano ${plan === "premium" ? "Premium" : "gratuito"}. O registro manual continua disponível.`,
    );
  }
}

async function bumpUsage(sql: Sql, userId: string, day: string, kind: "image" | "text" | "chat") {
  const column = kind === "image" ? "image_count" : kind === "text" ? "text_count" : "chat_count";
  await sql.query(
    `insert into ai_usage (user_id, day, ${column}) values ($1, $2, 1)
     on conflict (user_id, day) do update set ${column} = ai_usage.${column} + 1`,
    [userId, day],
  );
}

function hintFrom(input: Record<string, unknown>): string {
  return String(input.hint ?? "").slice(0, 500);
}

export const analyzePhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const body = (input ?? {}) as Record<string, unknown>;
    let image = String(body.imageBase64 ?? "");
    const embedded = image.match(/base64,([A-Za-z0-9+/=\s]+)$/);
    if (embedded) image = embedded[1] ?? "";
    image = image.replace(/\s/g, "");
    if (image.length < 80 || image.length > 1_800_000 || !/^[A-Za-z0-9+/=]+$/.test(image)) {
      throw new Error("Não consegui ler essa foto. Tente outra, mais próxima e em JPG.");
    }
    return { image, hint: hintFrom(body), hour: Number(body.hour) || 12, day: dayOf(body.day) };
  })
  .handler(async ({ data, context }): Promise<Result<{ analysis: import("./domain").Analysis }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await assertQuota(sql, context.userId, data.day, "image");
      await trackEvent(sql, context.userId, "photo_analysis_started");
      const { getAIProvider, aiErrorMessage } = await import("./ai.server");
      try {
        const analysis = await getAIProvider().analyzeMealImage(data.image, data.hint, data.hour);
        await bumpUsage(sql, context.userId, data.day, "image");
        await trackEvent(sql, context.userId, "photo_analysis_completed");
        return { ok: true as const, data: { analysis } };
      } catch (error) {
        console.error("calu_photo_failed");
        return { ok: false, error: aiErrorMessage(error) };
      }
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
      const sql = await getSql();
      await assertQuota(sql, context.userId, data.day, "text");
      const { getAIProvider, aiErrorMessage } = await import("./ai.server");
      try {
        const provider = getAIProvider();
        const analysis =
          data.source === "voice"
            ? await provider.analyzeMealVoice(data.text, data.hint, data.hour)
            : await provider.analyzeMealText(data.text, data.hint, data.hour);
        await bumpUsage(sql, context.userId, data.day, "text");
        return { ok: true as const, data: { analysis } };
      } catch (error) {
        console.error("calu_text_failed");
        return { ok: false, error: aiErrorMessage(error) };
      }
    });
  });

export const addWater = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day?: string; amountMl?: number }) => {
    const amount = Number(input?.amountMl);
    if (![150, 200, 250, 350, 500].includes(amount)) throw new Error("Quantidade de água inválida.");
    return { day: dayOf(input?.day), amountMl: amount };
  })
  .handler(async ({ data, context }): Promise<Result<{ waterMl: number }>> => {
    return quiet(async () => {
      const sql = await getSql();
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
      const existing = await sql<{ id: string }>`
        select id from weight_logs where user_id = ${context.userId} and day = ${data.day} limit 1
      `;
      if (existing[0]) {
        await sql`
          update weight_logs set weight_kg = ${data.weightKg}, updated_at = now()
          where id = ${existing[0].id} and user_id = ${context.userId}
        `;
      } else {
        await sql`
          insert into weight_logs (id, user_id, day, weight_kg) values (${crypto.randomUUID()}, ${context.userId}, ${data.day}, ${data.weightKg})
        `;
      }
      await sql`update profiles set weight_kg = ${data.weightKg}, updated_at = now() where user_id = ${context.userId}`;
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
      const end = new Date(`${data.endDay}T12:00:00`);
      const startDate = new Date(end);
      startDate.setDate(end.getDate() - (data.span - 1));
      const start = startDate.toISOString().slice(0, 10);
      const meals = await sql<{ day: string; calories: number; protein: number; fiber: number }>`
        select day, calories, protein, fiber from meals
        where user_id = ${uid} and day >= ${start} and day <= ${data.endDay}
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
    if (!["produce", "activity", "sleep"].includes(habit)) throw new Error("Hábito inválido.");
    return { day: dayOf(input?.day), habit, done: input?.done === true };
  })
  .handler(async ({ data, context }): Promise<Result<{ saved: true }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await sql`
        insert into habit_checks (id, user_id, day, habit, done)
        values (${crypto.randomUUID()}, ${context.userId}, ${data.day}, ${data.habit}, ${data.done})
        on conflict (user_id, day, habit) do update set done = ${data.done}
      `;
      return { ok: true as const, data: { saved: true as const } };
    });
  });

export const setNotifications = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((enabled: boolean) => enabled === true)
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
        await assertQuota(sql, uid, data.day, "chat");
        const history = await sql<{ role: string; content: string }>`
          select role, content from ai_messages where user_id = ${uid} order by created_at desc limit 10
        `;
        const ordered = history.reverse().filter((m) => m.role === "user" || m.role === "assistant") as {
          role: "user" | "assistant";
          content: string;
        }[];
        const { getAIProvider, aiErrorMessage } = await import("./ai.server");
        try {
          await trackEvent(sql, uid, "ai_chat_started");
          reply = await getAIProvider().chat(ordered, await diaryContext(sql, uid, data.day));
          await bumpUsage(sql, uid, data.day, "chat");
        } catch (error) {
          console.error("calu_chat_failed");
          reply = aiErrorMessage(error);
        }
      }
      await sql`insert into ai_messages (id, user_id, role, content) values (${crypto.randomUUID()}, ${uid}, ${"assistant"}, ${reply})`;
      return { ok: true as const, data: { reply: reply! } };
    });
  });

export const listChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }): Promise<Result<{ messages: { id: string; role: string; content: string }[] }>> => {
    return quiet(async () => {
      const sql = await getSql();
      const rows = await sql<{ id: string; role: string; content: string }>`
        select id, role, content from ai_messages where user_id = ${context.userId} order by created_at desc limit 40
      `;
      return { ok: true as const, data: { messages: rows.reverse() } };
    });
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => String(id ?? ""))
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
  .validator((code: string) => String(code ?? "").replace(/\D/g, "").slice(0, 20))
  .handler(async ({ data }): Promise<Result<{
    name: string;
    quantity: number;
    unit: string;
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fat: number | null;
    fiber: number | null;
    note: string;
  }>> => {
    return quiet(async () => {
      if (data.length < 8) return { ok: false, error: "Código inválido." };
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`, {
        headers: { "User-Agent": "CaluAI/1.0 (meal diary; contact via app)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { ok: false, error: "Produto não encontrado." };
      const body = (await res.json()) as {
        status?: number;
        product?: {
          product_name_pt?: string;
          product_name?: string;
          nutriments?: Record<string, number | string | undefined>;
          serving_quantity?: number | string;
        };
      };
      if (body.status !== 1 || !body.product) return { ok: false, error: "Produto não encontrado." };
      const ntr = body.product.nutriments ?? {};
      const pick = (key: string) => {
        const value = ntr[key];
        const parsed = typeof value === "number" ? value : Number(value);
        return Number.isFinite(parsed) ? Math.round(parsed * 10) / 10 : null;
      };
      const per100 = pick("energy-kcal_100g") != null;
      const serving = Number(body.product.serving_quantity);
      const quantity = Number.isFinite(serving) && serving > 0 ? serving : 100;
      const factor = per100 ? quantity / 100 : 1;
      const base = (key100: string, keyServing: string) => {
        if (per100) {
          const value = pick(key100);
          return value == null ? null : Math.round(value * factor * 10) / 10;
        }
        return pick(keyServing);
      };
      const name = body.product.product_name_pt || body.product.product_name || "Produto sem nome";
      const calories = base("energy-kcal_100g", "energy-kcal_serving");
      return {
        ok: true as const,
        data: {
          name: name.slice(0, 80),
          quantity,
          unit: "g",
          calories: calories == null ? null : Math.round(calories),
          protein: base("proteins_100g", "proteins_serving"),
          carbohydrates: base("carbohydrates_100g", "carbohydrates_serving"),
          fat: base("fat_100g", "fat_serving"),
          fiber: base("fiber_100g", "fiber_serving"),
          note:
            calories == null
              ? "Produto encontrado, mas os dados nutricionais não estão disponíveis na base."
              : "Valores do rótulo informados na Open Food Facts. Confira a porção antes de salvar.",
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
      const meals = await sql`select id, day, meal_type, eaten_at, source, note, calories, protein, carbohydrates, fat, fiber from meals where user_id = ${uid} order by eaten_at`;
      const foods = await sql`select meal_id, name, quantity, unit, calories, protein, carbohydrates, fat, fiber, source, data_status from food_items where user_id = ${uid}`;
      const water = await sql`select day, amount_ml, created_at from water_logs where user_id = ${uid} order by created_at`;
      const weight = await sql`select day, weight_kg from weight_logs where user_id = ${uid} order by day`;
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
      await sql`delete from food_items where user_id = ${uid}`;
      await sql`delete from meals where user_id = ${uid}`;
      await sql`delete from water_logs where user_id = ${uid}`;
      await sql`delete from weight_logs where user_id = ${uid}`;
      await sql`delete from habit_checks where user_id = ${uid}`;
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
      await sql`delete from food_items where user_id = ${uid}`;
      await sql`delete from meals where user_id = ${uid}`;
      await sql`delete from water_logs where user_id = ${uid}`;
      await sql`delete from weight_logs where user_id = ${uid}`;
      await sql`delete from habit_checks where user_id = ${uid}`;
      await sql`delete from habits where user_id = ${uid}`;
      await sql`delete from ai_messages where user_id = ${uid}`;
      await sql`delete from ai_memory where user_id = ${uid}`;
      await sql`delete from ai_usage where user_id = ${uid}`;
      await sql`delete from notification_prefs where user_id = ${uid}`;
      await sql`delete from goals where user_id = ${uid}`;
      await sql`delete from profiles where user_id = ${uid}`;
      await sql`delete from analytics_events where user_id = ${uid}`;
      return { ok: true as const, data: { deleted: true as const } };
    });
  });

export const askInsight = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day?: string }) => ({ day: dayOf(input?.day) }))
  .handler(async ({ data, context }): Promise<Result<{ insight: string }>> => {
    return quiet(async () => {
      const sql = await getSql();
      await assertQuota(sql, context.userId, data.day, "text");
      const { getAIProvider, aiErrorMessage } = await import("./ai.server");
      try {
        const insight = await getAIProvider().generateDailyInsight(await diaryContext(sql, context.userId, data.day));
        await bumpUsage(sql, context.userId, data.day, "text");
        return { ok: true as const, data: { insight } };
      } catch (error) {
        return { ok: false, error: aiErrorMessage(error) };
      }
    });
  });
