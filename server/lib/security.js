/* Tokens, password hashing, OTP hashing and ID generation – all on node:crypto. */
import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';

const scryptAsync = (pw, salt, len, opts) =>
  new Promise((resolve, reject) => scrypt(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))));

/* ---------------------------------------------------------------- JWT (HS256) */
const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const HEADER = b64({ alg: 'HS256', typ: 'JWT' });

export function signToken(claims, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ ...claims, iat: now, exp: now + ttlSeconds });
  const sig = createHmac('sha256', secret).update(`${HEADER}.${body}`).digest('base64url');
  return `${HEADER}.${body}.${sig}`;
}

export function verifyToken(token, secret) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== HEADER) return null;
  const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!claims || typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}

/* ---------------------------------------------------------------- Passwords (scrypt) */
const SCRYPT = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, N, r, p, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length, { N: +N, r: +r, p: +p });
  return timingSafeEqual(key, expected);
}

/* ---------------------------------------------------------------- OTP */
export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
export const hashOtp = (secret, phone, code) => createHmac('sha256', secret).update(`otp:${phone}:${code}`).digest('hex');
export const sameHash = (a, b) => {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
};

/* ---------------------------------------------------------------- IDs */
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'; // Crockford base32, no i/l/o/u

export function randomCode(len) {
  const bytes = randomBytes(len);
  let s = '';
  for (const b of bytes) s += ALPHABET[b & 31];
  return s;
}

export const newId = (prefix) => `${prefix}_${randomCode(16)}`;
export const newBookingRef = () => `TSH${randomCode(9).toUpperCase()}`;
