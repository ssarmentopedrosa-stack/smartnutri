import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db.ts";
import { ensureUsageSql, reserveQuotaSql, releaseQuotaSql } from "./quota.ts";
import { HIT_RATE_SQL } from "./rate-limit.ts";
import { findOwnedMeal, wipeAuthIdentity, wipeUserData } from "./ops.ts";

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

async function database() {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(readFileSync(new URL("../../../migrations/0001_auth.sql", import.meta.url), "utf8"));
  await pg.exec(readFileSync(new URL("../../../migrations/0002_calu.sql", import.meta.url), "utf8"));
  await pg.exec(readFileSync(new URL("../../../migrations/0003_v21.sql", import.meta.url), "utf8"));
  return pg;
}

test("quota atômica não passa do limite sob concorrência", async () => {
  const pg = await database();
  const limit = 5;
  async function reserve() {
    return pg.transaction(async (tx) => {
      await tx.query(ensureUsageSql(), ["user-a", "2026-10-03"]);
      const updated = await tx.query(reserveQuotaSql("image"), ["user-a", "2026-10-03", limit]);
      return updated.rows.length > 0;
    });
  }
  const results = await Promise.all(Array.from({ length: 12 }, () => reserve()));
  assert.equal(results.filter(Boolean).length, limit);
  const left = await pg.query<{ image_count: number }>("select image_count from ai_usage where user_id = $1", ["user-a"]);
  assert.equal(Number(left.rows[0]?.image_count), limit);
});

test("falha de provedor devolve a reserva de quota", async () => {
  const pg = await database();
  await pg.query(ensureUsageSql(), ["user-a", "2026-10-03"]);
  await pg.query(reserveQuotaSql("text"), ["user-a", "2026-10-03", 20]);
  await pg.query(releaseQuotaSql("text"), ["user-a", "2026-10-03"]);
  const left = await pg.query<{ text_count: number }>("select text_count from ai_usage where user_id = $1", ["user-a"]);
  assert.equal(Number(left.rows[0]?.text_count), 0);
});

test("rate limit atômico corta o excesso e rejeição não incrementa", async () => {
  const pg = await database();
  async function hit() {
    const rows = await pg.query<{ hits: number }>(HIT_RATE_SQL, ["user-a", "analyzePhoto", 1, 8]);
    return rows.rows[0] ? Number(rows.rows[0].hits) : null;
  }
  const hits = [];
  for (let i = 0; i < 10; i += 1) hits.push(await hit());
  assert.deepEqual(hits, [1, 2, 3, 4, 5, 6, 7, 8, null, null]);
  const left = await pg.query<{ hits: number }>("select hits from rate_limits where user_id = $1 and window_id = 1", ["user-a"]);
  assert.equal(Number(left.rows[0]?.hits), 8);
});

test("rate limit concorrente respeita o teto de aceitos", async () => {
  const pg = await database();
  const hits = await Promise.all(
    Array.from({ length: 20 }, () =>
      pg
        .query<{ hits: number }>(HIT_RATE_SQL, ["user-a", "analyzePhoto", 42, 8])
        .then((result) => (result.rows[0] ? Number(result.rows[0].hits) : null)),
    ),
  );
  const accepted = hits.filter((value): value is number => value != null);
  assert.equal(accepted.length, 8);
  assert.equal(Math.max(...accepted), 8);
  assert.equal(hits.filter((value) => value == null).length, 12);
});

test("usuário B não lê refeição de A e exclusão de conta zera identidade", async () => {
  const pg = await database();
  const sql = asSql(pg);
  await pg.query(`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`, [
    "user-a",
    "Ana",
    "ana@example.com",
  ]);
  await pg.query(`insert into "session" (id, "expiresAt", token, "createdAt", "updatedAt", "userId") values ($1, now(), $2, now(), now(), $3)`, [
    "sess-a",
    "token-a",
    "user-a",
  ]);
  await pg.query(`insert into "account" (id, "accountId", "providerId", "userId", "createdAt", "updatedAt") values ($1, $2, $3, $4, now(), now())`, [
    "acc-a",
    "ana",
    "credential",
    "user-a",
  ]);
  await pg.query(
    `insert into meals (id, user_id, day, meal_type, eaten_at, source) values ($1, $2, $3, $4, now(), $5)`,
    ["11111111-1111-1111-1111-111111111111", "user-a", "2026-10-03", "lunch", "manual"],
  );
  await pg.query(
    `insert into food_items (id, meal_id, user_id, name, quantity, unit, source, data_status, base_quantity) values ($1,$2,$3,$4,100,'g','user','reference',100)`,
    ["22222222-2222-2222-2222-222222222222", "11111111-1111-1111-1111-111111111111", "user-a", "Arroz"],
  );
  assert.equal((await findOwnedMeal(sql, "user-b", "11111111-1111-1111-1111-111111111111"))?.id, undefined);
  assert.ok(await findOwnedMeal(sql, "user-a", "11111111-1111-1111-1111-111111111111"));
  const leaked = await pg.query("select id from meals where id = $1", ["11111111-1111-1111-1111-111111111111"]);
  assert.equal(leaked.rows.length, 1);
  await wipeUserData(sql, "user-a");
  await wipeAuthIdentity(sql, "user-a");
  const meals = await pg.query("select id from meals where user_id = $1", ["user-a"]);
  const users = await pg.query(`select id from "user" where id = $1`, ["user-a"]);
  const sessions = await pg.query(`select id from "session" where "userId" = $1`, ["user-a"]);
  assert.equal(meals.rows.length, 0);
  assert.equal(users.rows.length, 0);
  assert.equal(sessions.rows.length, 0);
});

test("usuário B não enxerga dados privados de A e apagar dados preserva o login", async () => {
  const pg = await database();
  const sql = asSql(pg);
  await pg.query(`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`, [
    "user-a",
    "Ana",
    "ana2@example.com",
  ]);
  await pg.query(`insert into profiles (user_id, name, goal, activity) values ($1, $2, $3, $4)`, ["user-a", "Ana", "acompanhar", "leve"]);
  await pg.query(
    `insert into goals (user_id, calories, protein, carbohydrates, fat, fiber, water_ml) values ($1, 2000, 100, 200, 60, 25, 2500)`,
    ["user-a"],
  );
  await pg.query(`insert into water_logs (id, user_id, day, amount_ml) values ($1, $2, $3, 200)`, [
    "33333333-3333-3333-3333-333333333333",
    "user-a",
    "2026-10-03",
  ]);
  await pg.query(`insert into weight_logs (id, user_id, day, weight_kg) values ($1, $2, $3, 70)`, [
    "44444444-4444-4444-4444-444444444444",
    "user-a",
    "2026-10-03",
  ]);
  await pg.query(`insert into habits (user_id, water) values ($1, true)`, ["user-a"]);
  await pg.query(`insert into habit_checks (id, user_id, day, habit, done) values ($1, $2, $3, $4, true)`, [
    "55555555-5555-5555-5555-555555555555",
    "user-a",
    "2026-10-03",
    "produce",
  ]);
  await pg.query(`insert into ai_messages (id, user_id, role, content) values ($1, $2, $3, $4)`, [
    "66666666-6666-6666-6666-666666666666",
    "user-a",
    "user",
    "oi",
  ]);
  await pg.query(`insert into ai_memory (id, user_id, fact) values ($1, $2, $3)`, [
    "77777777-7777-7777-7777-777777777777",
    "user-a",
    "prefere almoço simples",
  ]);
  await pg.query(`insert into analytics_events (id, user_id, name) values ($1, $2, $3)`, [
    "88888888-8888-8888-8888-888888888888",
    "user-a",
    "app_open",
  ]);
  const tables = [
    "profiles",
    "goals",
    "water_logs",
    "weight_logs",
    "habits",
    "habit_checks",
    "ai_messages",
    "ai_memory",
    "analytics_events",
  ] as const;
  for (const table of tables) {
    const leaked = await pg.query(`select 1 from ${table} where user_id = $1`, ["user-b"]);
    const owned = await pg.query(`select 1 from ${table} where user_id = $1`, ["user-a"]);
    assert.equal(leaked.rows.length, 0, table);
    assert.equal(owned.rows.length > 0, true, table);
  }
  await pg.query("BEGIN");
  await pg.query(
    `insert into meals (id, user_id, day, meal_type, eaten_at, source) values ($1, $2, $3, $4, now(), $5)`,
    ["99999999-9999-9999-9999-999999999999", "user-a", "2026-10-03", "dinner", "manual"],
  );
  await pg.query("ROLLBACK");
  const rolled = await pg.query("select id from meals where id = $1", ["99999999-9999-9999-9999-999999999999"]);
  assert.equal(rolled.rows.length, 0);
  await wipeUserData(sql, "user-a");
  const profiles = await pg.query("select user_id from profiles where user_id = $1", ["user-a"]);
  const users = await pg.query(`select id from "user" where id = $1`, ["user-a"]);
  assert.equal(profiles.rows.length, 0);
  assert.equal(users.rows.length, 1);
});
