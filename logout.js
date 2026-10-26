import { send, clearSessionCookie } from '../lib/http.js';

export default function handler(req, res) {
  clearSessionCookie(res);
  send(res, 200, { ok: true });
}
