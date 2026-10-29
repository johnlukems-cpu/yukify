// Dagelijkse publicatieronde (Vercel Cron, Bearer CRON_SECRET): zet ingeplande, goedgekeurde artikelen
// waarvan het publicatiemoment is verstreken op "gepubliceerd". Nooit iets zonder goedkeuring.
import { isApproved } from '../news.mjs';
import { sendJsonPrivate } from '../http.mjs';
import { verifyBearer } from './auth.mjs';
import * as store from './store.mjs';
import { applyAction } from './workflow.mjs';

export async function handleCron(req, res, now = Date.now()) {
  const missing = ['CRON_SECRET', 'GITHUB_TOKEN', 'GITHUB_REPO'].filter((k) => (k === 'CRON_SECRET' ? (process.env[k] || '').length < 32 : !process.env[k]));
  if (missing.length) return sendJsonPrivate(res, 503, { ok: false, missing });
  if (!verifyBearer(req, process.env.CRON_SECRET)) return sendJsonPrivate(res, 401, { ok: false });
  const published = [];
  const errors = [];
  try {
    for (const a of await store.listArticles()) {
      if (a.status !== 'ingepland' || !isApproved(a) || !(new Date(a.publishAt).getTime() <= now)) continue;
      try {
        await store.saveArticle(applyAction(a, 'publiceren', { now }), a.sha, `Nieuws: "${a.title}" gepubliceerd volgens planning`);
        published.push(a.slug);
      } catch (err) {
        errors.push({ slug: a.slug, error: err.code || 'fout' });
      }
    }
  } catch (err) {
    return sendJsonPrivate(res, 502, { ok: false, error: err.code || 'fout' });
  }
  return sendJsonPrivate(res, errors.length ? 207 : 200, { ok: errors.length === 0, published, errors });
}
