// Serverless functie voor Vercel: /api/redactie/* (via rewrite). Alleen met Bearer REDACTIE_TOKEN.
import { handleRedactie } from '../lib/admin/redactie.mjs';

export default function handler(req, res) {
  return handleRedactie(req, res);
}
