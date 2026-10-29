// Authenticatie voor /beheer: wachtwoord (scrypt-hash), ondertekende sessiecookie en CSRF-token.
// Geheimen komen uitsluitend uit server-side omgevingsvariabelen en worden nooit gelogd of getoond.
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

export const SESSION_COOKIE = 'yk_beheer';
const SESSION_HOURS = 8;

export function adminConfig(env = process.env) {
  const missing = [];
  if (!/^scrypt\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/.test(env.ADMIN_PASSWORD_HASH || '')) missing.push('ADMIN_PASSWORD_HASH');
  if ((env.ADMIN_SESSION_SECRET || '').length < 32) missing.push('ADMIN_SESSION_SECRET');
  if (!env.GITHUB_TOKEN) missing.push('GITHUB_TOKEN');
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPO || '')) missing.push('GITHUB_REPO');
  return {
    ok: missing.length === 0,
    missing,
    passwordHash: env.ADMIN_PASSWORD_HASH || '',
    secret: env.ADMIN_SESSION_SECRET || '',
    name: (env.ADMIN_NAME || 'Eigenaar').slice(0, 80),
  };
}

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [, saltB64, hashB64] = String(stored).split('$');
  if (!saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const sign = (secret, value) => createHmac('sha256', secret).update(value).digest('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function createSession(secret, now = Date.now()) {
  const payload = `${now + SESSION_HOURS * 3600_000}.${randomBytes(16).toString('base64url')}`;
  return `${payload}.${sign(secret, payload)}`;
}

/** Geldige, niet-verlopen sessie? */
export function verifySession(secret, value, now = Date.now()) {
  const parts = String(value || '').split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(sign(secret, payload), parts[2])) return false;
  return Number(parts[0]) > now;
}

export function csrfToken(secret, session) {
  return sign(secret, `csrf:${session}`);
}

export function verifyCsrf(secret, session, token) {
  return Boolean(token) && safeEqual(csrfToken(secret, session), token);
}

export function sessionCookie(value, { secure }) {
  return `${SESSION_COOKIE}=${value}; Path=/beheer; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie({ secure }) {
  return `${SESSION_COOKIE}=; Path=/beheer; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

/** Bearer-token voor de redactie-API en cron (tijdconstante vergelijking). */
export function verifyBearer(req, expected) {
  if (!expected || expected.length < 32) return false;
  const m = /^Bearer\s+(.+)$/.exec(req.headers.authorization || '');
  return Boolean(m) && safeEqual(m[1].trim(), expected);
}

// Eenvoudige beperking van inlogpogingen per IP (in geheugen, per serverinstantie).
const attempts = new Map();
export function loginBlocked(ip, now = Date.now()) {
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60_000);
  attempts.set(ip, list);
  return list.length >= Number(process.env.ADMIN_LOGIN_MAX || 10);
}
export function registerFailedLogin(ip, now = Date.now()) {
  attempts.set(ip, [...(attempts.get(ip) || []), now]);
}
