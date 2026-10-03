import { round1, type FoodDraft } from "./domain.ts";

export type NutrientProgress = {
  consumed: number;
  target: number | null;
  remaining: number | null;
  percentage: number | null;
};

export type RecordState = "CONFIRMED" | "NEEDS_CONFIRMATION" | "PARTIAL" | "UNKNOWN";

export type DailyBoard = {
  day: string;
  calories: NutrientProgress;
  protein: NutrientProgress;
  carbohydrates: NutrientProgress;
  fat: NutrientProgress;
  fiber: NutrientProgress;
  water: NutrientProgress;
  mealCount: number;
  incompleteItems: number;
  note: string;
};

export function nutrientProgress(consumed: number, target: number | null | undefined): NutrientProgress {
  const safe = Number.isFinite(consumed) ? consumed : 0;
  if (target == null || !Number.isFinite(target) || target <= 0) {
    return { consumed: safe, target: null, remaining: null, percentage: null };
  }
  return {
    consumed: safe,
    target,
    remaining: round1(Math.max(0, target - safe)),
    percentage: Math.min(999, Math.round((safe / target) * 100)),
  };
}

export function foodRecordState(food: Pick<FoodDraft, "calories" | "dataStatus" | "review" | "nutritionSource" | "protein" | "carbohydrates" | "fat">): RecordState {
  if (food.dataStatus === "unavailable" || food.calories == null) return "UNKNOWN";
  if (food.review === "low") return "NEEDS_CONFIRMATION";
  const missingMacro = food.protein == null || food.carbohydrates == null || food.fat == null;
  if (food.dataStatus === "estimate" || food.nutritionSource === "AI_ESTIMATE" || missingMacro) return "PARTIAL";
  return "CONFIRMED";
}

export function localDailyNote(input: {
  mealCount: number;
  hour: number;
  qualitative: boolean;
  calories: NutrientProgress;
  protein: NutrientProgress;
  incompleteItems: number;
}): string {
  if (input.mealCount === 0) return "Ainda não há refeição neste dia.";
  if (input.incompleteItems > 0) {
    return input.incompleteItems === 1
      ? "Há um registro que ainda precisa de confirmação."
      : `Há ${input.incompleteItems} registros que ainda precisam de confirmação.`;
  }
  if (input.qualitative || input.calories.target == null) {
    return "Os registros de hoje estão no diário. A meta calórica não está configurada.";
  }
  const over = input.calories.target > 0 && input.calories.consumed > input.calories.target;
  if (over) return "Seu consumo ficou acima da referência planejada hoje.";
  if (input.protein.target != null && input.protein.consumed < input.protein.target * 0.6) {
    return input.hour < 18
      ? "A proteína registrada ainda está abaixo da meta. Você ainda tem o restante do dia para registrar."
      : "Sua ingestão de proteína está abaixo da meta configurada.";
  }
  if (input.hour < 21 && input.calories.consumed < input.calories.target) {
    return "Você ainda tem o restante do dia para registrar.";
  }
  return "O dia está registrado com o que você confirmou.";
}

export function buildDailyBoard(input: {
  day: string;
  hour: number;
  qualitative: boolean;
  mealCount: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  waterMl: number;
  targets: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
    waterMl: number;
  } | null;
  incompleteItems: number;
}): DailyBoard {
  const goals = input.qualitative ? null : input.targets;
  const calories = nutrientProgress(input.calories, goals?.calories);
  const protein = nutrientProgress(input.protein, goals?.protein);
  const board: DailyBoard = {
    day: input.day,
    calories,
    protein,
    carbohydrates: nutrientProgress(input.carbohydrates, goals?.carbohydrates),
    fat: nutrientProgress(input.fat, goals?.fat),
    fiber: nutrientProgress(input.fiber, goals?.fiber),
    water: nutrientProgress(input.waterMl, goals?.waterMl),
    mealCount: input.mealCount,
    incompleteItems: input.incompleteItems,
    note: "",
  };
  board.note = localDailyNote({
    mealCount: input.mealCount,
    hour: input.hour,
    qualitative: input.qualitative,
    calories,
    protein,
    incompleteItems: input.incompleteItems,
  });
  return board;
}

export type InsightContext = {
  date: string;
  calories: { consumed: number; target: number | null };
  protein: { consumed: number; target: number | null };
  carbohydrates: { consumed: number };
  fat: { consumed: number };
  fiber: { consumed: number };
  water: { consumedMl: number; targetMl: number | null };
  mealCount: number;
  incompleteItems: number;
};

export function insightContext(board: DailyBoard): InsightContext {
  return {
    date: board.day,
    calories: { consumed: Math.round(board.calories.consumed), target: board.calories.target },
    protein: { consumed: board.protein.consumed, target: board.protein.target },
    carbohydrates: { consumed: board.carbohydrates.consumed },
    fat: { consumed: board.fat.consumed },
    fiber: { consumed: board.fiber.consumed },
    water: { consumedMl: Math.round(board.water.consumed), targetMl: board.water.target },
    mealCount: board.mealCount,
    incompleteItems: board.incompleteItems,
  };
}

export function contextHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  return (hash >>> 0).toString(16);
}

const INSIGHT_BANNED = /diagn[oó]stic|fracass|comeu errado|exager|prescrev|medicament|emagre[cç]a|jejum/i;

export function parseDailyInsight(text: string): string | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 8 || clean.length > 320) return null;
  if (INSIGHT_BANNED.test(clean)) return null;
  return clean;
}

export function rescaleRecordedFood(food: FoodDraft, quantity: number, unit: string): FoodDraft {
  const next = Number.isFinite(quantity) ? Math.round(quantity * 10) / 10 : 0;
  if (!(next > 0) || !(food.quantity > 0)) {
    return { ...food, quantity: next > 0 ? next : food.quantity, unit, calories: null, protein: null, carbohydrates: null, fat: null, fiber: null, dataStatus: "unavailable" };
  }
  if (unit !== food.unit) {
    return {
      ...food,
      quantity: next,
      unit,
      calories: null,
      protein: null,
      carbohydrates: null,
      fat: null,
      fiber: null,
      dataStatus: "unavailable",
      review: "low",
    };
  }
  const ratio = next / food.quantity;
  const scale = (value: number | null, digits: 0 | 1) => {
    if (value == null) return null;
    const raw = value * ratio;
    return digits === 0 ? Math.round(raw) : round1(raw);
  };
  return {
    ...food,
    quantity: next,
    unit,
    calories: scale(food.calories, 0),
    protein: scale(food.protein, 1),
    carbohydrates: scale(food.carbohydrates, 1),
    fat: scale(food.fat, 1),
    fiber: scale(food.fiber, 1),
  };
}
