import { db } from '../lib/db.js';
import { guard, send, body, fail } from '../lib/http.js';

// Company details, rate card and message templates. Admins only.
export default async function handler(req, res) {
  const u = await guard(req, res, { method: 'POST', roles: ['admin'] });
  if (!u) return;
  try {
    const s = body(req).settings;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return send(res, 400, { error: 'Settings are missing.' });
    const json = JSON.stringify(s);
    if (json.length > 100_000) return send(res, 400, { error: 'Settings are too large.' });
    await db().execute({
      sql: 'INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v',
      args: ['settings', json],
    });
    send(res, 200, { ok: true });
  } catch (e) {
    fail(res, e);
  }
}
