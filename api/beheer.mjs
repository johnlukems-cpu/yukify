// Serverless functie voor Vercel: /beheer en /beheer/* (via rewrite). Beveiligd beheer van Nieuws & Inzichten.
import { handleBeheer } from '../lib/admin/handler.mjs';

export default function handler(req, res) {
  return handleBeheer(req, res);
}
