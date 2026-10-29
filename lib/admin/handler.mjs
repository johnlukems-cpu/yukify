// Afhandeling van /beheer (inloggen, artikelen bekijken/bewerken, goedkeuren, inplannen, socialmedia).
// Alles achter een wachtwoord + ondertekende sessie; elke POST vereist een geldig CSRF-token en eigen Origin.
import { layout } from '../../src/lib/components.mjs';
import { articlePage } from '../../src/pages/news.mjs';
import { isApproved, isPublic, validateArticle } from '../news.mjs';
import { readForm, parseCookies, clientIp, isHttps, sendHtml, redirect } from '../http.mjs';
import {
  adminConfig,
  verifyPassword,
  createSession,
  verifySession,
  csrfToken,
  verifyCsrf,
  sessionCookie,
  clearSessionCookie,
  loginBlocked,
  registerFailedLogin,
  SESSION_COOKIE,
} from './auth.mjs';
import * as store from './store.mjs';
import { WorkflowError, applyContent, newArticle, applyAction, applySocialAction, amsterdamLocalToIso, amsterdamDate, slugify } from './workflow.mjs';
import * as views from './views.mjs';

const OK_MESSAGES = {
  opgeslagen: 'Wijzigingen opgeslagen. De website wordt over enkele minuten bijgewerkt als het artikel openbaar is.',
  aangemaakt: 'Artikel aangemaakt als concept.',
  indienen: 'Artikel staat nu ter goedkeuring.',
  goedkeuren: 'Artikel goedgekeurd. Het is nog niet openbaar: kies “Nu publiceren” of plan het in.',
  inplannen: 'Artikel ingepland.',
  publiceren: 'Artikel gepubliceerd. De website wordt over enkele minuten bijgewerkt.',
  terugzetten: 'Artikel is teruggezet naar concept en staat niet (meer) op de website.',
  social: 'Socialmediabericht bijgewerkt.',
  uitgelogd: 'U bent uitgelogd.',
};

/** Pad binnen /beheer: uit de URL of (na een Vercel-rewrite) uit ?__p=. */
export function subPath(req) {
  const url = new URL(req.url, 'http://localhost');
  const viaQuery = url.searchParams.get('__p');
  const raw = viaQuery !== null ? viaQuery : url.pathname.replace(/^\/(api\/)?beheer\/?/, '');
  return { path: raw.replace(/^\/+|\/+$/g, ''), query: url.searchParams };
}

/** Komt het formulier van deze site? (aanvulling op SameSite-cookie en CSRF-token) */
function sameOrigin(req) {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function storeError(err) {
  if (err instanceof WorkflowError) return err.message;
  if (err?.code === 'CONFLICT') return 'Het artikel is intussen elders gewijzigd. Open het opnieuw en voer uw wijziging nogmaals uit.';
  if (err?.code === 'STORE_UNAVAILABLE') return 'GitHub is op dit moment niet bereikbaar. Probeer het later opnieuw.';
  if (err?.code === 'STORE_401' || err?.code === 'STORE_403') return 'Geen toegang tot de repository. Controleer GITHUB_TOKEN en GITHUB_REPO.';
  console.error('[beheer] Fout bij opslaan:', err?.code || err?.message);
  return 'Opslaan is mislukt. Probeer het later opnieuw.';
}

export async function handleBeheer(req, res) {
  const cfg = adminConfig();
  if (!cfg.ok) return sendHtml(res, 503, views.setupPage(cfg.missing));

  const { path, query } = subPath(req);
  const secure = isHttps(req);
  const cookie = parseCookies(req)[SESSION_COOKIE];
  const loggedIn = verifySession(cfg.secret, cookie);
  const session = loggedIn ? { csrf: csrfToken(cfg.secret, cookie) } : null;
  const method = req.method;

  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') return sendHtml(res, 405, views.errorPage(405, 'Methode niet toegestaan.'), { Allow: 'GET, POST' });

  /* ---------- Inloggen / uitloggen ---------- */
  if (path === 'inloggen' && method === 'POST') {
    if (!sameOrigin(req)) return sendHtml(res, 403, views.errorPage(403, 'Ongeldige aanvraag.'));
    const ip = clientIp(req);
    if (loginBlocked(ip)) return sendHtml(res, 429, views.loginPage({ error: 'Te veel inlogpogingen. Probeer het over een kwartier opnieuw.' }), { 'Retry-After': '900' });
    const form = await readForm(req, 4096).catch(() => ({}));
    if (!verifyPassword(form.wachtwoord || '', cfg.passwordHash)) {
      registerFailedLogin(ip);
      return sendHtml(res, 401, views.loginPage({ error: 'Onjuist wachtwoord.' }));
    }
    return redirect(res, '/beheer', { 'Set-Cookie': sessionCookie(createSession(cfg.secret), { secure }) });
  }

  if (!loggedIn) {
    if (method === 'POST') return sendHtml(res, 401, views.loginPage({ error: 'Uw sessie is verlopen. Log opnieuw in.' }));
    if (path !== '') return redirect(res, '/beheer');
    return sendHtml(res, 200, views.loginPage());
  }

  /* ---------- Vanaf hier: ingelogd ---------- */
  let form = {};
  if (method === 'POST') {
    if (!sameOrigin(req)) return sendHtml(res, 403, views.errorPage(403, 'Ongeldige aanvraag.', session));
    try {
      form = await readForm(req);
    } catch (err) {
      return sendHtml(res, err.status || 400, views.errorPage(err.status || 400, 'De invoer is te groot of ongeldig.', session));
    }
    if (!verifyCsrf(cfg.secret, cookie, form.csrf)) return sendHtml(res, 403, views.errorPage(403, 'Het formulier is verlopen. Laad de pagina opnieuw.', session));
  }

  if (path === 'uitloggen' && method === 'POST') {
    return redirect(res, '/beheer', { 'Set-Cookie': clearSessionCookie({ secure }) });
  }

  try {
    if (path === '' && method !== 'POST') {
      const articles = await store.listArticles();
      return sendHtml(res, 200, views.listPage({ articles, session, ok: OK_MESSAGES[query.get('ok')] }));
    }

    if (path === 'nieuw' && method !== 'POST') return sendHtml(res, 200, views.newPage({ session }));

    if (path === 'artikel' && method !== 'POST') {
      const a = await store.getArticle(query.get('slug'));
      if (!a) return sendHtml(res, 404, views.errorPage(404, 'Dit artikel bestaat niet.', session));
      return sendHtml(res, 200, views.editPage({ article: a, social: await store.getSocial(a.slug), session, ok: OK_MESSAGES[query.get('ok')] }));
    }

    if (path === 'voorbeeld' && method !== 'POST') {
      const a = await store.getArticle(query.get('slug'));
      if (!a) return sendHtml(res, 404, views.errorPage(404, 'Dit artikel bestaat niet.', session));
      const pub = (await store.listArticles()).filter((x) => isPublic(x));
      const p = articlePage(a, pub, { preview: true });
      // Eigen assetversie: voorkomt dat een oude, onveranderlijk gecachete stylesheet wordt gebruikt.
      return sendHtml(res, 200, layout({ ...p, assetVersion: `beheer-${Date.now().toString(36)}` }, p.render()));
    }

    if (path === 'opslaan' && method === 'POST') return await saveArticle(res, form, session, cfg);
    if (path === 'status' && method === 'POST') return await changeStatus(res, form, session, cfg);
    if (path === 'social' && method === 'POST') return await changeSocial(res, form, session, cfg);
  } catch (err) {
    return sendHtml(res, 502, views.errorPage(502, storeError(err), session));
  }

  return sendHtml(res, 404, views.errorPage(404, 'Deze beheerpagina bestaat niet.', session));
}

async function saveArticle(res, form, session, cfg) {
  if (form.new) {
    const a = newArticle({ ...form, slug: form.slug || slugify(form.title || '') });
    const errors = validateArticle(a).filter((e) => DRAFT_CHECKS.test(e) || /Slug/.test(e));
    if (errors.length) return sendHtml(res, 422, views.newPage({ session, input: form, error: errors.join(' ') }));
    if (await store.getArticle(a.slug)) return sendHtml(res, 422, views.newPage({ session, input: form, error: 'Er bestaat al een artikel met deze slug.' }));
    try {
      await store.saveArticle(a, null, `Nieuws: concept "${a.title}" aangemaakt via beheer`);
    } catch (err) {
      return sendHtml(res, 502, views.newPage({ session, input: form, error: storeError(err) }));
    }
    return redirect(res, `/beheer/artikel?slug=${encodeURIComponent(a.slug)}&ok=aangemaakt`);
  }

  const current = await store.getArticle(form.slug);
  if (!current) return sendHtml(res, 404, views.errorPage(404, 'Dit artikel bestaat niet.', session));
  let next = applyContent(current, form);
  if (!form.featured) delete next.featured;
  const wasApproved = isApproved(current);
  if (wasApproved) {
    // De beheerder wijzigt zelf een goedgekeurd artikel: dat geldt als nieuwe goedkeuring van de inhoud.
    next = { ...next, approvedBy: cfg.name, approvedAt: new Date().toISOString() };
    if (current.status === 'gepubliceerd') next.updated = amsterdamDate();
  }
  // Concepten mogen onvolledig zijn; basisvelden moeten wel kloppen. Goedgekeurde artikelen moeten volledig geldig blijven.
  const errors = validateArticle(next).filter((e) => wasApproved || DRAFT_CHECKS.test(e));
  const fail = (error, status = 422) => sendHtml(res, status, views.editPage({ article: { ...next, sha: form.sha }, social: emptySocialFor(next.slug), session, error }));
  if (errors.length) return fail(`Niet opgeslagen: ${errors.join(' ')}`);
  try {
    await store.saveArticle(next, form.sha || current.sha, `Nieuws: "${next.title}" bijgewerkt via beheer`);
  } catch (err) {
    return fail(storeError(err), err?.code === 'CONFLICT' ? 409 : 502);
  }
  return redirect(res, `/beheer/artikel?slug=${encodeURIComponent(next.slug)}&ok=opgeslagen`);
}

const DRAFT_CHECKS = /Titel|categorie|Afbeelding|Alt-tekst|H1/;
const emptySocialFor = (slug) => store.emptySocial(slug);

async function changeStatus(res, form, session, cfg) {
  const current = await store.getArticle(form.slug);
  if (!current) return sendHtml(res, 404, views.errorPage(404, 'Dit artikel bestaat niet.', session));
  const fail = async (error, status = 422) =>
    sendHtml(res, status, views.editPage({ article: current, social: await store.getSocial(current.slug), session, error }));
  if (form.action === 'goedkeuren' && form.bevestig !== 'ja') return fail('Bevestig dat u de inhoud, feiten en bronnen hebt gecontroleerd.');
  let next;
  try {
    next = applyAction(current, form.action, {
      by: cfg.name,
      publishAt: form.action === 'inplannen' ? amsterdamLocalToIso(form.publishAt) : undefined,
    });
  } catch (err) {
    if (err instanceof WorkflowError) return fail(err.message);
    throw err;
  }
  try {
    await store.saveArticle(next, form.sha || current.sha, `Nieuws: "${current.title}" → ${next.status} (${form.action}) door ${cfg.name}`);
  } catch (err) {
    return fail(storeError(err), err?.code === 'CONFLICT' ? 409 : 502);
  }
  return redirect(res, `/beheer/artikel?slug=${encodeURIComponent(current.slug)}&ok=${encodeURIComponent(form.action)}`);
}

async function changeSocial(res, form, session, cfg) {
  const article = await store.getArticle(form.slug);
  if (!article) return sendHtml(res, 404, views.errorPage(404, 'Dit artikel bestaat niet.', session));
  const social = await store.getSocial(article.slug);
  const fail = (error, status = 422) => sendHtml(res, status, views.editPage({ article, social, session, error }));
  let next;
  try {
    next = applySocialAction(social, form.platform, form.action, { article, by: cfg.name, text: form.text, url: form.url });
  } catch (err) {
    if (err instanceof WorkflowError) return fail(err.message);
    throw err;
  }
  try {
    await store.saveSocial(next, `Social: ${form.platform}-bericht voor "${article.title}" → ${form.action} door ${cfg.name}`);
  } catch (err) {
    return fail(storeError(err), err?.code === 'CONFLICT' ? 409 : 502);
  }
  return redirect(res, `/beheer/artikel?slug=${encodeURIComponent(article.slug)}&ok=social#social-titel`);
}
