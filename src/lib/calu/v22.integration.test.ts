import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db.ts";
import { CLEANUP_RATE_SQL, HIT_RATE_SQL } from "./rate-limit.ts";
import { recordAiCall, wipeAuthIdentity, wipeUserData } from "./ops.ts";

function migration(name: string): string {
  return readFileSync(new URL(`../../../migrations/${name}`, import.meta.url), "utf8");
}

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

async function emptyDatabase() {
  const pg = new PGlite();
  await pg.waitReady;
  return pg;
}

test("migrations do zero e sobre um banco V2.1", async () => {
  const fresh = await emptyDatabase();
  for (const name of ["0001_auth.sql", "0002_calu.sql", "0003_v21.sql", "0004_v22.sql"]) {
    await fresh.exec(migration(name));
  }
  await fresh.exec(migration("0004_v22.sql"));
  const columns = await fresh.query<{ column_name: string }>(
    `select column_name from information_schema.columns where table_name = 'ai_calls' and column_name in ('pricing_version', 'total_tokens', 'error_type')`,
  );
  assert.equal(columns.rows.length, 3);
  const index = await fresh.query(`select indexname from pg_indexes where indexname = 'rate_limits_window_idx'`);
  assert.equal(index.rows.length, 1);

  const existing = await emptyDatabase();
  await existing.exec(migration("0001_auth.sql"));
  await existing.exec(migration("0002_calu.sql"));
  await existing.query(
    `insert into meals (id, user_id, day, meal_type, eaten_at, source) values ($1, $2, $3, $4, now(), $5)`,
    ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "user-a", "2026-10-03", "lunch", "manual"],
  );
  await existing.exec(migration("0003_v21.sql"));
  await existing.exec(migration("0004_v22.sql"));
  const kept = await existing.query(`select id from meals where user_id = $1`, ["user-a"]);
  assert.equal(kept.rows.length, 1);
  const again = await existing.query<{ column_name: string }>(
    `select column_name from information_schema.columns where table_name = 'ai_calls' and column_name = 'pricing_version'`,
  );
  assert.equal(again.rows.length, 1);
});

test("100 pedidos concorrentes não passam do rate limit", async () => {
  const pg = await emptyDatabase();
  await pg.exec(migration("0001_auth.sql"));
  await pg.exec(migration("0002_calu.sql"));
  await pg.exec(migration("0003_v21.sql"));
  await pg.exec(migration("0004_v22.sql"));
  const hits = await Promise.all(
    Array.from({ length: 100 }, () =>
      pg
        .query<{ hits: number }>(HIT_RATE_SQL, ["user-a", "analyzePhoto", 7, 8])
        .then((result) => (result.rows[0] ? Number(result.rows[0].hits) : null)),
    ),
  );
  const accepted = hits.filter((value): value is number => value != null);
  assert.equal(accepted.length, 8);
  assert.equal(Math.max(...accepted), 8);
  assert.equal(hits.filter((value) => value == null).length, 92);
  const stored = await pg.query<{ hits: number }>("select hits from rate_limits where window_id = 7");
  assert.equal(Number(stored.rows[0]?.hits), 8);
});

test("limpeza remove janela antiga e o ledger grava a versão de preço", async () => {
  const pg = await emptyDatabase();
  for (const name of ["0001_auth.sql", "0002_calu.sql", "0003_v21.sql", "0004_v22.sql", "0005_v31.sql", "0006_v32.sql"]) {
    await pg.exec(migration(name));
  }
  await pg.query(HIT_RATE_SQL, ["user-a", "analyzeText", 1, 12]);
  await pg.query(HIT_RATE_SQL, ["user-a", "analyzeText", 9, 12]);
  await pg.query(CLEANUP_RATE_SQL, [8]);
  const left = await pg.query<{ window_id: number }>("select window_id from rate_limits order by window_id");
  assert.deepEqual(
    left.rows.map((row) => Number(row.window_id)),
    [9],
  );
  const sql = asSql(pg);
  await recordAiCall(sql, {
    userId: "user-a",
    operation: "analyzePhoto",
    provider: "grok",
    model: "grok",
    inputTokens: 1000,
    outputTokens: 200,
    success: false,
    durationMs: 40,
    requestId: "req-22",
    errorType: "provider_unavailable",
  });
  const rows = await pg.query<{ operation: string; pricing_version: string; total_tokens: number; error_type: string }>(
    "select operation, pricing_version, total_tokens, error_type from ai_calls where request_id = $1",
    ["req-22"],
  );
  assert.equal(rows.rows[0]?.operation, "PHOTO_ANALYSIS");
  assert.equal(rows.rows[0]?.pricing_version, "2026-10-01");
  assert.equal(Number(rows.rows[0]?.total_tokens), 1200);
  assert.equal(rows.rows[0]?.error_type, "provider_unavailable");
  await pg.query(`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1,$2,$3,true,now(),now())`, [
    "user-a",
    "Ana",
    "ana@example.com",
  ]);
  await wipeUserData(sql, "user-a");
  await wipeAuthIdentity(sql, "user-a");
  const calls = await pg.query("select id from ai_calls where user_id = $1", ["user-a"]);
  const users = await pg.query(`select id from "user" where id = $1`, ["user-a"]);
  assert.equal(calls.rows.length, 0);
  assert.equal(users.rows.length, 0);
});
