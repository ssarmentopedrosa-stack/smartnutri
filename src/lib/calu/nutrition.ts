import { round1, withQuantity, type FoodDraft } from "./domain.ts";

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

const PIECES: { match: RegExp; grams: number }[] = [
  { match: /ovo/, grams: 50 },
  { match: /banana/, grams: 70 },
  { match: /pao, trigo, frances|pao frances/, grams: 50 },
  { match: /pao, trigo, forma|pao de forma/, grams: 25 },
  { match: /maca|maçã/, grams: 130 },
  { match: /laranja/, grams: 150 },
];

const SPOONS: { match: RegExp; grams: number }[] = [
  { match: /arroz/, grams: 25 },
  { match: /feijao|feijão/, grams: 20 },
  { match: /acucar|açúcar/, grams: 12 },
  { match: /azeite/, grams: 8 },
  { match: /aveia/, grams: 10 },
];

const CUPS: { match: RegExp; grams: number }[] = [
  { match: /arroz/, grams: 160 },
  { match: /feijao|feijão/, grams: 140 },
  { match: /leite/, grams: 200 },
  { match: /aveia/, grams: 30 },
];

function known(table: { match: RegExp; grams: number }[], name: string): number | null {
  const hit = table.find((item) => item.match.test(name));
  return hit ? hit.grams : null;
}

/**
 * Converte quantidade + unidade para gramas quando existe base conhecida.
 * Retorna null se a conversão seria um chute.
 */
export function toGrams(name: string, quantity: number, unit: string, liquid = false): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const folded = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (unit === "g") return quantity;
  if (unit === "kg") return quantity * 1000;
  if (unit === "ml" && liquid) return quantity;
  if (unit === "L" && liquid) return quantity * 1000;
  if (unit === "unidade" || unit === "fatia") {
    const grams = known(PIECES, folded);
    return grams == null ? null : grams * quantity;
  }
  if (unit === "colher") {
    const grams = known(SPOONS, folded);
    return grams == null ? null : grams * quantity;
  }
  if (unit === "xícara" || unit === "xicara") {
    const grams = known(CUPS, folded);
    return grams == null ? null : grams * quantity;
  }
  if (unit === "copo" && liquid) return 200 * quantity;
  if (unit === "concha" && /feijao/.test(folded)) return 80 * quantity;
  return null;
}

export function applyPortionPreset(food: FoodDraft, preset: "pequena" | "media" | "grande"): FoodDraft {
  const factor = preset === "pequena" ? 0.65 : preset === "grande" ? 1.45 : 1;
  const base = food.baseQuantity > 0 ? food.baseQuantity : food.quantity;
  return withQuantity(food, Math.round(base * factor * 10) / 10);
}
