export type OffCompleteness = "complete" | "partial" | "unavailable";

export type OffNormalized = {
  name: string;
  quantity: number;
  unit: "g";
  per100: {
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fat: number | null;
    fiber: number | null;
  } | null;
  perServing: {
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fat: number | null;
    fiber: number | null;
  } | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fiber: number | null;
  completeness: OffCompleteness;
  note: string;
};

function num(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5000) return null;
  return Math.round(parsed * 10) / 10;
}

function cleanName(value: unknown): string {
  let text = "";
  for (const char of String(value ?? "")) {
    const code = char.codePointAt(0) ?? 0;
    text += code < 32 || code === 127 ? " " : char;
  }
  return text.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function normalizeOffProduct(body: unknown): OffNormalized | { error: string } {
  const root = body as {
    status?: number;
    product?: {
      product_name_pt?: unknown;
      product_name?: unknown;
      nutriments?: Record<string, unknown>;
      serving_quantity?: unknown;
    };
  };
  if (!root || root.status !== 1 || !root.product) return { error: "Produto não encontrado." };
  const nutriments = root.product.nutriments ?? {};
  const per100 = {
    calories: num(nutriments["energy-kcal_100g"]),
    protein: num(nutriments.proteins_100g),
    carbohydrates: num(nutriments.carbohydrates_100g),
    fat: num(nutriments.fat_100g),
    fiber: num(nutriments.fiber_100g),
  };
  const perServing = {
    calories: num(nutriments["energy-kcal_serving"]),
    protein: num(nutriments.proteins_serving),
    carbohydrates: num(nutriments.carbohydrates_serving),
    fat: num(nutriments.fat_serving),
    fiber: num(nutriments.fiber_serving),
  };
  const has100 = per100.calories != null;
  const servingQty = num(root.product.serving_quantity);
  const quantity = servingQty && servingQty > 0 && servingQty <= 2000 ? servingQty : 100;
  const factor = quantity / 100;
  const from100 = has100
    ? {
        calories: per100.calories == null ? null : Math.round(per100.calories * factor),
        protein: per100.protein == null ? null : Math.round(per100.protein * factor * 10) / 10,
        carbohydrates: per100.carbohydrates == null ? null : Math.round(per100.carbohydrates * factor * 10) / 10,
        fat: per100.fat == null ? null : Math.round(per100.fat * factor * 10) / 10,
        fiber: per100.fiber == null ? null : Math.round(per100.fiber * factor * 10) / 10,
      }
    : null;
  const chosen = from100 ?? (perServing.calories != null ? perServing : null);
  const filled = [chosen?.calories, chosen?.protein, chosen?.carbohydrates, chosen?.fat].filter((value) => value != null).length;
  const completeness: OffCompleteness = !chosen || chosen.calories == null ? "unavailable" : filled >= 4 ? "complete" : "partial";
  const name = cleanName(root.product.product_name_pt || root.product.product_name) || "Produto sem nome";
  const note =
    completeness === "complete"
      ? "Dados completos. Fonte: Open Food Facts. Confira a porção."
      : completeness === "partial"
        ? "Dados parciais. Fonte: Open Food Facts. Alguns nutrientes não vieram no rótulo."
        : "Produto encontrado, mas os dados nutricionais não estão disponíveis na base.";
  return {
    name,
    quantity,
    unit: "g",
    per100: has100 ? per100 : null,
    perServing: perServing.calories != null ? perServing : null,
    calories: chosen?.calories ?? null,
    protein: chosen?.protein ?? null,
    carbohydrates: chosen?.carbohydrates ?? null,
    fat: chosen?.fat ?? null,
    fiber: chosen?.fiber ?? null,
    completeness,
    note,
  };
}
