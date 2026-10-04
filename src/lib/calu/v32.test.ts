import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db.ts";
import { canonicalOperation } from "./pricing.ts";
import { RATE_LIMITS } from "./rate-limit.ts";
import { ensureUsageSql, reserveQuotaSql } from "./quota.ts";
import { hitRateLimit } from "./ops.ts";
import { dayKeyInTimeZone, hourInTimeZone } from "./timezone.ts";
import {
  buildCoachContext,
  clientNutritionIgnored,
  coachContextForModel,
  contextHasPrivateKeys,
  scopedUserId,
  type CoachContext,
  type CoachContextInput,
  type CoachHistoryDay,
} from "./coach-context.ts";
import {
  COACH_UNAVAILABLE,
  decideCoach,
  fallbackCoachAnswer,
  parseCoachAsk,
  parseCoachReply,
  resolveCoachAsk,
  type CoachAnswer,
} from "./daily-coach.ts";

const GOALS = { calories: 2100, protein: 120, carbohydrates: 230, fat: 70, fiber: 25, waterMl: 2500 };

function today(partial: Partial<CoachContextInput["today"]> = {}): CoachContextInput["today"] {
  return {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    waterMl: 0,
    mealCount: 0,
    incompleteItems: 0,
    weightKg: null,
    habitsDone: 0,
    habitsTotal: 0,
    ...partial,
  };
}

function make(partial: Partial<CoachContextInput> = {}): CoachContext {
  return buildCoachContext({
    date: "2026-10-03",
    timezone: "America/Sao_Paulo",
    hour: 18,
    qualitative: false,
    tracksWeight: false,
    goals: GOALS,
    historyDays: [],
    ...partial,
    today: today(partial.today),
  });
}

test("contexto do coach não leva dado privado e ignora o cliente", () => {
  assert.equal(scopedUserId("user-a", { userId: "user-b", nutritionSummary: { calories: 1 } }), "user-a");
  assert.equal(clientNutritionIgnored(192, 999), 192);
  const ctx = make({
    today: today({ calories: 192, protein: 4, mealCount: 1, waterMl: 200 }),
  });
  const payload = coachContextForModel(ctx);
  assert.equal(contextHasPrivateKeys(payload), false);
  assert.equal(JSON.stringify(payload).includes("user-a"), false);
  assert.equal(JSON.stringify(payload).includes("email"), false);
  const asked = parseCoachAsk({
    day: "2026-10-03",
    question: "Como estou hoje?",
    userId: "user-b",
    nutritionSummary: { calories: 9999 },
  });
  assert.deepEqual(asked, { day: "2026-10-03", question: "Como estou hoje?" });
});

test("hoje usa o fuso do perfil, não o dia UTC", () => {
  const instant = new Date("2026-10-04T02:30:00Z");
  const day = dayKeyInTimeZone(instant, "America/Sao_Paulo");
  const hour = hourInTimeZone(instant, "America/Sao_Paulo");
  assert.equal(day, "2026-10-03");
  assert.equal(hour, 23);
  const ctx = make({ date: day, hour, timezone: "America/Sao_Paulo" });
  assert.equal(ctx.date, "2026-10-03");
  assert.notEqual(ctx.date, instant.toISOString().slice(0, 10));
});

test("estados do coach e a prioridade de um único ponto", () => {
  const none = decideCoach(make());
  assert.equal(none.state, "NO_DATA");
  assert.match(none.title, /dados suficientes/);
  assert.equal(none.action, "meal");

  const incomplete = decideCoach(make({ today: today({ mealCount: 1, incompleteItems: 2, waterMl: 100, calories: 400, protein: 10 }) }));
  assert.equal(incomplete.state, "INCOMPLETE");
  assert.match(incomplete.reason, /2 registros/);
  assert.doesNotMatch(incomplete.message, /aumentar a ingestão de água/);

  const early = decideCoach(make({ hour: 11, today: today({ mealCount: 1, calories: 500, protein: 30, waterMl: 300 }) }));
  assert.equal(early.state, "ON_TRACK");
  assert.match(early.message, /Ainda dá tempo de registrar água/);

  const water = decideCoach(make({ today: today({ mealCount: 2, calories: 1600, protein: 100, waterMl: 400 }) }));
  assert.equal(water.state, "NEEDS_ATTENTION");
  assert.match(water.message, /aumentar a ingestão de água/);
  assert.match(water.reason, /400 ml/);
  assert.match(water.reason, /2,5 L/);
  assert.equal(water.action, "water");

  const protein = decideCoach(make({ today: today({ mealCount: 2, calories: 1500, protein: 40, waterMl: 2000 }) }));
  assert.equal(protein.state, "NEEDS_ATTENTION");
  assert.match(protein.message, /proteína/);
  assert.match(protein.reason, /40 g/);
  assert.match(protein.reason, /120 g/);

  const over = decideCoach(make({ hour: 20, today: today({ mealCount: 3, calories: 2500, protein: 110, waterMl: 2200 }) }));
  assert.equal(over.state, "NEEDS_ATTENTION");
  assert.match(over.reason, /2500 kcal/);
  assert.match(over.reason, /2100 kcal/);
  assert.doesNotMatch(`${over.title} ${over.message} ${over.reason}`, /compensa|jejum|fracass/i);

  const great = decideCoach(
    make({ today: today({ mealCount: 3, calories: 1900, protein: 100, waterMl: 2200, habitsDone: 2, habitsTotal: 2 }) }),
  );
  assert.equal(great.state, "GREAT");
  assert.match(great.title, /muito bem encaminhado/);
  assert.match(great.message, /hábitos marcados/);
  assert.equal(great.checks.filter((check) => check.ok === true).length, 3);
});

test("perfil qualitativo não compara meta calórica adulta", () => {
  const ctx = make({
    qualitative: true,
    today: today({ mealCount: 2, calories: 4000, protein: 10, waterMl: 2200 }),
  });
  assert.equal(ctx.goals.calories, null);
  assert.equal(ctx.goals.protein, null);
  assert.equal(ctx.goals.waterMl, 2500);
  const card = decideCoach(ctx);
  assert.notEqual(card.state, "NEEDS_ATTENTION");
  assert.doesNotMatch(card.reason, /4000 kcal/);
});

test("tendência de 7 dias usa só o que foi registrado", () => {
  const days: CoachHistoryDay[] = [
    { day: "2026-09-27", calories: 1800, protein: 130, waterMl: 400, meals: 1, weightKg: 70 },
    { day: "2026-09-28", calories: 1800, protein: 130, waterMl: 400, meals: 1, weightKg: 70 },
    { day: "2026-09-29", calories: 1800, protein: 50, waterMl: 400, meals: 1, weightKg: 70.1 },
    { day: "2026-09-30", calories: 1800, protein: 130, waterMl: 900, meals: 1, weightKg: 70 },
    { day: "2026-10-01", calories: 1800, protein: 130, waterMl: 900, meals: 1, weightKg: null },
    { day: "2026-10-02", calories: 1800, protein: 130, waterMl: 900, meals: 1, weightKg: null },
    { day: "2026-10-03", calories: 1900, protein: 40, waterMl: 400, meals: 2, weightKg: null },
  ];
  const ctx = make({ historyDays: days, today: today({ mealCount: 2, calories: 1900, protein: 100, waterMl: 2200 }) });
  assert.equal(ctx.history.recordedDays, 7);
  assert.equal(ctx.history.proteinDaysMet, 5);
  assert.match(ctx.history.proteinTrendText ?? "", /5 dos últimos 7 dias/);
  assert.equal(ctx.history.waterTrend, "up");
  assert.match(ctx.history.waterTrendText ?? "", /melhorou nos últimos 3 dias/);
  assert.match(ctx.history.weightText ?? "", /permaneceu estável/);
  const week = resolveCoachAsk({ context: ctx, question: "Como foi minha semana?" });
  assert.equal(week.phase, "done");
  if (week.phase !== "done") return;
  assert.equal(week.answer.source, "rules");
  assert.match(week.answer.message, /Na janela de 7 dias/);
  assert.match(week.answer.message, /5 dos últimos 7 dias/);
});

test("pergunta direta não inventa número e não chama modelo", () => {
  const ctx = make({ today: today({ mealCount: 1, calories: 192, protein: 4.2, waterMl: 200 }) });
  const step = resolveCoachAsk({ context: ctx, question: "Como está minha proteína? Eu acho que foram 999 g." });
  assert.equal(step.phase, "done");
  if (step.phase !== "done") return;
  assert.equal(step.answer.source, "rules");
  assert.match(step.answer.message, /4,2 g/);
  assert.equal(step.answer.message.includes("999"), false);
  const out = resolveCoachAsk({ context: ctx, question: "Qual medicamento para emagrecer com jejum?" });
  assert.equal(out.phase, "done");
  if (out.phase !== "done") return;
  assert.equal(out.answer.source, "scope");
  assert.match(out.answer.message, /Não posso orientar/);
});

test("ia inválida, indisponível, cache e invalidação", () => {
  const ctx = make({ today: today({ mealCount: 2, calories: 1900, protein: 100, waterMl: 2200 }) });
  const question = "Pode explicar com detalhes o conjunto destes registros?";
  const first = resolveCoachAsk({ context: ctx, question });
  assert.equal(first.phase, "call");
  const failed = resolveCoachAsk({ context: ctx, question, modelFailed: true });
  assert.equal(failed.phase, "done");
  if (failed.phase !== "done") return;
  assert.equal(failed.answer.source, "fallback");
  assert.equal(failed.answer.message, COACH_UNAVAILABLE);
  assert.doesNotMatch(failed.answer.message, /Gemini|quota|500/);
  assert.match(failed.answer.support, /proteína|água|refeição|energia|registrar/i);

  const invented = parseCoachReply(
    { title: "Olha só isso", message: "Você comeu 9999 kcal hoje sem perceber.", action: "Ignorar", reason: "Porque eu inventei esse total agora.", severity: "low" },
    ctx,
  );
  assert.equal(invented, null);
  const unsafe = parseCoachReply(
    { title: "Diagnóstico do dia", message: "Isso parece uma doença alimentar grave.", action: "Procurar", reason: "Os registros de hoje somam 1900 kcal.", severity: "low" },
    ctx,
  );
  assert.equal(unsafe, null);
  const broken = resolveCoachAsk({ context: ctx, question, modelText: "não é json" });
  assert.equal(broken.phase, "done");
  if (broken.phase !== "done") return;
  assert.equal(broken.answer.source, "fallback");

  const model = JSON.stringify({
    title: "Seu dia está indo bem.",
    message: "Os registros de hoje somam 1900 kcal e 100 g de proteína.",
    action: "Manter o ritmo.",
    reason: "A água registrada é 2200 ml e a meta é 2500 ml.",
    severity: "low",
  });
  const saved = resolveCoachAsk({ context: ctx, question, modelText: model });
  assert.equal(saved.phase, "done");
  if (saved.phase !== "done" || !saved.store) return;
  assert.equal(saved.answer.source, "ai");
  const cached = resolveCoachAsk({
    context: ctx,
    question,
    cached: { contextHash: saved.store.contextHash, payload: saved.store.payload },
  });
  assert.equal(cached.phase, "done");
  if (cached.phase !== "done") return;
  assert.equal(cached.answer.source, "cache");
  const changed = make({ today: today({ mealCount: 2, calories: 1900, protein: 100, waterMl: 800 }) });
  const missed = resolveCoachAsk({
    context: changed,
    question,
    cached: { contextHash: saved.store.contextHash, payload: saved.store.payload },
  });
  assert.equal(missed.phase, "call");
  const keys = Object.keys(saved.answer);
  assert.equal(keys.includes("calories"), false);
  assert.equal(fallbackCoachAnswer(ctx).source, "fallback");
});

test("o diário não chama modelo e o coach não grava nutrição", () => {
  const api = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
  const home = api.slice(api.indexOf("export const getHome"), api.indexOf("export type HomeData"));
  assert.doesNotMatch(home, /generateDailyCoach|guardedAi/);
  const ask = api.slice(api.indexOf("export const askCoach"));
  assert.match(ask, /scopedUserId\(context\.userId/);
  assert.doesNotMatch(ask, /data\.userId|body\.userId/);
  assert.doesNotMatch(ask, /insert into meals|update meals|update goals/);
  assert.match(ask, /generateDailyCoach/);
  const screen = readFileSync(new URL("../../routes/diario.tsx", import.meta.url), "utf8");
  const card = readFileSync(new URL("../../components/calu/coach-card.tsx", import.meta.url), "utf8");
  assert.match(screen, /CoachCard/);
  assert.match(card, /Perguntar ao Coach/);
  assert.match(card, /Por que estou vendo isso/);
  assert.equal(canonicalOperation("dailyCoach"), "COACH");
  assert.equal(canonicalOperation("askCoach"), "COACH");
  assert.equal(RATE_LIMITS.askCoach, 8);
});

function asSql(queryable: { query: <T>(text: string, params?: unknown[]) => Promise<{ rows: T[] }> }): Sql {
  const sql = (async <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    const result = await queryable.query<T>(text, values);
    return result.rows as T[];
  }) as Sql;
  sql.query = async <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    (await queryable.query<T>(text, params)).rows as T[];
  sql.transaction = async (fn) => fn(sql);
  return sql;
}

test("migration 0006, isolamento, quota e rate limit do coach", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  for (const name of ["0001_auth.sql", "0002_calu.sql", "0003_v21.sql", "0004_v22.sql", "0005_v31.sql", "0006_v32.sql"]) {
    await pg.exec(readFileSync(new URL(`../../../migrations/${name}`, import.meta.url), "utf8"));
  }
  await pg.exec(readFileSync(new URL("../../../migrations/0006_v32.sql", import.meta.url), "utf8"));
  await pg.query(
    `insert into meals (id, user_id, day, meal_type, eaten_at, source) values ($1,$2,$3,$4,now(),$5)`,
    ["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "user-a", "2026-10-03", "lunch", "manual"],
  );
  await pg.query(
    `insert into coach_cache (user_id, day, question_hash, context_hash, payload) values ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)`,
    ["user-a", "2026-10-03", "q", "c", "{\"message\":\"somente a\"}", "user-b", "2026-10-03", "q", "c", "{\"message\":\"somente b\"}"],
  );
  const onlyA = await pg.query<{ payload: string }>(`select payload from coach_cache where user_id = $1`, ["user-a"]);
  assert.equal(onlyA.rows.length, 1);
  assert.equal(onlyA.rows[0]?.payload.includes("somente b"), false);
  const meals = await pg.query(`select id from meals where user_id = $1`, ["user-a"]);
  assert.equal(meals.rows.length, 1);

  const limit = 3;
  let acceptedQuota = 0;
  for (let i = 0; i < 5; i += 1) {
    const reserved = await pg.transaction(async (tx) => {
      await tx.query(ensureUsageSql(), ["user-a", "2026-10-03"]);
      const updated = await tx.query(reserveQuotaSql("text"), ["user-a", "2026-10-03", limit]);
      return updated.rows.length > 0;
    });
    if (reserved) acceptedQuota += 1;
  }
  assert.equal(acceptedQuota, limit);

  const sql = asSql(pg);
  let acceptedRate = 0;
  for (let i = 0; i < 10; i += 1) {
    const hit = await hitRateLimit(sql, "user-a", "askCoach", 1_700_000_000_000);
    if (hit.ok) acceptedRate += 1;
  }
  assert.equal(acceptedRate, RATE_LIMITS.askCoach);
  const stored = await pg.query<{ hits: number }>(`select hits from rate_limits where action = 'askCoach'`);
  assert.equal(Number(stored.rows[0]?.hits), RATE_LIMITS.askCoach);
});

test("resposta de fallback não altera o cartão determinístico", () => {
  const card = decideCoach(make({ today: today({ mealCount: 1, calories: 192, protein: 4, waterMl: 200 }) }));
  const answer: CoachAnswer = fallbackCoachAnswer(make({ today: today({ mealCount: 1, calories: 192, protein: 4, waterMl: 200 }) }));
  assert.equal(answer.action, card.action);
  assert.equal(answer.reason, card.reason);
  assert.equal(answer.message, COACH_UNAVAILABLE);
});
