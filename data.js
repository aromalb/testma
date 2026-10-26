import { db, getSettings } from '../lib/db.js';
import { guard, send, listUsers, fail } from '../lib/http.js';
import { COLLECTIONS } from '../lib/roles.js';

// Everything the desk needs on load. Small companies stay well under a few MB for years.
export default async function handler(req, res) {
  const u = await guard(req, res, { method: 'GET' });
  if (!u) return;
  try {
    const out = { settings: await getSettings(), users: u.role === 'admin' ? await listUsers() : [] };
    for (const c of COLLECTIONS) out[c] = [];
    const r = await db().execute('SELECT coll, data FROM records');
    for (const row of r.rows) {
      if (out[row.coll]) {
        try {
          out[row.coll].push(JSON.parse(row.data));
        } catch {
          /* skip a damaged row rather than failing the whole load */
        }
      }
    }
    send(res, 200, out);
  } catch (e) {
    fail(res, e);
  }
}
