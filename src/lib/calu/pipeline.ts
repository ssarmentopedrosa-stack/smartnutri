import { makeFood, routeConfidence, type Analysis, type FoodDraft } from "./domain.ts";
import { calculateNutrition, toGrams } from "./nutrition.ts";
import { resolveFoodName, type NutritionSourceId } from "./resolver.ts";

function clamp01(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

export function enrichAnalysis(analysis: Analysis): Analysis {
  const uncertainties = [...analysis.uncertainties];
  const foods: FoodDraft[] = analysis.foods.map((food) => {
    const resolved = resolveFoodName(food.name);
    const identification = clamp01(food.identificationConfidence ?? food.confidence);
    let portion = clamp01(food.portionConfidence ?? food.confidence);
    const grams = toGrams(resolved.taco?.name ?? food.name, food.quantity, food.unit, resolved.liquid);
    let draft = food;
    let nutritionSource: NutritionSourceId = "AI_ESTIMATE";
    let nutritionConfidence = 0.35;
    if (resolved.per100 && resolved.matchConfidence >= 0.8 && grams != null && resolved.per100.calories != null) {
      const nutrients = calculateNutrition(resolved.per100, grams);
      nutritionSource = "TACO";
      nutritionConfidence = resolved.matchConfidence;
      draft = makeFood({
        id: food.id,
        name: resolved.name,
        quantity: food.quantity,
        unit: food.unit,
        calories: nutrients.calories,
        protein: nutrients.protein,
        carbohydrates: nutrients.carbohydrates,
        fat: nutrients.fat,
        fiber: nutrients.fiber,
        confidence: identification,
        source: "taco",
        dataStatus: "reference",
      });
    } else if (grams == null && food.unit !== "g" && food.unit !== "kg") {
      portion = Math.min(portion ?? 0.4, 0.42);
      if (!uncertainties.some((item) => item.includes(food.name))) {
        uncertainties.push(`Sem conversão confiável para ${food.name}. Confirme a quantidade.`);
      }
    }
    const review = routeConfidence(identification, portion);
    return {
      ...draft,
      identificationConfidence: identification,
      portionConfidence: portion,
      nutritionConfidence,
      nutritionSource,
      review,
    };
  });
  return { ...analysis, foods, uncertainties: uncertainties.slice(0, 6) };
}

export function nutritionSourceLabel(source: NutritionSourceId | undefined, dataStatus?: string): string {
  if (source === "TACO") return "Fonte: TACO";
  if (source === "OPEN_FOOD_FACTS") return "Fonte: Open Food Facts";
  if (source === "USER_CONFIRMED") return "Confirmado por você";
  if (dataStatus === "unavailable") return "Dados não disponíveis";
  return "Estimativa";
}
