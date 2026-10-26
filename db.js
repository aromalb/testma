import { createClient } from '@libsql/client';
import { hashPw } from './pw.js';

let client;
let ready;

export function db() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.');
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

// Creates the tables on first use, and the first admin from ADMIN_EMAIL / ADMIN_PASSWORD
// when there are no users yet. Safe to call on every request.
export function init() {
  if (!ready) {
    ready = (async () => {
      const c = db();
      await c.batch(
        [
          `CREATE TABLE IF NOT EXISTS records (
             coll TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
             updated_at INTEGER NOT NULL, updated_by TEXT,
             PRIMARY KEY (coll, id))`,
          `CREATE INDEX IF NOT EXISTS records_by_coll ON records (coll, updated_at)`,
          `CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS users (
             id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
             role TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
             pw TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
             fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
             created_at INTEGER NOT NULL)`,
        ],
        'write'
      );
      const n = Number((await c.execute('SELECT COUNT(*) AS n FROM users')).rows[0].n);
      const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const pw = process.env.ADMIN_PASSWORD || '';
      if (n === 0 && email && pw) {
        await c.execute({
          sql: `INSERT INTO users (id, name, email, role, title, pw, created_at) VALUES (?, ?, ?, 'admin', 'Owner', ?, ?)`,
          args: ['U' + Date.now().toString(36), process.env.ADMIN_NAME || 'Administrator', email, await hashPw(pw), Date.now()],
        });
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function getSettings() {
  const r = await db().execute({ sql: 'SELECT v FROM kv WHERE k = ?', args: ['settings'] });
  if (!r.rows[0]) return null;
  try {
    return JSON.parse(r.rows[0].v);
  } catch {
    return null;
  }
}
