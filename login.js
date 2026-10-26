import { aiProvider } from '../lib/ai-provider.js';
import { db, init } from '../lib/db.js';
import { hashPw, verifyPw } from '../lib/pw.js';
import { send, body, sameOrigin, signSession, setSessionCookie, publicUser, fail } from '../lib/http.js';

let dummyHash;

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Request blocked.' });
  try {
    await init();
    const b = body(req);
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const remember = !!b.remember;
    const nope = 'That email and password do not match. Check for typos, or ask your admin to reset your password.';
    if (!email || !password) return send(res, 400, { error: 'Enter your work email and password.' });

    const r = await db().execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
    const u = r.rows[0];
    if (!u || !Number(u.active)) {
      dummyHash = dummyHash || (await hashPw('not-a-real-password'));
      await verifyPw(password, dummyHash); // same timing whether or not the account exists
      return send(res, 401, { error: nope });
    }
    if (Number(u.locked_until) > Date.now()) {
      return send(res, 429, { error: 'Too many wrong passwords. Try again in 15 minutes, or ask your admin to reset your password.' });
    }
    if (!(await verifyPw(password, u.pw))) {
      const fails = Number(u.fails) + 1;
      const lock = fails >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
      await db().execute({ sql: 'UPDATE users SET fails = ?, locked_until = ? WHERE id = ?', args: [lock ? 0 : fails, lock, u.id] });
      return send(res, 401, { error: nope });
    }
    await db().execute({ sql: 'UPDATE users SET fails = 0, locked_until = 0 WHERE id = ?', args: [u.id] });
    const days = remember ? 30 : 0.5;
    setSessionCookie(res, signSession(u.id, days), remember ? days : 0);
    return send(res, 200, { user: publicUser(u), ai: !!aiProvider(process.env) });
  } catch (e) {
    return fail(res, e);
  }
}
