// Serverless functie voor Vercel: GET /healthz (via rewrite) — toont of e-mail is geconfigureerd.
import { smtpConfigured, missingMailSettings } from '../lib/contact.mjs';
import { sendJson } from '../lib/security.mjs';

export default function handler(req, res) {
  // Alleen namen van ontbrekende variabelen, nooit waarden.
  return sendJson(res, 200, { ok: true, mail: smtpConfigured, missing: missingMailSettings });
}
