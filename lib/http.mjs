// Kleine HTTP-hulpfuncties voor de serverfuncties (Vercel én eigen Node-server).
import { securityHeaders } from './security.mjs';

/** Leest de body (ook als Vercel hem al heeft ingelezen). Gooit { status: 413 } bij te grote invoer. */
export function readBody(req, limit) {
  const tooLarge = () => Object.assign(new Error('too large'), { status: 413 });
  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
    const text = req.body.toString('utf8');
    return Buffer.byteLength(text) > limit ? Promise.reject(tooLarge()) : Promise.resolve(text);
  }
  if (req.body && typeof req.body === 'object') {
    const ctype = (req.headers['content-type'] || '').split(';')[0].trim();
    const text = ctype === 'application/json' ? JSON.stringify(req.body) : new URLSearchParams(req.body).toString();
    return Buffer.byteLength(text) > limit ? Promise.reject(tooLarge()) : Promise.resolve(text);
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        req.pause();
        reject(tooLarge());
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export async function readForm(req, limit = 400 * 1024) {
  return Object.fromEntries(new URLSearchParams(await readBody(req, limit)));
}

export async function readJson(req, limit = 400 * 1024) {
  const text = await readBody(req, limit);
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw Object.assign(new Error('invalid json'), { status: 400 });
  }
}

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function clientIp(req) {
  const trust = process.env.TRUST_PROXY === 'true' || Boolean(process.env.VERCEL);
  return (trust && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket?.remoteAddress || 'onbekend';
}

export function isHttps(req) {
  return Boolean(process.env.VERCEL) || req.headers['x-forwarded-proto'] === 'https';
}

/** Kopteksten voor beheer- en API-antwoorden: nooit cachen, nooit indexeren. */
export const privateHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

export function sendHtml(res, status, html, headers = {}) {
  res.writeHead(status, { ...securityHeaders, ...privateHeaders, 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(html);
}

export function sendJsonPrivate(res, status, obj, headers = {}) {
  res.writeHead(status, { ...securityHeaders, ...privateHeaders, 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(obj));
}

export function redirect(res, location, headers = {}) {
  res.writeHead(303, { ...securityHeaders, ...privateHeaders, Location: location, ...headers });
  res.end();
}
