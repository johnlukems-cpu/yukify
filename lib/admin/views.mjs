// HTML voor /beheer. Alleen server-side; er staat geen JavaScript of geheim in deze pagina's.
import { esc } from '../../src/lib/components.mjs';
import { categories, categoryById, statuses, statusLabel, isApproved, isPublic, publicationDate, formatDateNl } from '../news.mjs';
import { PLATFORMS } from './store.mjs';
import { SOCIAL_LIMITS } from './workflow.mjs';

const css = `
:root{--g:#183F35;--g2:#245446;--c:#F7F2E8;--gold:#c69a5b;--ink:#1d2b27;--mut:#5b6b66;--line:#e2dccf;--red:#a3341f;--ok:#2f6b3a}
*{box-sizing:border-box}body{margin:0;font-family:Inter Variable,Inter,system-ui,sans-serif;background:var(--c);color:var(--ink);line-height:1.5}
a{color:var(--g)}h1,h2,h3{font-family:Manrope Variable,Manrope,system-ui,sans-serif;color:var(--g);line-height:1.2}
.bar{background:var(--g);color:#fff;padding:.75rem 1rem;display:flex;gap:1rem;align-items:center;justify-content:space-between;flex-wrap:wrap}
.bar a{color:#fff;font-weight:600;text-decoration:none}.bar form{margin:0}
.wrap{max-width:1100px;margin:0 auto;padding:1.5rem 1rem 4rem}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:1.25rem;margin:0 0 1.25rem}
.btn{display:inline-block;border:2px solid var(--g);background:var(--g);color:#fff;border-radius:999px;padding:.5rem 1rem;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}
.btn--light{background:#fff;color:var(--g)}.btn--gold{background:var(--gold);border-color:var(--gold);color:#0f2a23}.btn--danger{background:#fff;color:var(--red);border-color:var(--red)}
.btn:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
label{display:block;font-weight:600;margin:.9rem 0 .25rem}.hint{color:var(--mut);font-size:.9rem;margin:.2rem 0 0}
input[type=text],input[type=password],input[type=url],input[type=datetime-local],select,textarea{width:100%;padding:.6rem .7rem;border:1px solid #b9b2a3;border-radius:8px;font:inherit;background:#fff}
textarea{min-height:7rem}textarea.body{min-height:28rem;font-family:ui-monospace,Menlo,monospace;font-size:.9rem}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid var(--line);vertical-align:top}
.badge{display:inline-block;border-radius:999px;padding:.1rem .6rem;font-size:.8rem;font-weight:700;background:#ece6d8;color:var(--ink)}
.badge--goedgekeurd,.badge--ingepland{background:#f3e6cc;color:#6d4c16}.badge--gepubliceerd{background:#dcefe0;color:var(--ok)}.badge--ter-goedkeuring{background:#e1ebf4;color:#1f4a6e}
.msg{border-radius:10px;padding:.75rem 1rem;margin:0 0 1.25rem;border:1px solid}.msg--err{background:#fbecea;border-color:#e3b3aa;color:#6d1f12}.msg--ok{background:#e6f3e8;border-color:#a9d1b0;color:#1e4d27}
.row{display:flex;gap:.75rem;flex-wrap:wrap;align-items:flex-end}.row>*{margin:0}
.grid2{display:grid;gap:1.25rem;grid-template-columns:1fr}@media(min-width:900px){.grid2{grid-template-columns:2fr 1fr}}
.notes{white-space:pre-wrap;background:#fffaf0;border-left:4px solid var(--gold);padding:.75rem 1rem;border-radius:6px}
dl{margin:0}dt{font-weight:600;margin-top:.5rem}dd{margin:0}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

export function page(title, body, { session = null } = {}) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} | Beheer Yukify</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${css}</style>
</head>
<body>
<header class="bar"><a href="/beheer">Yukify · Beheer Nieuws &amp; Inzichten</a>${
    session
      ? `<form method="post" action="/beheer/uitloggen">${csrfField(session.csrf)}<button class="btn btn--light" type="submit">Uitloggen</button></form>`
      : ''
  }</header>
<main class="wrap" id="main">
${body}
</main>
</body>
</html>`;
}

const csrfField = (token) => `<input type="hidden" name="csrf" value="${esc(token)}">`;
const badge = (s) => `<span class="badge badge--${esc(s)}">${esc(statusLabel[s] || s)}</span>`;
const messages = ({ error, ok }) =>
  `${error ? `<div class="msg msg--err" role="alert">${esc(error)}</div>` : ''}${ok ? `<div class="msg msg--ok" role="status">${esc(ok)}</div>` : ''}`;
const dateTimeNl = (iso) =>
  iso ? new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso)) : '';

export function setupPage(missing) {
  return page(
    'Beheer niet ingesteld',
    `<h1>Beheer is nog niet ingesteld</h1>
<div class="card"><p>Het beheer is uitgeschakeld tot de volgende server-side omgevingsvariabelen zijn ingesteld (Vercel → Settings → Environment Variables):</p>
<ul>${missing.map((m) => `<li><code>${esc(m)}</code></li>`).join('')}</ul>
<p class="hint">Zie <code>docs/redactie-workflow.md</code> in de repository voor de stappen. Waarden worden hier nooit getoond.</p></div>`,
  );
}

export function loginPage({ error } = {}) {
  return page(
    'Inloggen',
    `<h1>Inloggen</h1>
${messages({ error })}
<form class="card" method="post" action="/beheer/inloggen" style="max-width:420px">
  <label for="wachtwoord">Wachtwoord</label>
  <input id="wachtwoord" name="wachtwoord" type="password" autocomplete="current-password" required>
  <p style="margin-top:1rem"><button class="btn" type="submit">Inloggen</button></p>
</form>`,
  );
}

export function listPage({ articles, session, ok, error, now = new Date() }) {
  const counts = Object.fromEntries(statuses.map((s) => [s.id, articles.filter((a) => a.status === s.id).length]));
  return page(
    'Artikelen',
    `<h1>Nieuws &amp; Inzichten — artikelen</h1>
${messages({ ok, error })}
<div class="card">
  <p>${statuses.map((s) => `${badge(s.id)} ${counts[s.id]}`).join(' &nbsp; ')}</p>
  <p class="hint">De automatische redactie publiceert artikelen die alle kwaliteitscontroles doorstaan; artikelen die niet slagen blijven concept met de open punten. U kunt hier elk artikel aanpassen, zelf goedkeuren of offline halen. Elke wijziging wordt als commit in GitHub opgeslagen; de website wordt daarna automatisch opnieuw gebouwd (enkele minuten).</p>
  <p><a class="btn btn--gold" href="/beheer/nieuw">Nieuw artikel</a></p>
</div>
<div class="card" style="overflow-x:auto">
<table>
  <caption class="visually-hidden">Alle artikelen</caption>
  <thead><tr><th scope="col">Titel</th><th scope="col">Categorie</th><th scope="col">Status</th><th scope="col">Datum</th><th scope="col">Op website</th></tr></thead>
  <tbody>
  ${
    articles.length
      ? articles
          .map(
            (a) => `<tr>
    <td><a href="/beheer/artikel?slug=${encodeURIComponent(a.slug)}">${esc(a.title || a.slug)}</a><br><a class="hint" href="/beheer/voorbeeld?slug=${encodeURIComponent(a.slug)}">Voorbeeld</a></td>
    <td>${esc(categoryById[a.category]?.label || a.category || '')}</td>
    <td>${badge(a.status)}</td>
    <td>${a.status === 'ingepland' ? esc(dateTimeNl(a.publishAt)) : esc(formatDateNl(publicationDate(a)) || '—')}</td>
    <td>${isPublic(a, now) ? 'Ja' : 'Nee'}</td>
  </tr>`,
          )
          .join('')
      : '<tr><td colspan="5">Nog geen artikelen.</td></tr>'
  }
  </tbody>
</table>
</div>`,
    { session },
  );
}

function articleFields(a, { isNew }) {
  const v = (k) => esc(a[k] || '');
  return `
  <label for="title">Titel</label>
  <input id="title" name="title" type="text" required minlength="10" maxlength="120" value="${v('title')}">
  <label for="slug">URL (slug)</label>
  ${
    isNew
      ? `<input id="slug" name="slug" type="text" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" value="${v('slug')}" aria-describedby="slug-hint"><p class="hint" id="slug-hint">Leeg laten om de slug uit de titel te maken. Wordt /nieuws/&lt;slug&gt;/.</p>`
      : `<input id="slug" type="text" value="${v('slug')}" readonly aria-describedby="slug-hint"><input type="hidden" name="slug" value="${v('slug')}"><p class="hint" id="slug-hint">De URL ligt vast: /nieuws/${v('slug')}/</p>`
  }
  <label for="category">Categorie</label>
  <select id="category" name="category" required>${categories.map((c) => `<option value="${c.id}"${a.category === c.id ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select>
  <label for="description">Meta description (zoekmachines, 50–170 tekens)</label>
  <textarea id="description" name="description" maxlength="170" style="min-height:4rem">${v('description')}</textarea>
  <label for="intro">Introductie</label>
  <textarea id="intro" name="intro">${v('intro')}</textarea>
  <label for="body">Artikeltekst (Markdown: ## tussenkop, - lijst, [tekst](https://…))</label>
  <textarea id="body" name="body" class="body">${esc(a.body || '')}</textarea>
  <label for="image">Afbeelding (optioneel)</label>
  <input id="image" name="image" type="text" value="${v('image')}" aria-describedby="image-hint"><p class="hint" id="image-hint">Pad onder /assets/img/. Leeg = standaardillustratie van de categorie.</p>
  <label for="imageAlt">Alt-tekst afbeelding</label>
  <input id="imageAlt" name="imageAlt" type="text" value="${v('imageAlt')}">
  <label><input type="checkbox" name="featured"${a.featured ? ' checked' : ''}> Uitlichten op de overzichtspagina</label>
  <label for="reviewNotes">Redactie-aantekeningen (alleen zichtbaar in beheer)</label>
  <textarea id="reviewNotes" name="reviewNotes">${v('reviewNotes')}</textarea>`;
}

export function newPage({ session, input = {}, error }) {
  return page(
    'Nieuw artikel',
    `<p><a href="/beheer">← Alle artikelen</a></p>
<h1>Nieuw artikel</h1>
${messages({ error })}
<form class="card" method="post" action="/beheer/opslaan">
  ${csrfField(session.csrf)}<input type="hidden" name="new" value="1">
  ${articleFields(input, { isNew: true })}
  <p style="margin-top:1.25rem"><button class="btn" type="submit">Opslaan als concept</button></p>
</form>`,
    { session },
  );
}

function statusPanel(a, session) {
  const s = a.status;
  const action = (name, label, cls = '', extra = '') =>
    `<form method="post" action="/beheer/status">${csrfField(session.csrf)}<input type="hidden" name="slug" value="${esc(a.slug)}"><input type="hidden" name="sha" value="${esc(a.sha || '')}"><input type="hidden" name="action" value="${name}">${extra}<button class="btn ${cls}" type="submit">${label}</button></form>`;
  const parts = [];
  if (s === 'concept') parts.push(action('indienen', 'Ter goedkeuring aanbieden', 'btn--light'));
  if (s === 'concept' || s === 'ter-goedkeuring')
    parts.push(
      action(
        'goedkeuren',
        'Goedkeuren',
        'btn--gold',
        `<label style="font-weight:400"><input type="checkbox" name="bevestig" value="ja" required> Ik heb de inhoud, feiten en bronnen gecontroleerd en keur dit artikel goed.</label>`,
      ),
    );
  if (s === 'goedgekeurd' || s === 'ingepland') {
    parts.push(action('publiceren', 'Nu publiceren', 'btn--gold'));
    parts.push(
      action(
        'inplannen',
        s === 'ingepland' ? 'Nieuw moment opslaan' : 'Inplannen',
        'btn--light',
        `<label for="publishAt">Publicatiemoment (Nederlandse tijd)</label><input id="publishAt" name="publishAt" type="datetime-local" required><p class="hint">Wordt gepubliceerd bij de eerstvolgende dagelijkse publicatieronde na dit moment.</p>`,
      ),
    );
  }
  if (s !== 'concept') parts.push(action('terugzetten', s === 'gepubliceerd' ? 'Offline halen (terug naar concept)' : 'Terug naar concept', 'btn--danger'));
  return `<section class="card" aria-labelledby="status-titel">
  <h2 id="status-titel">Status</h2>
  <p>${badge(s)}</p>
  <dl>
    ${a.approvedBy ? `<dt>Goedgekeurd door</dt><dd>${esc(a.approvedBy)} · ${esc(dateTimeNl(a.approvedAt))}</dd>` : ''}
    ${a.publishAt ? `<dt>Ingepland voor</dt><dd>${esc(dateTimeNl(a.publishAt))}</dd>` : ''}
    ${publicationDate(a) ? `<dt>Publicatiedatum</dt><dd>${esc(formatDateNl(publicationDate(a)))}</dd>` : ''}
  </dl>
  <div style="display:grid;gap:1rem;margin-top:1rem">${parts.join('')}</div>
</section>`;
}

function socialPanel(a, social, session) {
  const approved = isApproved(a);
  const blocks = PLATFORMS.map(({ id, label }) => {
    const p = social.platforms[id];
    const form = (action, inner, btn, cls = '') =>
      `<form method="post" action="/beheer/social">${csrfField(session.csrf)}<input type="hidden" name="slug" value="${esc(a.slug)}"><input type="hidden" name="platform" value="${id}"><input type="hidden" name="action" value="${action}">${inner}<button class="btn ${cls}" type="submit">${btn}</button></form>`;
    const parts = [];
    if (p.status !== 'gepubliceerd') {
      parts.push(
        form(
          'opslaan',
          `<label for="text-${id}">Tekst ${label} (max. ${SOCIAL_LIMITS[id]} tekens)</label><textarea id="text-${id}" name="text" maxlength="${SOCIAL_LIMITS[id]}">${esc(p.text || '')}</textarea>`,
          'Tekst opslaan',
          'btn--light',
        ),
      );
    } else {
      parts.push(`<p class="notes">${esc(p.text)}</p>`);
    }
    if (p.status === 'concept' && approved && p.text) parts.push(form('goedkeuren', '', `${label}-bericht goedkeuren`, 'btn--gold'));
    if (p.status === 'goedgekeurd') {
      parts.push(
        form(
          'gepubliceerd',
          `<label for="url-${id}">Link naar het geplaatste bericht</label><input id="url-${id}" name="url" type="url" pattern="https://.+" required placeholder="https://">`,
          'Markeren als geplaatst',
        ),
      );
      parts.push(form('terugzetten', '', 'Terug naar concept', 'btn--danger'));
    }
    return `<div class="card"><h3>${label} ${badge(p.status)}</h3>
${p.approvedBy ? `<p class="hint">Goedgekeurd door ${esc(p.approvedBy)} · ${esc(dateTimeNl(p.approvedAt))}</p>` : ''}
${p.publishedUrl ? `<p>Geplaatst: <a href="${esc(p.publishedUrl)}" rel="noopener noreferrer" target="_blank">${esc(p.publishedUrl)}</a> (${esc(dateTimeNl(p.publishedAt))})</p>` : ''}
<div style="display:grid;gap:.75rem">${parts.join('')}</div></div>`;
  });
  return `<section aria-labelledby="social-titel" style="margin-top:2rem">
  <h2 id="social-titel">Socialmediaberichten</h2>
  <p class="hint">Berichten worden automatisch voorbereid en gecontroleerd (status “Goedgekeurd” = klaar voor plaatsing). Plaatsen gebeurt alleen via een gekoppelde, geautoriseerde integratie of door u zelf; leg daarna de link vast.${approved ? '' : ' <strong>Goedkeuren kan pas nadat het artikel zelf is goedgekeurd.</strong>'}</p>
  ${blocks.join('')}
</section>`;
}

export function editPage({ article: a, social, session, error, ok }) {
  const approvedEdit = isApproved(a);
  return page(
    a.title || a.slug,
    `<p><a href="/beheer">← Alle artikelen</a> · <a href="/beheer/voorbeeld?slug=${encodeURIComponent(a.slug)}">Voorbeeld bekijken</a></p>
<h1>${esc(a.title || a.slug)}</h1>
${messages({ error, ok })}
${a.reviewNotes ? `<section class="card" aria-labelledby="notes-titel"><h2 id="notes-titel">Te controleren vóór goedkeuring</h2><div class="notes">${esc(a.reviewNotes)}</div></section>` : ''}
<div class="grid2">
  <form class="card" method="post" action="/beheer/opslaan">
    ${csrfField(session.csrf)}<input type="hidden" name="sha" value="${esc(a.sha || '')}">
    ${articleFields(a, { isNew: false })}
    ${approvedEdit ? '<p class="hint">Dit artikel is goedgekeurd. Door op te slaan keurt u de gewijzigde inhoud opnieuw goed.</p>' : ''}
    <p style="margin-top:1.25rem"><button class="btn" type="submit">Wijzigingen opslaan</button></p>
  </form>
  <div>${statusPanel(a, session)}</div>
</div>
${socialPanel(a, social, session)}`,
    { session },
  );
}

export function errorPage(status, text, session) {
  return page(String(status), `<h1>${status === 404 ? 'Niet gevonden' : 'Er ging iets mis'}</h1><div class="card"><p>${esc(text)}</p><p><a href="/beheer">Terug naar het beheer</a></p></div>`, { session });
}
