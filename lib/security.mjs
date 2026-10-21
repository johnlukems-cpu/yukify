// Gedeelde beveiligingsheaders voor de Node-server, de serverless functie en vercel.json.
import { createHash } from 'node:crypto';

/* ---------- Beveiligingsheaders ---------- */
export const INLINE_SCRIPT = "document.documentElement.classList.add('js')";
const inlineHash = createHash('sha256').update(INLINE_SCRIPT).digest('base64');
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    `script-src 'self' 'sha256-${inlineHash}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  ...(process.env.HSTS === 'true' ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
};


export function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...securityHeaders, ...headers });
  res.end(body);
}
export function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
}

