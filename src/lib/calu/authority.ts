import { commitDraft, fold, withQuantity, type FoodDraft } from "./domain.ts";
import { calculateNutrition, toGrams } from "./nutrition.ts";
import type { OffNormalized } from "./off.ts";
import { resolveFoodName } from "./resolver.ts";

export type AuthorityInput = {
  /** True when the payload came from the client, not from a row already gravada. */
  fromClient?: boolean;
  /** Snapshot estruturado do Open Food Facts, já normalizado no servidor. */
  off?: OffNormalized | null;
  /** Linha já persistida deste alimento, para edição sem reenviar o código. */
  stored?: FoodDraft | null;
};

function blank(food: FoodDraft, nutritionSource: FoodDraft["nutritionSource"], source: FoodDraft["source"]): FoodDraft {
  return commitDraft({
    ...food,
    calories: null,
    protein: null,
    carbohydrates: null,
    fat: null,
    fiber: null,
    dataStatus: "unavailable",
    review: "low",
    nutritionSource,
    source,
    nutritionConfidence: 0,
    portionConfidence: 0,
  });
}

function fromTaco(food: FoodDraft): FoodDraft | null {
  const resolved = resolveFoodName(food.name);
  if (resolved.source !== "TACO" || !resolved.per100 || resolved.matchConfidence < 0.93) return null;
  const grams = toGrams(resolved.name, food.quantity, food.unit, resolved.liquid);
  const base = {
    ...food,
    name: resolved.name,
    source: "taco" as const,
    nutritionSource: "TACO" as const,
    identificationConfidence: resolved.matchConfidence,
  };
  if (grams == null || resolved.per100.calories == null) {
    return blank(
      { ...base, portionConfidence: 0, nutritionConfidence: 0 },
      "TACO",
      "taco",
    );
  }
  const scaled = calculateNutrition(resolved.per100, grams);
  return commitDraft({
    ...base,
    calories: scaled.calories,
    protein: scaled.protein,
    carbohydrates: scaled.carbohydrates,
    fat: scaled.fat,
    fiber: scaled.fiber,
    dataStatus: "reference",
    review: "high",
    nutritionConfidence: 0.99,
    portionConfidence: 0.99,
  });
}

function fromOff(food: FoodDraft, off: OffNormalized): FoodDraft {
  const per100 = off.per100;
  const grams = toGrams(off.name || food.name, food.quantity, food.unit, false);
  const named = { ...food, name: off.name || food.name, source: "barcode" as const, nutritionSource: "OPEN_FOOD_FACTS" as const };
  if (!per100 || per100.calories == null || off.completeness === "unavailable" || grams == null) {
    return blank(named, "OPEN_FOOD_FACTS", "barcode");
  }
  const scaled = calculateNutrition(per100, grams);
  const partial = off.completeness === "partial" || scaled.protein == null || scaled.carbohydrates == null || scaled.fat == null;
  return commitDraft({
    ...named,
    calories: scaled.calories,
    protein: scaled.protein,
    carbohydrates: scaled.carbohydrates,
    fat: scaled.fat,
    fiber: scaled.fiber,
    dataStatus: partial ? "estimate" : "reference",
    review: partial ? "medium" : "high",
    nutritionConfidence: partial ? 0.55 : 0.9,
    portionConfidence: 0.9,
  });
}

function fromStored(food: FoodDraft, stored: FoodDraft): FoodDraft {
  if (food.unit !== stored.unit) {
    return blank(
      { ...stored, id: food.id, quantity: food.quantity, unit: food.unit, name: stored.name },
      stored.nutritionSource ?? "OPEN_FOOD_FACTS",
      stored.source,
    );
  }
  const scaled = withQuantity(stored, food.quantity);
  return commitDraft({
    ...scaled,
    id: food.id,
    name: stored.name,
    source: stored.source,
    dataStatus: stored.dataStatus,
    nutritionSource: stored.nutritionSource,
    review: stored.review,
  });
}

/**
 * Recalcula nutrientes quando existe TACO ou Open Food Facts.
 * Macros enviados pelo cliente não substituem essa conta.
 * Sem conversão de porção, os nutrientes ficam vazios — nada é inventado.
 */
export function authorizeRecordedFood(food: FoodDraft, input: AuthorityInput = {}): FoodDraft {
  const taco = fromTaco(food);
  if (taco) return taco;
  if (input.off) return fromOff(food, input.off);
  const stored = input.stored;
  if (
    input.fromClient &&
    stored &&
    (stored.nutritionSource === "OPEN_FOOD_FACTS" || stored.source === "barcode") &&
    fold(stored.name) === fold(food.name)
  ) {
    const kept = fromStored(food, stored);
    if (food.nutritionSource === "USER_CONFIRMED" && kept.calories != null) {
      return commitDraft({
        ...kept,
        source: "user",
        nutritionSource: "USER_CONFIRMED",
        dataStatus: kept.protein == null || kept.carbohydrates == null || kept.fat == null ? kept.dataStatus : "reference",
        review: "high",
      });
    }
    return kept;
  }
  if (input.fromClient && (food.nutritionSource === "TACO" || food.nutritionSource === "OPEN_FOOD_FACTS" || food.source === "taco" || food.source === "barcode")) {
    return blank(food, food.nutritionSource === "TACO" || food.source === "taco" ? "TACO" : "OPEN_FOOD_FACTS", food.source === "taco" ? "taco" : "barcode");
  }
  return commitDraft(food);
}
