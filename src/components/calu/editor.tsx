import { Minus, Plus, Trash2 } from "lucide-react";
import { MEAL_TYPES, UNITS, formatQty, macroLine, mealLabel, quantityStep, sumFoods, withQuantity, commitDraft, type FoodDraft, type MealType } from "@/lib/calu/domain";
import { Button, controlClass } from "./chrome";

export function MealEditor({
  foods,
  mealType,
  onFoods,
  onMealType,
  uncertainties,
}: {
  foods: FoodDraft[];
  mealType: MealType;
  onFoods: (foods: FoodDraft[]) => void;
  onMealType: (type: MealType) => void;
  uncertainties: string[];
}) {
  const totals = sumFoods(foods);
  const update = (id: string, next: FoodDraft) => onFoods(foods.map((food) => (food.id === id ? next : food)));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">Tipo de refeição</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {MEAL_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => onMealType(type.id)}
              className={
                type.id === mealType
                  ? "h-10 shrink-0 rounded-full bg-primary px-3 text-sm text-primary-foreground"
                  : "h-10 shrink-0 rounded-full border border-border bg-card px-3 text-sm"
              }
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {foods.map((food) => {
          const step = quantityStep(food.unit);
          return (
            <article key={food.id} className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium">{food.name}</h3>
                  <p className="text-sm text-muted">
                    {food.dataStatus === "estimate"
                      ? "Estimativa"
                      : food.dataStatus === "reference"
                        ? "Referência"
                        : "Dados não disponíveis"}
                    {food.confidence != null ? ` · confiança ${Math.round(food.confidence * 100)}%` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remover ${food.name}`}
                  className="press grid size-11 place-items-center rounded-lg text-danger"
                  onClick={() => onFoods(foods.filter((item) => item.id !== food.id))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  className="press grid size-11 place-items-center rounded-lg border border-border"
                  onClick={() => update(food.id, withQuantity(food, food.quantity - step))}
                >
                  <Minus className="size-4" />
                </button>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Quantidade de {food.name}</span>
                  <input
                    inputMode="decimal"
                    className={controlClass + " text-center tabular-nums"}
                    value={String(food.quantity)}
                    onChange={(event) => {
                      const next = Number(event.target.value.replace(",", "."));
                      if (Number.isFinite(next)) update(food.id, withQuantity(food, next));
                    }}
                  />
                </label>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  className="press grid size-11 place-items-center rounded-lg border border-border"
                  onClick={() => update(food.id, withQuantity(food, food.quantity + step))}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <label className="mt-2 block">
                <span className="sr-only">Unidade</span>
                <select
                  className={controlClass}
                  value={food.unit}
                  onChange={(event) => update(food.id, commitDraft({ ...food, unit: event.target.value }))}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-3 text-sm tabular-nums text-muted">
                {macroLine(food.calories, "kcal")} · P {macroLine(food.protein, "g")} · C{" "}
                {macroLine(food.carbohydrates, "g")} · G {macroLine(food.fat, "g")}
              </p>
              <p className="text-sm tabular-nums text-subtle">Fibras {macroLine(food.fiber, "g")}</p>
            </article>
          );
        })}
      </div>

      {uncertainties.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted">
          {uncertainties.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <div className="rounded-3xl bg-foreground px-4 py-4 text-background">
        <p className="text-sm text-background/70">{mealLabel(mealType)}</p>
        <p className="mt-1 font-display text-3xl tabular-nums">{totals.calories} kcal</p>
        <p className="mt-1 text-sm text-background/80">
          Proteína {macroLine(totals.incomplete && totals.protein === 0 ? null : totals.protein, "g")} · Carboidrato{" "}
          {totals.carbohydrates} g · Gordura {totals.fat} g · Fibras {totals.fiber} g
        </p>
        {totals.incomplete ? (
          <p className="mt-2 text-sm text-background/70">O total é parcial: algum item está sem dados completos.</p>
        ) : (
          <p className="mt-2 text-sm text-background/70">Estimativa, não um valor exato.</p>
        )}
      </div>
      <p className="text-sm text-muted">Confira as quantidades antes de salvar. Você pode corrigir agora.</p>
      <p className="sr-only">{foods.map((food) => formatQty(food.quantity, food.unit)).join(", ")}</p>
    </div>
  );
}

export function AddFoodRow({ onAdd }: { onAdd: (food: FoodDraft) => void }) {
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={() =>
        onAdd(
          commitDraft({
            id: crypto.randomUUID(),
            name: "Novo alimento",
            quantity: 1,
            unit: "porção",
            calories: null,
            protein: null,
            carbohydrates: null,
            fat: null,
            fiber: null,
            confidence: null,
            source: "user",
            dataStatus: "unavailable",
            baseQuantity: 1,
            baseCalories: null,
            baseProtein: null,
            baseCarbohydrates: null,
            baseFat: null,
            baseFiber: null,
          }),
        )
      }
    >
      Adicionar alimento
    </Button>
  );
}
