import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { makeFood, sumFoods } from "./domain.ts";
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
