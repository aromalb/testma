import { db } from '../lib/db.js';
import { hashPw, verifyPw, passwordProblem } from '../lib/pw.js';
import { guard, send, body, fail } from '../lib/http.js';

// Signed-in person changes their own password: { current, next }
export default async function handler(req, res) {
  const u = await guard(req, res, { method: 'POST' });
  if (!u) return;
  try {
    const { current, next } = body(req);
    const row = (await db().execute({ sql: 'SELECT pw FROM users WHERE id = ?', args: [u.id] })).rows[0];
    if (!row || !(await verifyPw(String(current || ''), row.pw))) return send(res, 400, { error: 'Your current password is not right.' });
    const p = passwordProblem(next);
    if (p) return send(res, 400, { error: p });
    if (String(next) === String(current)) return send(res, 400, { error: 'Choose a password different from the current one.' });
    await db().execute({ sql: 'UPDATE users SET pw = ? WHERE id = ?', args: [await hashPw(next), u.id] });
    send(res, 200, { ok: true });
  } catch (e) {
    fail(res, e);
  }
}
