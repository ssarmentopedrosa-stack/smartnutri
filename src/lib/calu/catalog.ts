import { TACO_SOURCE, type TacoFood } from "./taco.ts";
import { makeFood, type FoodDraft } from "./domain.ts";
import { calculateNutrition, toGrams } from "./nutrition.ts";
import { searchFoods } from "./search.ts";

export function searchTaco(query: string): TacoFood[] {
  return searchFoods(query).map((hit) => hit.food);
}

export function foodFromTaco(
  food: TacoFood,
  quantity: number,
  unit: string,
): { draft: FoodDraft; note: string | null } {
  const grams = toGrams(food.name, quantity, unit, food.liquid);
  if (grams == null || food.kcal == null) {
    return {
      note:
        food.kcal == null
          ? "Dados não disponíveis na referência para este item."
          : "Sem equivalência em gramas para essa unidade. Informe o peso em gramas para usar a referência TACO, ou peça uma estimativa.",
      draft: makeFood({
        id: crypto.randomUUID(),
        name: food.name,
        quantity: quantity || 1,
        unit,
        calories: null,
        protein: null,
        carbohydrates: null,
        fat: null,
        fiber: null,
        source: "taco",
        dataStatus: "unavailable",
      }),
    };
  }
  const scaled = calculateNutrition(
    {
      calories: food.kcal,
      protein: food.protein,
      carbohydrates: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
    },
    grams,
  );
  const draft = makeFood({
    id: crypto.randomUUID(),
    name: food.name,
    quantity,
    unit,
    calories: scaled.calories,
    protein: scaled.protein,
    carbohydrates: scaled.carbohydrates,
    fat: scaled.fat,
    fiber: scaled.fiber,
    source: "taco",
    dataStatus: "reference",
  });
  draft.nutritionSource = "TACO";
  draft.nutritionConfidence = 0.99;
  return {
    note:
      food.liquid && (unit === "ml" || unit === "L")
        ? `Referência ${TACO_SOURCE}, por 100 g. Para líquido, 1 ml foi tratado como 1 g — uma aproximação.`
        : `Referência ${TACO_SOURCE}, por 100 g. A porção é a que você informou.`,
    draft,
  };
}
