import crypto from 'node:crypto';
import { db, init } from './db.js';

const COOKIE = 'msd_session';

function secret() {
  const s = process.env.SESSION_SECRET || '';
  if (s.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters. Add it in Vercel → Settings → Environment Variables.');
  return s;
}

export function signSession(userId, days) {
  const body = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + days * 864e5 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function readSession(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.e > Date.now() ? p : null;
  } catch {
    return null;
  }
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function setSessionCookie(res, token, days) {
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Strict'];
  if (days) parts.push(`Max-Age=${Math.round(days * 86400)}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

export function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export function body(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return {};
}

// Blocks requests posted from other websites.
export function sameOrigin(req) {
  if (req.method === 'GET') return true;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, title: u.title || '', phone: u.phone || '', active: !!Number(u.active) };
}

export async function currentUser(req) {
  await init();
  const s = readSession(cookies(req)[COOKIE]);
  if (!s) return null;
  const r = await db().execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [s.u] });
  const u = r.rows[0];
  if (!u || !Number(u.active)) return null;
  return publicUser(u);
}

// Runs the common checks. Returns the signed-in user, or null after sending an error.
export async function guard(req, res, { method, roles } = {}) {
  try {
    if (method && req.method !== method) {
      send(res, 405, { error: 'Method not allowed.' });
      return null;
    }
    if (!sameOrigin(req)) {
      send(res, 403, { error: 'Request blocked.' });
      return null;
    }
    const u = await currentUser(req);
    if (!u) {
      send(res, 401, { error: 'Your session has ended. Sign in again.' });
      return null;
    }
    if (roles && !roles.includes(u.role)) {
      send(res, 403, { error: 'Your role cannot do this. Ask an admin.' });
      return null;
    }
    return u;
  } catch (e) {
    console.error(e);
    send(res, 500, { error: e.message || 'Server error.' });
    return null;
  }
}

export async function listUsers() {
  const r = await db().execute('SELECT * FROM users ORDER BY active DESC, name');
  return r.rows.map(publicUser);
}

export function fail(res, e) {
  console.error(e);
  send(res, 500, { error: 'Something went wrong on the server. Try again; if it keeps happening, check the Vercel logs.' });
}
