/*
 * Database access. Uses PostgreSQL (node-postgres) when DATABASE_URL is set, otherwise an
 * embedded PGlite (Postgres compiled to WASM) so the API runs with zero setup.
 *
 * Both adapters expose the same interface:
 *   db.query(sql, params) -> { rows, rowCount }
 *   db.exec(sql)          -> run one or more statements without parameters
 *   db.tx(async (t) => …) -> run in a transaction; `t` has the same query/exec methods
 * Service functions accept either `db` or a transaction handle.
 */
import { migrations } from './migrations.js';
import { seedDemo, ensureAdmin } from './seed.js';

const DATE_OID = 1082;
const INT8_OID = 20;
const LOCK_KEY = 72_877_242; // advisory lock id for migrations / seeding

async function openPostgres(url) {
  const { default: pg } = await import('pg');
  const types = {
    getTypeParser: (oid, format) => {
      if (oid === DATE_OID) return (v) => v; // keep dates as 'YYYY-MM-DD'
      if (oid === INT8_OID) return (v) => (v === null ? null : Number(v));
      return pg.types.getTypeParser(oid, format);
    },
  };
  const pool = new pg.Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    types,
  });
  pool.on('error', (err) => console.error('[db] idle client error', err.message));
  const wrap = (c) => ({
    query: async (sql, params) => {
      const r = await c.query(sql, params);
      return { rows: r.rows, rowCount: r.rowCount ?? 0 };
    },
    exec: async (sql) => {
      await c.query(sql);
    },
  });
  return {
    kind: 'postgres',
    ...wrap(pool),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn(wrap(client));
        await client.query('COMMIT');
        return out;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function openPglite(dir) {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite({ ...(dir ? { dataDir: dir } : {}), parsers: { [DATE_OID]: (v) => v, [INT8_OID]: (v) => Number(v) } });
  await pg.waitReady;
  const wrap = (c) => ({
    query: async (sql, params) => {
      const r = await c.query(sql, params);
      return { rows: r.rows, rowCount: r.affectedRows ?? 0 };
    },
    exec: async (sql) => {
      await c.exec(sql);
    },
  });
  return {
    kind: 'pglite',
    ...wrap(pg),
    // PGlite runs one transaction at a time, which also serialises concurrent bookings.
    tx: (fn) => pg.transaction((t) => fn(wrap(t))),
    close: () => pg.close(),
  };
}

export async function migrate(db) {
  await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  await db.tx(async (t) => {
    await t.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEY]);
    const done = new Set((await t.query('SELECT id FROM schema_migrations')).rows.map((r) => r.id));
    for (const m of migrations) {
      if (done.has(m.id)) continue;
      await t.exec(m.sql);
      await t.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
    }
  });
}

/** Open, migrate and (optionally) seed a database for the given config. */
export async function openDatabase(config) {
  const db = config.databaseUrl ? await openPostgres(config.databaseUrl) : await openPglite(config.pgliteDir);
  await migrate(db);
  if (config.seedDemo) await seedDemo(db, config, LOCK_KEY);
  if (config.adminEmail && config.adminPassword) await ensureAdmin(db, config);
  return db;
}
