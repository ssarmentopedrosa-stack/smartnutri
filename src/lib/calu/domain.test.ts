import assert from "node:assert/strict";
import test from "node:test";
import {
  CALORIE_FLOOR,
  estimateGoals,
  extractJson,
  localInsight,
  makeFood,
  parseAnalysis,
  recommend,
  safetyReply,
  sumFoods,
  withQuantity,
  GUILT_PATTERN,
  summarizeHistory,
} from "./domain.ts";

test("soma e escala a partir da base, sem drift", () => {
  const rice = makeFood({
    id: "1",
    name: "Arroz",
    quantity: 150,
    unit: "g",
    calories: 192,
    protein: 3.8,
    carbohydrates: 42,
    fat: 0.4,
    fiber: 0.6,
    source: "ai",
    dataStatus: "estimate",
  });
  const doubled = withQuantity(rice, 300);
  assert.equal(doubled.calories, 384);
  assert.equal(doubled.protein, 7.6);
  const back = withQuantity(doubled, 150);
  assert.equal(back.calories, 192);
  const total = sumFoods([rice, doubled]);
  assert.equal(total.calories, 576);
  assert.equal(total.incomplete, false);
});

test("item sem dado marca o total como parcial", () => {
  const food = makeFood({
    id: "2",
    name: "Molho",
    quantity: 1,
    unit: "porção",
    calories: null,
    protein: null,
    carbohydrates: null,
    fat: null,
    fiber: null,
    source: "user",
    dataStatus: "unavailable",
  });
  assert.equal(sumFoods([food]).incomplete, true);
  assert.equal(sumFoods([food]).calories, 0);
});

test("meta estimada nunca fica abaixo do piso", () => {
  const tiny = estimateGoals({
    age: 60,
    sex: "feminino",
    heightCm: 150,
    weightKg: 45,
    goal: "controlar",
    activity: "sedentario",
  });
  assert.ok(tiny.targets.calories >= CALORIE_FLOOR);
  assert.match(tiny.note, /não substitui/i);
  const generic = estimateGoals({
    age: null,
    sex: "nao_informar",
    heightCm: null,
    weightKg: null,
    goal: "acompanhar",
    activity: "leve",
  });
  assert.equal(generic.personal, false);
});

test("json da análise aceita cerca e recusa lixo", () => {
  const parsed = parseAnalysis(
    extractJson(
      '```json\n{"mealType":"lunch","foods":[{"name":"Feijão","estimatedQuantity":120,"unit":"g","confidence":0.7,"calories":91,"protein":5.8,"carbohydrates":16.3,"fat":0.6,"fiber":10.2}],"uncertainties":["Porção estimada."],"insight":"Estimativa."}\n```',
    ),
  );
  assert.ok(parsed);
  assert.equal(parsed?.foods[0]?.name, "Feijão");
  assert.equal(parsed?.mealType, "lunch");
  assert.equal(parseAnalysis(extractJson("não é json")), null);
});

test("insight local e recomendação não culpam nem furam dieta", () => {
  const insight = localInsight({
    totals: sumFoods([]),
    goals: estimateGoals({
      age: 30,
      sex: "masculino",
      heightCm: 175,
      weightKg: 75,
      goal: "manter",
      activity: "moderado",
    }).targets,
    waterMl: 0,
    mealCount: 0,
    hour: 12,
  });
  assert.equal(GUILT_PATTERN.test(insight), false);
  const vegan = recommend({
    diet: "vegano",
    totals: { calories: 400, protein: 10, carbohydrates: 40, fat: 10, fiber: 4, incomplete: false },
    goals: { calories: 2200, protein: 120, carbohydrates: 240, fat: 70, fiber: 30, waterMl: 2500 },
    mealTypes: ["lunch"],
    memory: ["Não gosta de peixe"],
  });
  assert.ok(vegan);
  assert.doesNotMatch(vegan ?? "", /frango|ovo|iogurte|peixe/i);
});

test("segurança clínica não chama a IA", () => {
  assert.match(safetyReply("qual remédio eu tomo para anemia?") ?? "", /profissional de saúde/);
  assert.equal(safetyReply("comi arroz e feijão"), null);
});

test("resumo da semana não vira nota", () => {
  const summary = summarizeHistory({
    span: 7,
    meals: [
      { day: "2026-10-01", calories: 1800, protein: 90 },
      { day: "2026-10-02", calories: 2000, protein: 100 },
    ],
    waterByDay: [{ day: "2026-10-01", ml: 2000 }],
  });
  assert.equal(summary.recordedDays, 2);
  assert.match(summary.narrative, /2 dos últimos 7/);
  assert.equal(GUILT_PATTERN.test(summary.narrative), false);
});
