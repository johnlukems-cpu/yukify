// Serverless functie voor Vercel Cron: publiceert ingeplande, goedgekeurde artikelen (Bearer CRON_SECRET).
import { handleCron } from '../lib/admin/cron.mjs';

export default function handler(req, res) {
  return handleCron(req, res);
}
