import { db } from '../lib/db.js';
import { hashPw, passwordProblem } from '../lib/pw.js';
import { guard, send, body, listUsers, fail } from '../lib/http.js';
import { ACCESS } from '../lib/roles.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Team management. Admins only.
// GET → { users }.  POST { action: create | update | reset, ... } → { users }
export default async function handler(req, res) {
  const me = await guard(req, res, { roles: ['admin'] });
  if (!me) return;
  try {
    if (req.method === 'GET') return send(res, 200, { users: await listUsers() });
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
    const b = body(req);
    const c = db();

    if (b.action === 'create') {
      const name = String(b.name || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      const role = String(b.role || '');
      if (!name) return send(res, 400, { error: 'Add the person\'s name.' });
      if (!EMAIL.test(email)) return send(res, 400, { error: 'Enter a valid email address.' });
      if (!ACCESS[role]) return send(res, 400, { error: 'Choose a role.' });
      const p = passwordProblem(b.password);
      if (p) return send(res, 400, { error: 'Temporary password: ' + p });
      const exists = await c.execute({ sql: 'SELECT 1 FROM users WHERE email = ?', args: [email] });
      if (exists.rows.length) return send(res, 409, { error: 'Someone already uses that email.' });
      await c.execute({
        sql: 'INSERT INTO users (id, name, email, role, title, phone, pw, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['U' + Date.now().toString(36), name, email, role, String(b.title || ''), String(b.phone || ''), await hashPw(b.password), Date.now()],
      });
      return send(res, 200, { users: await listUsers() });
    }

    const target = (await c.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [String(b.id || '')] })).rows[0];
    if (!target) return send(res, 404, { error: 'That person was not found.' });

    if (b.action === 'update') {
      const role = b.role !== undefined ? String(b.role) : target.role;
      const active = b.active !== undefined ? (b.active ? 1 : 0) : Number(target.active);
      if (!ACCESS[role]) return send(res, 400, { error: 'Choose a role.' });
      const losingAdmin = target.role === 'admin' && Number(target.active) && (role !== 'admin' || !active);
      if (losingAdmin) {
        const n = Number((await c.execute("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1")).rows[0].n);
        if (n <= 1) return send(res, 400, { error: 'Keep at least one active admin.' });
      }
      if (target.id === me.id && !active) return send(res, 400, { error: 'You cannot turn off your own account.' });
      await c.execute({
        sql: 'UPDATE users SET name = ?, role = ?, title = ?, phone = ?, active = ? WHERE id = ?',
        args: [String(b.name ?? target.name).trim() || target.name, role, String(b.title ?? target.title), String(b.phone ?? target.phone), active, target.id],
      });
      return send(res, 200, { users: await listUsers() });
    }

    if (b.action === 'reset') {
      const p = passwordProblem(b.password);
      if (p) return send(res, 400, { error: 'New password: ' + p });
      await c.execute({
        sql: 'UPDATE users SET pw = ?, fails = 0, locked_until = 0 WHERE id = ?',
        args: [await hashPw(b.password), target.id],
      });
      return send(res, 200, { users: await listUsers() });
    }

    send(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    fail(res, e);
  }
}
