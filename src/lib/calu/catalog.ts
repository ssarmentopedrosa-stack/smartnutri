import { TACO_FOODS, TACO_SOURCE, type TacoFood } from "./taco.ts";
import { fold, makeFood, type FoodDraft } from "./domain.ts";
import { calculateNutrition } from "./nutrition.ts";

export function searchTaco(query: string): TacoFood[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  return TACO_FOODS.filter(
    (food) => fold(food.name).includes(q) || food.aliases.some((alias) => fold(alias).includes(q)),
  ).slice(0, 12);
}

export function foodFromTaco(
  food: TacoFood,
  quantity: number,
  unit: string,
): { draft: FoodDraft; note: string | null } {
  const weightUnits = unit === "g" || unit === "kg" || (food.liquid && (unit === "ml" || unit === "L"));
  if (!weightUnits || food.kcal == null) {
    return {
      note: weightUnits
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
  const grams = unit === "kg" || unit === "L" ? quantity * 1000 : quantity;
  if (!(grams > 0)) {
    return {
      note: "Informe uma quantidade maior que zero para calcular a referência.",
      draft: makeFood({
        id: crypto.randomUUID(),
        name: food.name,
        quantity: 1,
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
