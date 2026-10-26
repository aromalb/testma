import { db } from '../lib/db.js';
import { guard, send, body, fail } from '../lib/http.js';
import { WRITE } from '../lib/roles.js';

const ID = /^[A-Za-z0-9_-]{1,40}$/;

// Saves changed records: { changes: [{ coll, id, data }] }. data: null deletes (admins only).
export default async function handler(req, res) {
  const u = await guard(req, res, { method: 'POST' });
  if (!u) return;
  try {
    const changes = body(req).changes;
    if (!Array.isArray(changes) || !changes.length) return send(res, 400, { error: 'Nothing to save.' });
    if (changes.length > 500) return send(res, 400, { error: 'Too many changes at once.' });
    const now = Date.now();
    const stmts = [];
    for (const ch of changes) {
      const { coll, id, data } = ch || {};
      if (!WRITE[coll]) return send(res, 400, { error: `Unknown record type "${coll}".` });
      if (!ID.test(String(id))) return send(res, 400, { error: 'A record has an invalid ID.' });
      if (!WRITE[coll].includes(u.role)) return send(res, 403, { error: `Your role cannot change ${coll}.` });
      if (data === null) {
        if (u.role !== 'admin') return send(res, 403, { error: 'Only an admin can delete records.' });
        stmts.push({ sql: 'DELETE FROM records WHERE coll = ? AND id = ?', args: [coll, id] });
        continue;
      }
      if (!data || typeof data !== 'object' || data.id !== id) return send(res, 400, { error: 'A record does not match its ID.' });
      const json = JSON.stringify(data);
      if (json.length > 200_000) return send(res, 400, { error: `Record ${id} is too large.` });
      stmts.push({
        sql: `INSERT INTO records (coll, id, data, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT (coll, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
        args: [coll, id, json, now, u.id],
      });
    }
    await db().batch(stmts, 'write');
    send(res, 200, { ok: true, at: now });
  } catch (e) {
    fail(res, e);
  }
}
