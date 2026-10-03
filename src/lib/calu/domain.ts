/**
 * Regras de nutrição, metas e linguagem da Calu.
 * Funções puras: a UI e o servidor usam a mesma conta, sem inventar precisão.
 */

export const MEAL_TYPES = [
  { id: "breakfast", label: "Café da manhã" },
  { id: "lunch", label: "Almoço" },
  { id: "snack", label: "Lanche" },
  { id: "dinner", label: "Jantar" },
  { id: "supper", label: "Ceia" },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]["id"];

export const UNITS = [
  "g",
  "kg",
  "ml",
  "L",
  "unidade",
  "fatia",
  "colher",
  "concha",
  "xícara",
  "copo",
  "porção",
] as const;

export type Unit = (typeof UNITS)[number];

export const GOALS = [
  { id: "acompanhar", label: "Acompanhar alimentação" },
  { id: "habitos", label: "Melhorar hábitos" },
  { id: "controlar", label: "Controlar peso" },
  { id: "massa", label: "Ganhar massa muscular" },
  { id: "manter", label: "Manter peso" },
  { id: "outro", label: "Outro" },
] as const;

export type GoalId = (typeof GOALS)[number]["id"];

export const ACTIVITIES = [
  { id: "sedentario", label: "Sedentário" },
  { id: "leve", label: "Levemente ativo" },
  { id: "moderado", label: "Moderadamente ativo" },
  { id: "muito", label: "Muito ativo" },
] as const;

export type ActivityId = (typeof ACTIVITIES)[number]["id"];

export const DIETS = [
  { id: "livre", label: "Livre" },
  { id: "vegetariano", label: "Vegetariano" },
  { id: "vegano", label: "Vegano" },
  { id: "outra", label: "Outra" },
] as const;

export type DietId = (typeof DIETS)[number]["id"];

export type SexId = "feminino" | "masculino" | "nao_informar";

export type PlanId = "free" | "premium";

export type DataStatus = "estimate" | "reference" | "unavailable";

export type FoodSource = "ai" | "taco" | "user" | "barcode";

export type FoodDraft = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fiber: number | null;
  confidence: number | null;
  source: FoodSource;
  dataStatus: DataStatus;
  baseQuantity: number;
  baseCalories: number | null;
  baseProtein: number | null;
  baseCarbohydrates: number | null;
  baseFat: number | null;
  baseFiber: number | null;
  nutritionSource?: "TACO" | "OPEN_FOOD_FACTS" | "USER_CONFIRMED" | "AI_ESTIMATE";
  identificationConfidence?: number | null;
  portionConfidence?: number | null;
  nutritionConfidence?: number | null;
  review?: "high" | "medium" | "low";
};

export type Macros = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  incomplete: boolean;
};

export type GoalTargets = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  waterMl: number;
};

export const CALORIE_FLOOR = 1500;

export const AI_LIMITS: Record<PlanId, { image: number; text: number; chat: number }> = {
  free: { image: 5, text: 20, chat: 15 },
  premium: { image: 40, text: 80, chat: 80 },
};

export const ANALYTICS_EVENTS = [
  "app_open",
  "onboarding_started",
  "onboarding_completed",
  "photo_started",
  "photo_completed",
  "photo_failed",
  "photo_analysis_started",
  "photo_analysis_completed",
  "meal_created",
  "meal_edited",
  "meal_deleted",
  "food_corrected",
  "portion_corrected",
  "barcode_used",
  "goal_viewed",
  "goal_changed",
  "progress_viewed",
  "weekly_summary_viewed",
  "chat_started",
  "chat_completed",
  "ai_chat_started",
  "habit_created",
  "habit_completed",
  "subscription_viewed",
  "subscription_screen_opened",
  "checkout_started",
  "subscription_started",
  "subscription_cancelled",
  "voice_meal_created",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

const GENERIC_GOALS: GoalTargets = {
  calories: 2000,
  protein: 100,
  carbohydrates: 220,
  fat: 65,
  fiber: 25,
  waterMl: 2500,
};

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function mealLabel(id: string): string {
  return MEAL_TYPES.find((m) => m.id === id)?.label ?? "Refeição";
}

export function emptyMacros(): Macros {
  return {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    incomplete: true,
  };
}

export function sumFoods(foods: FoodDraft[]): Macros {
  if (foods.length === 0) return emptyMacros();
  let incomplete = false;
  let calories = 0;
  let protein = 0;
  let carbohydrates = 0;
  let fat = 0;
  let fiber = 0;
  for (const food of foods) {
    if (food.calories == null) incomplete = true;
    else calories += food.calories;
    if (food.protein == null) incomplete = true;
    else protein += food.protein;
    if (food.carbohydrates == null) incomplete = true;
    else carbohydrates += food.carbohydrates;
    if (food.fat == null) incomplete = true;
    else fat += food.fat;
    if (food.fiber == null) incomplete = true;
    else fiber += food.fiber;
  }
  return {
    calories: Math.round(calories),
    protein: round1(protein),
    carbohydrates: round1(carbohydrates),
    fat: round1(fat),
    fiber: round1(fiber),
    incomplete,
  };
}

function scaleNullable(value: number | null, ratio: number, digits: 0 | 1): number | null {
  if (value == null) return null;
  const next = value * ratio;
  return digits === 0 ? Math.round(next) : round1(next);
}

export function sanitizeQty(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.min(10000, round1(quantity));
}

export function withQuantity(food: FoodDraft, quantity: number): FoodDraft {
  const next = sanitizeQty(quantity);
  const ratio = food.baseQuantity > 0 ? next / food.baseQuantity : 1;
  return {
    ...food,
    quantity: next,
    calories: scaleNullable(food.baseCalories, ratio, 0),
    protein: scaleNullable(food.baseProtein, ratio, 1),
    carbohydrates: scaleNullable(food.baseCarbohydrates, ratio, 1),
    fat: scaleNullable(food.baseFat, ratio, 1),
    fiber: scaleNullable(food.baseFiber, ratio, 1),
  };
}

export function commitDraft(food: FoodDraft): FoodDraft {
  return {
    ...food,
    baseQuantity: food.quantity > 0 ? food.quantity : 1,
    baseCalories: food.calories,
    baseProtein: food.protein,
    baseCarbohydrates: food.carbohydrates,
    baseFat: food.fat,
    baseFiber: food.fiber,
  };
}

export function quantityStep(unit: string): number {
  switch (unit) {
    case "g":
      return 10;
    case "kg":
      return 0.1;
    case "ml":
      return 25;
    case "L":
      return 0.1;
    case "colher":
    case "porção":
      return 0.5;
    default:
      return 1;
  }
}

export function makeFood(partial: {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fiber: number | null;
  confidence?: number | null;
  source: FoodSource;
  dataStatus: DataStatus;
}): FoodDraft {
  const quantity = sanitizeQty(partial.quantity) || 1;
  return commitDraft({
    id: partial.id,
    name: partial.name.trim().slice(0, 80),
    quantity,
    unit: partial.unit,
    calories: partial.calories,
    protein: partial.protein,
    carbohydrates: partial.carbohydrates,
    fat: partial.fat,
    fiber: partial.fiber,
    confidence: partial.confidence ?? null,
    source: partial.source,
    dataStatus: partial.dataStatus,
    baseQuantity: quantity,
    baseCalories: partial.calories,
    baseProtein: partial.protein,
    baseCarbohydrates: partial.carbohydrates,
    baseFat: partial.fat,
    baseFiber: partial.fiber,
  });
}

export function routeConfidence(
  identification: number | null,
  portion: number | null,
): "high" | "medium" | "low" {
  const id = identification ?? 0.4;
  const portionScore = portion ?? 0.4;
  if (id >= 0.85 && portionScore >= 0.8) return "high";
  if (id < 0.55 || portionScore < 0.5) return "low";
  return "medium";
}

export const LEGAL_VERSIONS = {
  consent: "2026-10-03",
  terms: "2026-10-03",
  privacy: "2026-10-03",
} as const;

export function estimateGoals(input: {
  age: number | null;
  sex: SexId;
  heightCm: number | null;
  weightKg: number | null;
  goal: GoalId;
  activity: ActivityId;
}): { targets: GoalTargets; note: string; personal: boolean; qualitative: boolean; audience: "adult" | "minor" | "insufficient" } {
  const { age, heightCm, weightKg } = input;
  if (age != null && age < 18) {
    const waterMl = age < 14 ? 1600 : 2000;
    return {
      targets: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, waterMl },
      personal: false,
      qualitative: true,
      audience: "minor",
      note: "Para menores de 18 anos a Calu não calcula meta calórica adulta nem déficit. O acompanhamento é o registro, a hidratação, os hábitos e a orientação de um responsável ou profissional quando necessário.",
    };
  }
  if (
    age == null ||
    heightCm == null ||
    weightKg == null ||
    age < 18 ||
    heightCm < 120 ||
    weightKg < 30
  ) {
    return {
      targets: GENERIC_GOALS,
      personal: false,
      qualitative: false,
      audience: "insufficient",
      note: "Sem idade, altura e peso suficientes, usamos uma referência genérica. Não é uma meta pessoal e não substitui orientação profissional.",
    };
  }

  const sexConst = input.sex === "masculino" ? 5 : input.sex === "feminino" ? -161 : -78;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConst;
  const activityFactor =
    input.activity === "sedentario"
      ? 1.2
      : input.activity === "leve"
        ? 1.375
        : input.activity === "moderado"
          ? 1.55
          : 1.725;
  const tdee = bmr * activityFactor;
  const goalFactor = input.goal === "controlar" ? 0.85 : input.goal === "massa" ? 1.12 : 1;
  const raw = tdee * goalFactor;
  const calories = Math.max(CALORIE_FLOOR, Math.round(raw));
  const proteinPerKg = input.goal === "massa" ? 1.6 : input.goal === "controlar" ? 1.4 : 1.2;
  const protein = round1(weightKg * proteinPerKg);
  let fat = round1((calories * 0.28) / 9);
  let carbohydrates = round1((calories - protein * 4 - fat * 9) / 4);
  if (carbohydrates < 0) {
    fat = round1(Math.max(35, (calories - protein * 4) / 9));
    carbohydrates = round1(Math.max(0, (calories - protein * 4 - fat * 9) / 4));
  }
  const fiber = Math.max(25, Math.round((14 * calories) / 1000));
  const waterMl = Math.min(3500, Math.max(2000, Math.round((35 * weightKg) / 50) * 50));
  const floored = raw < CALORIE_FLOOR;
  return {
    personal: true,
    qualitative: false,
    audience: "adult",
    targets: { calories, protein, carbohydrates, fat, fiber, waterMl },
    note: floored
      ? "Referência diária estimada pela equação de Mifflin-St Jeor e pelo seu objetivo. O valor foi limitado para não sugerir uma ingestão muito baixa. Não substitui orientação profissional."
      : "Referência diária estimada pela equação de Mifflin-St Jeor e pelo seu objetivo. Não substitui orientação profissional.",
  };
}

export function localInsight(input: {
  totals: Macros;
  goals: GoalTargets;
  waterMl: number;
  mealCount: number;
  hour: number;
}): string {
  if (input.mealCount === 0) {
    return "Quando quiser, registre uma refeição. Não precisa ser perfeito — uma estimativa já ajuda a enxergar o dia.";
  }
  const proteinRatio = input.goals.protein > 0 ? input.totals.protein / input.goals.protein : 0;
  const fiberRatio = input.goals.fiber > 0 ? input.totals.fiber / input.goals.fiber : 0;
  const calorieRatio = input.goals.calories > 0 ? input.totals.calories / input.goals.calories : 0;
  const waterRatio = input.goals.waterMl > 0 ? input.waterMl / input.goals.waterMl : 0;

  if (calorieRatio > 1.15) {
    return "Hoje o consumo registrado ficou acima da meta estimada. Se quiser, podemos observar como isso se comporta ao longo da semana.";
  }
  if (proteinRatio >= 0.85) {
    return "Hoje sua ingestão de proteína ficou próxima da meta estimada.";
  }
  if (fiberRatio < 0.45 && input.mealCount >= 2) {
    return "Você registrou poucas fontes de fibras hoje.";
  }
  if (waterRatio < 0.5 && input.hour >= 15) {
    return "Seu consumo de água está abaixo da meta registrada.";
  }
  if (proteinRatio < 0.45) {
    return "Até agora, a proteína registrada está distante da meta estimada. Isso é só um retrato do que foi anotado.";
  }
  return "Seu dia está sendo registrado. As metas são estimativas — o mais útil é a consistência, não um número isolado.";
}

const PROTEIN_OPTIONS: Record<DietId, string[]> = {
  vegano: ["feijão", "lentilha", "tofu", "grão-de-bico"],
  vegetariano: ["ovos", "iogurte", "queijo", "feijão"],
  livre: ["ovos", "frango", "feijão", "iogurte"],
  outra: ["feijão", "ovos", "iogurte", "tofu"],
};

export function recommend(input: {
  diet: DietId;
  totals: Macros;
  goals: GoalTargets;
  mealTypes: string[];
  memory: string[];
}): string | null {
  const proteinLeft = input.goals.protein - input.totals.protein;
  const caloriesOver = input.totals.calories > input.goals.calories * 1.05;
  if (caloriesOver && input.totals.calories > 0) {
    return "Não é preciso compensar com restrição. A próxima refeição pode ter o tamanho que fizer sentido para você.";
  }
  if (proteinLeft > 25 && !input.mealTypes.includes("dinner") && input.mealTypes.length > 0) {
    const blocked = input.memory.join(" ").toLowerCase();
    const options = PROTEIN_OPTIONS[input.diet].filter((item) => {
      if (input.diet === "vegano" && /ovo|iogurte|queijo|frango|peixe|leite/.test(item)) return false;
      if (/peixe/.test(item) && /peixe/.test(blocked) && /n[aã]o gosta|evita|sem /.test(blocked)) {
        return false;
      }
      if (/frango/.test(blocked) && /n[aã]o gosta|evita/.test(blocked) && item === "frango") return false;
      return true;
    });
    return `No jantar, uma fonte simples de proteína pode aproximar você da meta estimada: ${options.slice(0, 3).join(", ")}.`;
  }
  if (input.goals.fiber - input.totals.fiber > 10 && input.mealTypes.length > 0) {
    return "Fruta, feijão, salada ou aveia são formas simples de incluir fibras, se isso combinar com o que você come.";
  }
  return null;
}

export function summarizeHistory(input: {
  span: number;
  meals: { day: string; calories: number; protein: number }[];
  waterByDay: { day: string; ml: number }[];
}): {
  recordedDays: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgWater: number | null;
  narrative: string;
} {
  const days = new Set(input.meals.map((m) => m.day));
  const recordedDays = days.size;
  if (recordedDays === 0) {
    return {
      recordedDays: 0,
      avgCalories: null,
      avgProtein: null,
      avgWater: null,
      narrative: "Ainda não há registros neste período. Quando você registrar, o histórico aparece aqui.",
    };
  }
  const byDay = new Map<string, { calories: number; protein: number }>();
  for (const meal of input.meals) {
    const cur = byDay.get(meal.day) ?? { calories: 0, protein: 0 };
    cur.calories += meal.calories;
    cur.protein += meal.protein;
    byDay.set(meal.day, cur);
  }
  let cal = 0;
  let pro = 0;
  for (const value of byDay.values()) {
    cal += value.calories;
    pro += value.protein;
  }
  const waterDays = input.waterByDay.filter((w) => w.ml > 0);
  const avgWater =
    waterDays.length === 0
      ? null
      : Math.round(waterDays.reduce((s, w) => s + w.ml, 0) / waterDays.length);
  const label = input.span === 1 ? "hoje" : `em ${recordedDays} dos últimos ${input.span} dias`;
  const narrative =
    input.span === 1
      ? recordedDays
        ? "Há registro de refeição hoje."
        : "Ainda não há registro hoje."
      : `Você registrou refeições ${label}. A média considera só os dias com registro, não os dias em branco.`;
  return {
    recordedDays,
    avgCalories: Math.round(cal / recordedDays),
    avgProtein: round1(pro / recordedDays),
    avgWater,
    narrative,
  };
}

const CRISIS =
  /anorexia|bulimia|n[aã]o consigo parar de vomitar|quero sumir|me matar|suicid|n[aã]o quero mais viver/i;
const CLINICAL =
  /diagn[oó]stic|rem[eé]dio|medicamento|posologia|exame de sangue|interprete meu exame|infarto|falta de ar|glicemia|press[aã]o alta|posso parar de tomar/i;
const EXTREME = /dieta de\s*[5-9]\d{2}|jejum de\s+\d+\s*dias|perder\s+\d+\s*kg\s+em\s+\d+\s*dias|800\s*kcal/i;

export function safetyReply(message: string): string | null {
  if (CRISIS.test(message)) {
    return "Isso merece cuidado de uma pessoa, não de um aplicativo. Se você está em sofrimento agora, procure um serviço de saúde ou alguém de confiança. No Brasil, o CVV atende em 188, 24 horas. A Calu não orienta esse tema.";
  }
  if (CLINICAL.test(message)) {
    return "Essa questão merece avaliação de um profissional de saúde. A Calu não diagnostica, não interpreta exames e não prescreve medicamentos ou dietas terapêuticas.";
  }
  if (EXTREME.test(message)) {
    return "Não vou sugerir restrição extrema nem uma meta agressiva de peso. Um profissional de saúde pode orientar com segurança. Posso ajudar a registrar o que você comer e a entender o dia.";
  }
  return null;
}

export function memoryCommand(message: string): string | null {
  const match = message
    .trim()
    .match(/^(?:lembre(?:\s+que)?|guarde(?:\s+que)?|memorize(?:\s+que)?)\s+(.{3,240})$/i);
  return match?.[1]?.trim() ?? null;
}

export function asksMemory(message: string): boolean {
  return /o que (você|voce) sabe|minha mem[oó]ria|quais h[aá]bitos|o que guardou/i.test(message);
}

type RawFood = {
  name?: unknown;
  estimatedQuantity?: unknown;
  quantity?: unknown;
  unit?: unknown;
  confidence?: unknown;
  identificationConfidence?: unknown;
  portionConfidence?: unknown;
  preparation?: unknown;
  calories?: unknown;
  protein?: unknown;
  carbohydrates?: unknown;
  fat?: unknown;
  fiber?: unknown;
};

export type Analysis = {
  mealType: MealType;
  foods: FoodDraft[];
  uncertainties: string[];
  insight: string;
};

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function asMealType(value: unknown, hour: number): MealType {
  const text = String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (text.includes("breakfast") || text.includes("cafe")) return "breakfast";
  if (text.includes("lunch") || text.includes("almoco")) return "lunch";
  if (text.includes("snack") || text.includes("lanche")) return "snack";
  if (text.includes("dinner") || text.includes("jantar")) return "dinner";
  if (text.includes("supper") || text.includes("ceia")) return "supper";
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snack";
  if (hour < 22) return "dinner";
  return "supper";
}

export function extractJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* tenta o primeiro objeto */
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export function parseAnalysis(raw: unknown, hour = 12): Analysis | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as {
    mealType?: unknown;
    foods?: unknown;
    uncertainties?: unknown;
    insight?: unknown;
  };
  if (!Array.isArray(body.foods)) return null;
  const foods: FoodDraft[] = [];
  for (const item of body.foods.slice(0, 12) as RawFood[]) {
    const name = String(item.name ?? "").trim();
    if (!name) continue;
    const quantity = numOrNull(item.estimatedQuantity ?? item.quantity) ?? 1;
    const unit = UNITS.includes(String(item.unit) as Unit) ? String(item.unit) : "g";
    const confidence = numOrNull(item.confidence);
    const identification = numOrNull(item.identificationConfidence ?? item.confidence);
    const portion = numOrNull(item.portionConfidence ?? item.confidence);
    const draft = makeFood({
        id: crypto.randomUUID(),
        name,
        quantity,
        unit,
        calories: numOrNull(item.calories) == null ? null : Math.round(numOrNull(item.calories)!),
        protein: numOrNull(item.protein) == null ? null : round1(numOrNull(item.protein)!),
        carbohydrates:
          numOrNull(item.carbohydrates) == null ? null : round1(numOrNull(item.carbohydrates)!),
        fat: numOrNull(item.fat) == null ? null : round1(numOrNull(item.fat)!),
        fiber: numOrNull(item.fiber) == null ? null : round1(numOrNull(item.fiber)!),
        confidence: confidence == null ? null : Math.max(0, Math.min(1, confidence)),
        source: "ai",
        dataStatus: numOrNull(item.calories) == null ? "unavailable" : "estimate",
      });
    foods.push({
      ...draft,
      identificationConfidence: identification == null ? null : Math.max(0, Math.min(1, identification)),
      portionConfidence: portion == null ? null : Math.max(0, Math.min(1, portion)),
      nutritionSource: "AI_ESTIMATE",
      nutritionConfidence: numOrNull(item.calories) == null ? 0 : 0.35,
      review: routeConfidence(identification, portion),
    });
  }
  const uncertainties = Array.isArray(body.uncertainties)
    ? body.uncertainties.map((u) => String(u).trim()).filter(Boolean).slice(0, 6)
    : [];
  const insight = String(body.insight ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
  return {
    mealType: asMealType(body.mealType, hour),
    foods,
    uncertainties,
    insight,
  };
}

export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function formatQty(quantity: number, unit: string): string {
  const shown = Number.isInteger(quantity) ? String(quantity) : String(round1(quantity));
  return `${shown} ${unit}`;
}

export function formatMl(ml: number): string {
  if (ml >= 1000) {
    const liters = round1(ml / 1000);
    return `${String(liters).replace(".", ",")} L`;
  }
  return `${ml} ml`;
}

export function macroLine(value: number | null, unit: string): string {
  if (value == null) return "Dados não disponíveis";
  const shown = Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
  return `${shown} ${unit}`;
}

export const GUILT_PATTERN = /você errou|estragou sua dieta|comeu demais|fracassou|nota \d/i;
