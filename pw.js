import crypto from 'node:crypto';

const scrypt = (pw, salt) =>
  new Promise((ok, no) =>
    crypto.scrypt(String(pw), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? no(e) : ok(k)))
  );

export async function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPw(pw, stored) {
  const [kind, s, h] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !s || !h) return false;
  const key = await scrypt(pw, Buffer.from(s, 'hex'));
  const want = Buffer.from(h, 'hex');
  return want.length === key.length && crypto.timingSafeEqual(want, key);
}

export function passwordProblem(pw) {
  pw = String(pw || '');
  if (pw.length < 10) return 'Use at least 10 characters.';
  if (/^(.)\1+$/.test(pw)) return 'Choose a password that is not one repeated character.';
  return '';
}
