import { round1, withQuantity, type FoodDraft } from "./domain.ts";
import { lookupPortion } from "./portions.ts";

export type Per100 = {
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fiber: number | null;
};

export type CalculatedNutrition = Per100;

export function calculateNutrition(per100: Per100, grams: number): CalculatedNutrition {
  if (!Number.isFinite(grams) || grams <= 0 || grams > 20000) {
    throw new Error("Quantidade em gramas inválida para o cálculo nutricional.");
  }
  const factor = grams / 100;
  const scale = (value: number | null, digits: 0 | 1): number | null => {
    if (value == null || !Number.isFinite(value)) return null;
    const next = value * factor;
    return digits === 0 ? Math.round(next) : round1(next);
  };
  return {
    calories: scale(per100.calories, 0),
    protein: scale(per100.protein, 1),
    carbohydrates: scale(per100.carbohydrates, 1),
    fat: scale(per100.fat, 1),
    fiber: scale(per100.fiber, 1),
  };
}

/**
 * Converte quantidade + unidade para gramas quando existe base conhecida.
 * Retorna null se a conversão seria um chute. A base mora em portions.ts.
 */
export function toGrams(name: string, quantity: number, unit: string, liquid = false): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (unit === "g") return quantity;
  if (unit === "kg") return quantity * 1000;
  if (unit === "ml" && liquid) return quantity;
  if (unit === "L" && liquid) return quantity * 1000;
  if (unit === "copo" && liquid) return 200 * quantity;
  const portion = lookupPortion(name, unit);
  return portion ? portion.grams * quantity : null;
}

export function applyPortionPreset(food: FoodDraft, preset: "pequena" | "media" | "grande"): FoodDraft {
  const factor = preset === "pequena" ? 0.65 : preset === "grande" ? 1.45 : 1;
  const base = food.baseQuantity > 0 ? food.baseQuantity : food.quantity;
  return withQuantity(food, Math.round(base * factor * 10) / 10);
}
