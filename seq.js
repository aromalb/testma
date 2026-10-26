import { db } from '../lib/db.js';
import { guard, send, body, fail } from '../lib/http.js';

const START = { bk: 1000, qt: 2000, py: 3000, inv: 1000, cn: 1000, rn: 1000 };

// Hands out the next booking / quote / receipt / invoice / credit note number, so two staff never get the same one.
// { kind } → { value }.  Admin only: { kind, min } raises the counter to at least min.
export default async function handler(req, res) {
  const u = await guard(req, res, { method: 'POST' });
  if (!u) return;
  try {
    const { kind, min } = body(req);
    if (!(kind in START)) return send(res, 400, { error: 'Unknown number type.' });
    const key = 'seq_' + kind;
    if (min !== undefined) {
      if (u.role !== 'admin') return send(res, 403, { error: 'Only an admin can change numbering.' });
      const m = Math.floor(Number(min));
      if (!Number.isFinite(m) || m < 0) return send(res, 400, { error: 'Invalid number.' });
      await db().execute({
        sql: `INSERT INTO kv (k, v) VALUES (?, ?)
              ON CONFLICT (k) DO UPDATE SET v = MAX(CAST(kv.v AS INTEGER), CAST(excluded.v AS INTEGER))`,
        args: [key, String(m)],
      });
      return send(res, 200, { ok: true });
    }
    const r = await db().execute({
      sql: `INSERT INTO kv (k, v) VALUES (?, ?)
            ON CONFLICT (k) DO UPDATE SET v = CAST(kv.v AS INTEGER) + 1
            RETURNING v`,
      args: [key, String(START[kind] + 1)],
    });
    send(res, 200, { value: Number(r.rows[0].v) });
  } catch (e) {
    fail(res, e);
  }
}
