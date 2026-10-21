// Serverless functie voor Vercel: GET /healthz (via rewrite) — toont of SMTP is geconfigureerd.
import { smtpConfigured } from '../lib/contact.mjs';
import { sendJson } from '../lib/security.mjs';

export default function handler(req, res) {
  return sendJson(res, 200, { ok: true, mail: smtpConfigured });
}
