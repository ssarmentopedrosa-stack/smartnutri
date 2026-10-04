import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { makeFood, sumFoods } from "./domain.ts";
import { authorizeRecordedFood } from "./authority.ts";
import { suggestSubstitutes } from "./catalog.ts";
import {
  buildDailyBoard,
  contextHash,
  foodRecordState,
  insightContext,
  localDailyNote,
  nutrientProgress,
  parseDailyInsight,
  rescaleRecordedFood,
} from "./daily-board.ts";
import { calculateNutrition, toGrams } from "./nutrition.ts";
import { normalizeOffProduct } from "./off.ts";
import { lookupPortion } from "./portions.ts";
import { canonicalOperation } from "./pricing.ts";
import { resolveFoodName } from "./resolver.ts";
import { splitImagePayload } from "./ai.server.ts";
import { TACO_FOODS } from "./taco.ts";
import { assertNotFutureDay, parseNotificationEnabled } from "./validation.ts";

const GOALS = {
  calories: 2100,
  protein: 130,
  carbohydrates: 230,
  fat: 60,
  fiber: 25,
  waterMl: 2500,
};

test("catálogo de porções só usa a tabela conhecida", () => {
  assert.equal(lookupPortion("Arroz, tipo 1, cozido", "colher de sopa")?.grams, 25);
  assert.equal(lookupPortion("arroz", "xícara")?.grams, 160);
  assert.equal(lookupPortion("arroz", "xicara")?.grams, 160);
  assert.equal(lookupPortion("arroz", "colher de chá"), null);
  assert.equal(lookupPortion("Feijão, carioca, cozido", "concha")?.grams, 80);
  assert.equal(lookupPortion("Feijão, carioca, cozido", "colher de sopa")?.grams, 20);
  assert.equal(lookupPortion("Feijão, carioca, cozido", "xícara")?.grams, 140);
  assert.equal(lookupPortion("Banana, prata, crua", "unidade")?.grams, 70);
  assert.equal(toGrams("Ovo, de galinha, inteiro, cozido/10minutos", 2, "unidade"), 100);
  assert.equal(toGrams("Pão, trigo, francês", 1, "unidade"), 50);
  assert.equal(toGrams("Pão, trigo, forma, integral", 1, "fatia"), 25);
  assert.equal(toGrams("Maçã, Fuji, com casca, crua", 1, "unidade"), 130);
  assert.equal(toGrams("Laranja, baía, crua", 1, "unidade"), 150);
  assert.equal(toGrams("Açúcar, refinado", 1, "colher"), 12);
  assert.equal(toGrams("Azeite, de oliva, extra virgem", 1, "colher de sopa"), 8);
  assert.equal(toGrams("Aveia, flocos, crua", 1, "colher de sopa"), 10);
  assert.equal(toGrams("Aveia, flocos, crua", 1, "xícara"), 30);
  assert.equal(toGrams("Leite, de vaca, integral", 1, "xícara"), 200);
  assert.equal(toGrams("Leite, de vaca, integral", 1, "copo", true), 200);
  assert.equal(toGrams("Arroz, tipo 1, cozido", 1, "colher de chá"), null);
  assert.equal(lookupPortion("molho da casa", "colher de sopa"), null);
});

test("data passada e de hoje passam; data futura é recusada no servidor", () => {
  assert.equal(assertNotFutureDay("2026-10-02", "2026-10-03"), "2026-10-02");
  assert.equal(assertNotFutureDay("2026-10-03", "2026-10-03"), "2026-10-03");
  assert.throws(() => assertNotFutureDay("2026-10-04", "2026-10-03"), /Data futura não pode ser registrada/);
});

test("notificação aceita true e false e recusa o resto", () => {
  assert.equal(parseNotificationEnabled(true), true);
  assert.equal(parseNotificationEnabled(false), false);
  assert.throws(() => parseNotificationEnabled("sim"), /ligadas ou desligadas/);
  assert.throws(() => parseNotificationEnabled("false"), /ligadas ou desligadas/);
  assert.throws(() => parseNotificationEnabled(0), /ligadas ou desligadas/);
  assert.throws(() => parseNotificationEnabled(null), /ligadas ou desligadas/);
});

test("150 g de arroz, 100 g de feijão e 120 g de frango somam pelo motor", () => {
  const plate = [
    { name: "arroz branco cozido", grams: 150, calories: 192 },
    { name: "feijao carioca", grams: 100, calories: 76 },
    { name: "frango grelhado", grams: 120, calories: 191 },
  ].map((item) => {
    const resolved = resolveFoodName(item.name);
    assert.equal(resolved.source, "TACO");
    assert.ok(resolved.per100);
    const nutrients = calculateNutrition(resolved.per100!, item.grams);
    assert.equal(nutrients.calories, item.calories);
    return makeFood({
      id: crypto.randomUUID(),
      name: resolved.name,
      quantity: item.grams,
      unit: "g",
      calories: nutrients.calories,
      protein: nutrients.protein,
      carbohydrates: nutrients.carbohydrates,
      fat: nutrients.fat,
      fiber: nutrients.fiber,
      source: "taco",
      dataStatus: "reference",
    });
  });
  const total = sumFoods(plate);
  assert.equal(total.calories, 459);
  assert.equal(total.incomplete, true);
  assert.ok(total.protein > 0);
});

test("progresso usa a meta real e não inventa alvo", () => {
  const calories = nutrientProgress(1420, 2100);
  assert.equal(calories.consumed, 1420);
  assert.equal(calories.target, 2100);
  assert.equal(calories.remaining, 680);
  assert.equal(calories.percentage, 68);
  const missing = nutrientProgress(40, null);
  assert.equal(missing.target, null);
  assert.equal(missing.remaining, null);
  assert.equal(missing.percentage, null);
  assert.equal(nutrientProgress(40, 0).percentage, null);
  const board = buildDailyBoard({
    day: "2026-10-03",
    hour: 15,
    qualitative: true,
    mealCount: 1,
    calories: 400,
    protein: 20,
    carbohydrates: 40,
    fat: 10,
    fiber: 4,
    waterMl: 500,
    targets: GOALS,
    incompleteItems: 0,
  });
  assert.equal(board.calories.target, null);
  assert.match(board.note, /não está configurada/);
  const morning = localDailyNote({
    mealCount: 1,
    hour: 10,
    qualitative: false,
    calories: nutrientProgress(400, 2100),
    protein: nutrientProgress(20, 130),
    incompleteItems: 0,
  });
  assert.match(morning, /restante do dia/);
  assert.doesNotMatch(morning, /fracass|exager|errado|não atingiu/i);
});

test("registro incompleto não vira zero e insight inválido não entra no cache", () => {
  const base = {
    protein: 1,
    carbohydrates: 1,
    fat: 1,
    dataStatus: "reference" as const,
    nutritionSource: "TACO" as const,
  };
  assert.equal(foodRecordState({ ...base, calories: null }), "UNKNOWN");
  assert.equal(foodRecordState({ ...base, calories: 100, review: "low" }), "NEEDS_CONFIRMATION");
  assert.equal(foodRecordState({ ...base, calories: 100, dataStatus: "estimate" }), "PARTIAL");
  assert.equal(
    foodRecordState({ calories: 80, protein: null, carbohydrates: 10, fat: 2, dataStatus: "reference", nutritionSource: "OPEN_FOOD_FACTS" }),
    "PARTIAL",
  );
  assert.equal(foodRecordState({ ...base, calories: 100, review: "high" }), "CONFIRMED");
  assert.equal(parseDailyInsight("Seu consumo de proteína ainda está abaixo da meta de hoje."), "Seu consumo de proteína ainda está abaixo da meta de hoje.");
  assert.equal(parseDailyInsight("Você exagerou no almoço."), null);
  assert.equal(parseDailyInsight("curto"), null);
  assert.equal(canonicalOperation("dailyInsight"), "COACH");
});

test("contexto do insight não leva e-mail e o hash só muda com o dia", () => {
  const board = buildDailyBoard({
    day: "2026-10-03",
    hour: 11,
    qualitative: false,
    mealCount: 2,
    calories: 1420,
    protein: 92,
    carbohydrates: 155,
    fat: 43,
    fiber: 18,
    waterMl: 1500,
    targets: GOALS,
    incompleteItems: 1,
  });
  const payload = insightContext(board);
  const json = JSON.stringify(payload);
  assert.equal(json.includes("email"), false);
  assert.equal(json.includes("nome"), false);
  assert.equal(json.includes("@"), false);
  assert.equal(payload.calories.consumed, 1420);
  assert.equal(payload.water.consumedMl, 1500);
  const hash = contextHash(json);
  assert.equal(contextHash(JSON.stringify(insightContext(board))), hash);
  const later = buildDailyBoard({
    day: "2026-10-03",
    hour: 20,
    qualitative: false,
    mealCount: 3,
    calories: 1800,
    protein: 92,
    carbohydrates: 155,
    fat: 43,
    fiber: 18,
    waterMl: 1500,
    targets: GOALS,
    incompleteItems: 1,
  });
  assert.notEqual(contextHash(JSON.stringify(insightContext(later))), hash);
});

test("substituto é alimento TACO e repetir não reaproveita o cálculo de outra unidade", () => {
  const swaps = suggestSubstitutes("arroz");
  assert.ok(swaps.length > 0 && swaps.length <= 3);
  assert.equal(
    swaps.every((food) => TACO_FOODS.some((item) => item.id === food.id && item.kcal != null)),
    true,
  );
  assert.equal(
    swaps.some((food) => food.name === "Arroz, tipo 1, cozido"),
    false,
  );
  const rice = makeFood({
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    name: "Arroz, tipo 1, cozido",
    quantity: 100,
    unit: "g",
    calories: 128,
    protein: 2.5,
    carbohydrates: 28.1,
    fat: 0.2,
    fiber: 1.6,
    source: "taco",
    dataStatus: "reference",
  });
  const doubled = rescaleRecordedFood(rice, 200, "g");
  assert.equal(doubled.calories, 256);
  assert.equal(doubled.quantity, 200);
  assert.notEqual(doubled, rice);
  const changed = rescaleRecordedFood({ ...rice, id: "cccccccc-cccc-cccc-cccc-cccccccccccc" }, 2, "colher de sopa");
  assert.equal(changed.calories, null);
  assert.equal(changed.protein, null);
  assert.equal(changed.dataStatus, "unavailable");
  assert.notEqual(changed.id, rice.id);
});

test("Gemini recebe o MIME da imagem, não força jpeg", () => {
  assert.deepEqual(splitImagePayload("data:image/png;base64,iVBOR"), { mime: "image/png", data: "iVBOR" });
  assert.deepEqual(splitImagePayload("data:image/jpeg;base64,/9j/"), { mime: "image/jpeg", data: "/9j/" });
  assert.deepEqual(splitImagePayload("data:image/jpg;base64,/9j/"), { mime: "image/jpeg", data: "/9j/" });
  assert.deepEqual(splitImagePayload("data:image/webp;base64,UklGR"), { mime: "image/webp", data: "UklGR" });
});

test("o servidor não persiste macros arbitrários quando a TACO resolve o alimento", () => {
  const lied = makeFood({
    id: "11111111-1111-4111-8111-111111111111",
    name: "arroz",
    quantity: 150,
    unit: "g",
    calories: 1,
    protein: 999,
    carbohydrates: 999,
    fat: 999,
    fiber: 999,
    source: "user",
    dataStatus: "reference",
  });
  const saved = authorizeRecordedFood(lied, { fromClient: true });
  assert.equal(saved.calories, 192);
  assert.equal(saved.protein, 3.8);
  assert.equal(saved.carbohydrates, 42.2);
  assert.equal(saved.fat, 0.3);
  assert.equal(saved.fiber, 2.4);
  assert.equal(saved.nutritionSource, "TACO");
  assert.equal(saved.name, "Arroz, tipo 1, cozido");
  assert.notEqual(saved.protein, 999);

  const onlyCalories = authorizeRecordedFood({ ...saved, calories: 1, protein: 999, fat: 999 }, { fromClient: true });
  assert.equal(onlyCalories.calories, 192);
  assert.equal(onlyCalories.quantity, 150);
  assert.equal(onlyCalories.protein, 3.8);
});

test("unidade sem base em gramas não inventa conversão", () => {
  const food = makeFood({
    id: "22222222-2222-4222-8222-222222222222",
    name: "arroz",
    quantity: 2,
    unit: "porção",
    calories: 400,
    protein: 20,
    carbohydrates: 40,
    fat: 10,
    fiber: 4,
    source: "taco",
    dataStatus: "reference",
  });
  food.nutritionSource = "TACO";
  const saved = authorizeRecordedFood(food, { fromClient: true });
  assert.equal(saved.calories, null);
  assert.equal(saved.protein, null);
  assert.equal(saved.fat, null);
  assert.equal(saved.review, "low");
  assert.equal(saved.dataStatus, "unavailable");
  assert.notEqual(foodRecordState(saved), "CONFIRMED");
  assert.equal(toGrams("Arroz, tipo 1, cozido", 2, "porção"), null);
});

test("alimento TACO conhecido passa pelo resolver e pelo motor", () => {
  const resolved = resolveFoodName("Arroz, tipo 1, cozido");
  assert.equal(resolved.source, "TACO");
  assert.ok(resolved.per100);
  const expected = calculateNutrition(resolved.per100!, 150);
  const saved = authorizeRecordedFood(
    makeFood({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Arroz, tipo 1, cozido",
      quantity: 150,
      unit: "g",
      calories: 1,
      protein: 1,
      carbohydrates: 1,
      fat: 1,
      fiber: 1,
      source: "taco",
      dataStatus: "estimate",
    }),
    { fromClient: true },
  );
  assert.equal(saved.calories, expected.calories);
  assert.equal(saved.protein, expected.protein);
  assert.equal(saved.carbohydrates, expected.carbohydrates);
  assert.equal(saved.fat, expected.fat);
  assert.equal(saved.fiber, expected.fiber);
  assert.equal(saved.nutritionSource, "TACO");
  assert.equal(foodRecordState(saved), "CONFIRMED");
});

test("Open Food Facts completo é recalculado e o incompleto não é preenchido", () => {
  const complete = normalizeOffProduct({
    status: 1,
    product: {
      product_name: "Iogurte teste calu",
      serving_quantity: 100,
      nutriments: {
        "energy-kcal_100g": 80,
        proteins_100g: 4,
        carbohydrates_100g: 6,
        fat_100g: 3,
        fiber_100g: 0,
      },
    },
  });
  assert.equal("error" in complete, false);
  if ("error" in complete) return;
  const saved = authorizeRecordedFood(
    makeFood({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Iogurte teste calu",
      quantity: 200,
      unit: "g",
      calories: 1,
      protein: 999,
      carbohydrates: 999,
      fat: 999,
      fiber: 999,
      source: "barcode",
      dataStatus: "reference",
    }),
    { fromClient: true, off: complete },
  );
  assert.equal(saved.calories, 160);
  assert.equal(saved.protein, 8);
  assert.equal(saved.carbohydrates, 12);
  assert.equal(saved.fat, 6);
  assert.equal(saved.fiber, 0);
  assert.equal(saved.nutritionSource, "OPEN_FOOD_FACTS");
  assert.equal(foodRecordState(saved), "CONFIRMED");

  const partial = normalizeOffProduct({
    status: 1,
    product: {
      product_name: "Barra teste calu",
      serving_quantity: 50,
      nutriments: { "energy-kcal_100g": 200 },
    },
  });
  assert.equal("error" in partial, false);
  if ("error" in partial) return;
  assert.equal(partial.completeness, "partial");
  const half = authorizeRecordedFood(
    makeFood({
      id: "55555555-5555-4555-8555-555555555555",
      name: "Barra teste calu",
      quantity: 50,
      unit: "g",
      calories: 999,
      protein: 50,
      carbohydrates: 50,
      fat: 50,
      fiber: 50,
      source: "barcode",
      dataStatus: "reference",
    }),
    { fromClient: true, off: partial },
  );
  assert.equal(half.calories, 100);
  assert.equal(half.protein, null);
  assert.equal(half.carbohydrates, null);
  assert.equal(half.fat, null);
  assert.equal(foodRecordState(half), "PARTIAL");

  const missing = normalizeOffProduct({
    status: 1,
    product: { product_name: "Sem rotulo calu", nutriments: {} },
  });
  assert.equal("error" in missing, false);
  if ("error" in missing) return;
  const empty = authorizeRecordedFood(
    makeFood({
      id: "66666666-6666-4666-8666-666666666666",
      name: "Sem rotulo calu",
      quantity: 100,
      unit: "g",
      calories: 400,
      protein: 10,
      carbohydrates: 10,
      fat: 10,
      fiber: 1,
      source: "barcode",
      dataStatus: "reference",
    }),
    { fromClient: true, off: missing },
  );
  assert.equal(empty.calories, null);
  assert.equal(empty.protein, null);
  assert.notEqual(foodRecordState(empty), "CONFIRMED");

  const stored = makeFood({
    id: "77777777-7777-4777-8777-777777777777",
    name: "Iogurte teste calu",
    quantity: 100,
    unit: "g",
    calories: 80,
    protein: 4,
    carbohydrates: 6,
    fat: 3,
    fiber: 0,
    source: "barcode",
    dataStatus: "reference",
  });
  stored.nutritionSource = "OPEN_FOOD_FACTS";
  const edited = authorizeRecordedFood({ ...stored, calories: 1, protein: 999, fat: 999, quantity: 100 }, { fromClient: true, stored });
  assert.equal(edited.calories, 80);
  assert.equal(edited.protein, 4);
  assert.equal(edited.fat, 3);
});

test("valores autorizados é que seguem para a tabela, não os do cliente", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  for (const name of ["0001_auth.sql", "0002_calu.sql", "0003_v21.sql", "0004_v22.sql", "0005_v31.sql"]) {
    await pg.exec(readFileSync(new URL(`../../../migrations/${name}`, import.meta.url), "utf8"));
  }
  const saved = authorizeRecordedFood(
    makeFood({
      id: "88888888-8888-4888-8888-888888888888",
      name: "arroz",
      quantity: 150,
      unit: "g",
      calories: 1,
      protein: 999,
      carbohydrates: 999,
      fat: 999,
      fiber: 999,
      source: "user",
      dataStatus: "reference",
    }),
    { fromClient: true },
  );
  const mealId = "99999999-9999-4999-8999-999999999999";
  await pg.query(
    `insert into meals (id, user_id, day, meal_type, eaten_at, source, calories, protein, carbohydrates, fat, fiber, incomplete)
     values ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9, $10, $11)`,
    [mealId, "user-a", "2026-10-03", "lunch", "manual", saved.calories, saved.protein, saved.carbohydrates, saved.fat, saved.fiber, false],
  );
  await pg.query(
    `insert into food_items (
      id, meal_id, user_id, name, quantity, unit, calories, protein, carbohydrates, fat, fiber,
      source, data_status, base_quantity, base_calories, base_protein, base_carbohydrates, base_fat, base_fiber, nutrition_source
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      saved.id,
      mealId,
      "user-a",
      saved.name,
      saved.quantity,
      saved.unit,
      saved.calories,
      saved.protein,
      saved.carbohydrates,
      saved.fat,
      saved.fiber,
      saved.source,
      saved.dataStatus,
      saved.baseQuantity,
      saved.baseCalories,
      saved.baseProtein,
      saved.baseCarbohydrates,
      saved.baseFat,
      saved.baseFiber,
      saved.nutritionSource,
    ],
  );
  const row = await pg.query<{ calories: number; protein: number; name: string }>(`select calories, protein, name from food_items where id = $1`, [saved.id]);
  assert.equal(Number(row.rows[0]?.calories), 192);
  assert.notEqual(Number(row.rows[0]?.protein), 999);
  assert.equal(row.rows[0]?.name, "Arroz, tipo 1, cozido");
  const api = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../../routes/registrar.tsx", import.meta.url), "utf8");
  assert.match(api, /authorizeRecordedFood/);
  const manualAt = screen.indexOf("Cadastrar manualmente");
  const formEnd = screen.lastIndexOf("</form>", manualAt);
  assert.ok(manualAt > formEnd);
  assert.match(screen.slice(formEnd, manualAt), /href="\/registrar\?modo=codigo&manual=true"/);
  assert.match(screen.slice(formEnd, manualAt), /role="button"/);
});

test("migration 0005 cria o cache e não apaga refeição antiga", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  for (const name of ["0001_auth.sql", "0002_calu.sql", "0003_v21.sql", "0004_v22.sql"]) {
    await pg.exec(readFileSync(new URL(`../../../migrations/${name}`, import.meta.url), "utf8"));
  }
  await pg.query(
    `insert into meals (id, user_id, day, meal_type, eaten_at, source) values ($1, $2, $3, $4, now(), $5)`,
    ["dddddddd-dddd-dddd-dddd-dddddddddddd", "user-a", "2026-10-01", "lunch", "manual"],
  );
  const sql = readFileSync(new URL("../../../migrations/0005_v31.sql", import.meta.url), "utf8");
  await pg.exec(sql);
  await pg.exec(sql);
  const meals = await pg.query(`select id from meals where user_id = $1`, ["user-a"]);
  assert.equal(meals.rows.length, 1);
  await pg.query(
    `insert into daily_insights (user_id, day, context_hash, text) values ($1, $2, $3, $4)`,
    ["user-a", "2026-10-03", "abc", "O dia está registrado."],
  );
  const cached = await pg.query<{ text: string }>(`select text from daily_insights where user_id = $1`, ["user-a"]);
  assert.equal(cached.rows[0]?.text, "O dia está registrado.");
});
