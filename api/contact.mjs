// Serverless functie voor Vercel: POST /api/contact
import { handleContact } from '../lib/contact.mjs';
import { send } from '../lib/security.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, 'Method not allowed', { Allow: 'POST' });
  return handleContact(req, res);
}
