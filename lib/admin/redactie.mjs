// Redactie-API voor Claude of andere automatisering (Bearer REDACTIE_TOKEN).
// Bewust beperkt: alleen concepten aanmaken/bijwerken, ter goedkeuring aanbieden, socialmedia-concepten
// schrijven en goedgekeurde berichten als geplaatst markeren. Goedkeuren of publiceren kan hier NIET.
import { validateArticle, isApproved, statusLabel } from '../news.mjs';
import { readJson, sendJsonPrivate } from '../http.mjs';
import { verifyBearer } from './auth.mjs';
import * as store from './store.mjs';
import { WorkflowError, applyContent, newArticle, checkRedactieInput, applySocialAction, slugify } from './workflow.mjs';

const EDITABLE = new Set(['concept', 'ter-goedkeuring']);
const BY = 'redactie-api';

export function redactieConfig(env = process.env) {
  const missing = [];
  if ((env.REDACTIE_TOKEN || '').length < 32) missing.push('REDACTIE_TOKEN');
  if (!env.GITHUB_TOKEN) missing.push('GITHUB_TOKEN');
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPO || '')) missing.push('GITHUB_REPO');
  return { ok: missing.length === 0, missing };
}

const summary = (a) => ({ slug: a.slug, title: a.title, category: a.category, status: a.status, statusLabel: statusLabel[a.status], date: a.date || null, publishAt: a.publishAt || null });

function route(req) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.searchParams.get('__p');
  return { path: (p !== null ? p : url.pathname.replace(/^\/api\/redactie\/?/, '')).replace(/^\/+|\/+$/g, ''), query: url.searchParams };
}

function fail(res, err) {
  if (err instanceof WorkflowError) return sendJsonPrivate(res, 422, { ok: false, errors: [err.message] });
  if (err?.status) return sendJsonPrivate(res, err.status, { ok: false, errors: ['Ongeldige of te grote invoer.'] });
  if (err?.code === 'CONFLICT') return sendJsonPrivate(res, 409, { ok: false, errors: ['Het bestand is intussen gewijzigd; haal het opnieuw op.'] });
  console.error('[redactie] Fout:', err?.code || err?.message);
  return sendJsonPrivate(res, 502, { ok: false, errors: ['Opslaan in de repository is mislukt.'] });
}

export async function handleRedactie(req, res) {
  const cfg = redactieConfig();
  if (!cfg.ok) return sendJsonPrivate(res, 503, { ok: false, errors: ['Redactie-API is niet ingesteld.'], missing: cfg.missing });
  if (!verifyBearer(req, process.env.REDACTIE_TOKEN)) return sendJsonPrivate(res, 401, { ok: false, errors: ['Niet geautoriseerd.'] }, { 'WWW-Authenticate': 'Bearer' });

  const { path, query } = route(req);
  try {
    /* ---------- Artikelen ---------- */
    if (path === 'artikelen' && req.method === 'GET') {
      const slug = query.get('slug');
      if (slug) {
        const a = await store.getArticle(slug);
        return a ? sendJsonPrivate(res, 200, { ok: true, article: a }) : sendJsonPrivate(res, 404, { ok: false, errors: ['Niet gevonden.'] });
      }
      return sendJsonPrivate(res, 200, { ok: true, articles: (await store.listArticles()).map(summary) });
    }

    if (path === 'artikelen' && req.method === 'POST') {
      const input = await readJson(req);
      const errors = checkRedactieInput(input);
      if (errors.length) return sendJsonPrivate(res, 422, { ok: false, errors });
      const slug = input.slug || slugify(input.title || '');
      const current = await store.getArticle(slug);
      if (current && !EDITABLE.has(current.status))
        return sendJsonPrivate(res, 409, { ok: false, errors: ['Dit artikel is al goedgekeurd of gepubliceerd en kan alleen in /beheer worden gewijzigd.'] });
      let next = current ? applyContent(current, input) : newArticle({ ...input, slug }, { allowSubmit: true });
      if (current && input.status) next.status = input.status;
      // Ter goedkeuring aanbieden kan alleen met een volledig artikel.
      const check = validateArticle(next);
      const blocking = next.status === 'ter-goedkeuring' ? check : check.filter((e) => /Titel|Slug|categorie|Afbeelding|Alt-tekst|H1/.test(e));
      if (blocking.length) return sendJsonPrivate(res, 422, { ok: false, errors: blocking });
      await store.saveArticle(next, current?.sha || null, `Nieuws: "${next.title}" ${current ? 'bijgewerkt' : 'aangemaakt'} via redactie-API (${next.status})`);
      return sendJsonPrivate(res, current ? 200 : 201, { ok: true, article: summary(next), warnings: check });
    }

    /* ---------- Socialmedia ---------- */
    if (path === 'social' && req.method === 'GET') {
      const slug = query.get('slug');
      if (slug) {
        const s = await store.getSocial(slug);
        return s ? sendJsonPrivate(res, 200, { ok: true, social: s }) : sendJsonPrivate(res, 404, { ok: false, errors: ['Niet gevonden.'] });
      }
      // Wachtrij voor een geautoriseerde integratie: alleen door de eigenaar goedgekeurde, nog niet geplaatste berichten.
      const items = [];
      for (const s of await store.listSocial()) {
        for (const [platform, p] of Object.entries(s.platforms)) {
          if (p.status === 'goedgekeurd') items.push({ article: s.article, platform, text: p.text, approvedBy: p.approvedBy, approvedAt: p.approvedAt });
        }
      }
      return sendJsonPrivate(res, 200, { ok: true, approved: items });
    }

    if (path === 'social' && req.method === 'POST') {
      const input = await readJson(req);
      const article = await store.getArticle(input.slug);
      if (!article) return sendJsonPrivate(res, 404, { ok: false, errors: ['Artikel niet gevonden.'] });
      const social = await store.getSocial(article.slug);
      const p = social.platforms[input.platform];
      if (!p) return sendJsonPrivate(res, 422, { ok: false, errors: ['Onbekend platform (linkedin, instagram of facebook).'] });
      if (p.status !== 'concept') return sendJsonPrivate(res, 409, { ok: false, errors: ['Dit bericht is al goedgekeurd of geplaatst; wijzigen kan alleen in /beheer.'] });
      const next = applySocialAction(social, input.platform, 'opslaan', { text: input.text });
      await store.saveSocial(next, `Social: ${input.platform}-concept voor "${article.title}" via redactie-API`);
      return sendJsonPrivate(res, 200, { ok: true, platform: input.platform, status: 'concept', articleApproved: isApproved(article) });
    }

    if (path === 'social/gepubliceerd' && req.method === 'POST') {
      const input = await readJson(req);
      const article = await store.getArticle(input.slug);
      if (!article) return sendJsonPrivate(res, 404, { ok: false, errors: ['Artikel niet gevonden.'] });
      const social = await store.getSocial(article.slug);
      const next = applySocialAction(social, input.platform, 'gepubliceerd', { article, by: BY, url: input.url });
      await store.saveSocial(next, `Social: ${input.platform}-bericht voor "${article.title}" geplaatst (${BY})`);
      return sendJsonPrivate(res, 200, { ok: true, platform: input.platform, status: 'gepubliceerd', url: input.url });
    }
  } catch (err) {
    return fail(res, err);
  }
  return sendJsonPrivate(res, 404, { ok: false, errors: ['Onbekend eindpunt.'] });
}
