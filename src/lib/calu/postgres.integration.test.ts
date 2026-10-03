import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import pg from "pg";
import { CLEANUP_RATE_SQL, HIT_RATE_SQL } from "./rate-limit.ts";
import { ensureUsageSql, reserveQuotaSql } from "./quota.ts";

const url = process.env.CALU_TEST_DATABASE_URL || (process.env.CI_POSTGRES === "1" ? process.env.DATABASE_URL : "") || "";

function assertSafe(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;
  const name = parsed.pathname.replace(/^\//, "");
  const local = host === "localhost" || host === "127.0.0.1";
  if (!local && process.env.CI_POSTGRES !== "1") {
    throw new Error("Postgres remoto só roda com CI_POSTGRES=1 e um banco de teste.");
  }
  if (!/test|smartnutri|postgres/i.test(name)) {
    throw new Error("CALU_TEST_DATABASE_URL recusado: o nome do banco precisa indicar teste.");
  }
}

function migration(name: string): string {
  return readFileSync(new URL(`../../../migrations/${name}`, import.meta.url), "utf8");
}

if (!url) {
  test("postgres real", { skip: "CALU_TEST_DATABASE_URL ausente — a suíte roda no CI com o service container" }, () => {});
} else {
  test("postgres real: migrations, isolamento, quota, rate limit e exclusão", async () => {
    assertSafe(url);
    const pool = new pg.Pool({ connectionString: url, max: 8 });
    const client = await pool.connect();
    try {
      await client.query("drop schema if exists public cascade");
      await client.query("create schema public");
      for (const name of ["0001_auth.sql", "0002_calu.sql", "0003_v21.sql", "0004_v22.sql"]) {
        await client.query(migration(name));
      }
      await client.query(migration("0004_v22.sql"));
      const columns = await client.query(
        `select column_name from information_schema.columns where table_name = 'ai_calls' and column_name = 'pricing_version'`,
      );
      assert.equal(columns.rows.length, 1);
      await client.query(
        `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1,$2,$3,true,now(),now())`,
        ["user-a", "Ana", "ana-pg@example.com"],
      );
      await client.query(
        `insert into meals (id, user_id, day, meal_type, eaten_at, source) values ($1,$2,$3,$4,now(),$5)`,
        ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "user-a", "2026-10-03", "lunch", "manual"],
      );
      const leaked = await client.query(`select id from meals where user_id = $1`, ["user-b"]);
      assert.equal(leaked.rows.length, 0);
      const owned = await client.query(`select id from meals where user_id = $1`, ["user-a"]);
      assert.equal(owned.rows.length, 1);
      await client.query("begin");
      await client.query(
        `insert into meals (id, user_id, day, meal_type, eaten_at, source) values ($1,$2,$3,$4,now(),$5)`,
        ["cccccccc-cccc-cccc-cccc-cccccccccccc", "user-a", "2026-10-03", "dinner", "manual"],
      );
      await client.query("rollback");
      const rolled = await client.query(`select id from meals where id = $1`, ["cccccccc-cccc-cccc-cccc-cccccccccccc"]);
      assert.equal(rolled.rows.length, 0);

      const limit = 5;
      const reserves = await Promise.all(
        Array.from({ length: 12 }, () =>
          pool.connect().then(async (worker) => {
            try {
              await worker.query("begin");
              await worker.query(ensureUsageSql(), ["user-a", "2026-10-03"]);
              const updated = await worker.query(reserveQuotaSql("image"), ["user-a", "2026-10-03", limit]);
              await worker.query("commit");
              return updated.rows.length > 0;
            } catch (error) {
              await worker.query("rollback");
              throw error;
            } finally {
              worker.release();
            }
          }),
        ),
      );
      assert.equal(reserves.filter(Boolean).length, limit);

      const hits = await Promise.all(
        Array.from({ length: 20 }, () =>
          pool.query(HIT_RATE_SQL, ["user-a", "analyzePhoto", 3, 8]).then((result) => (result.rows[0] ? Number(result.rows[0].hits) : null)),
        ),
      );
      assert.equal(hits.filter((value) => value != null).length, 8);
      assert.equal(Math.max(...hits.filter((value): value is number => value != null)), 8);
      await pool.query(CLEANUP_RATE_SQL, [3]);
      const old = await pool.query("select window_id from rate_limits where window_id < 3");
      assert.equal(old.rows.length, 0);

      await client.query(`delete from food_items where user_id = $1`, ["user-a"]);
      await client.query(`delete from meals where user_id = $1`, ["user-a"]);
      await client.query(`delete from ai_usage where user_id = $1`, ["user-a"]);
      await client.query(`delete from rate_limits where user_id = $1`, ["user-a"]);
      const meals = await client.query(`select id from meals where user_id = $1`, ["user-a"]);
      assert.equal(meals.rows.length, 0);
      await client.query(`delete from "user" where id = $1`, ["user-a"]);
      const users = await client.query(`select id from "user" where id = $1`, ["user-a"]);
      assert.equal(users.rows.length, 0);
    } finally {
      client.release();
      await pool.end();
    }
  });
}
