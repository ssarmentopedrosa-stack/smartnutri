import { TACO_FOODS, TACO_SOURCE, type TacoFood } from "./taco";
import { fold, makeFood, round1, type FoodDraft } from "./domain";

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
  const factor = unit === "kg" || unit === "L" ? (quantity * 1000) / 100 : quantity / 100;
  const scale = (value: number | null, digits: 0 | 1) => {
    if (value == null) return null;
    const next = value * factor;
    return digits === 0 ? Math.round(next) : round1(next);
  };
  return {
    note:
      food.liquid && (unit === "ml" || unit === "L")
        ? `Referência ${TACO_SOURCE}, por 100 g. Para líquido, 1 ml foi tratado como 1 g — uma aproximação.`
        : `Referência ${TACO_SOURCE}, por 100 g. A porção é a que você informou.`,
    draft: makeFood({
      id: crypto.randomUUID(),
      name: food.name,
      quantity,
      unit,
      calories: scale(food.kcal, 0),
      protein: scale(food.protein, 1),
      carbohydrates: scale(food.carbs, 1),
      fat: scale(food.fat, 1),
      fiber: scale(food.fiber, 1),
      source: "taco",
      dataStatus: "reference",
    }),
  };
}
