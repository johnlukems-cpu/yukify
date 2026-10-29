// Statusovergangen voor artikelen en socialmediaberichten (pure functies, los te testen).
// Kernregel: alleen een persoon in /beheer kan goedkeuren; de redactie-API en automatisering nooit.
import { validateArticle, isApproved, categoryById, SLUG_RE } from '../news.mjs';

export class WorkflowError extends Error {}

const nowIso = (now) => new Date(now).toISOString();
/** Datum (JJJJ-MM-DD) in Nederlandse tijd. */
export function amsterdamDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}

/** Zet "JJJJ-MM-DDTHH:mm" (Nederlandse tijd, uit een datetime-local-veld) om naar een ISO-tijdstip. */
export function amsterdamLocalToIso(local) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local || '');
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const offsetAt = (t) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Amsterdam', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        .formatToParts(new Date(t))
        .map((p) => [p.type, p.value]),
    );
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - t;
  };
  let t = asUtc - offsetAt(asUtc);
  t = asUtc - offsetAt(t);
  return new Date(t).toISOString();
}

/** Velden die via het formulier of de redactie-API mogen worden aangepast (nooit status of goedkeuring). */
export function applyContent(article, input) {
  const next = { ...article };
  for (const k of ['title', 'category', 'description', 'intro', 'body', 'image', 'imageAlt', 'reviewNotes']) {
    if (input[k] !== undefined) next[k] = String(input[k]).replace(/\r\n/g, '\n').trim();
  }
  if (input.featured !== undefined) next.featured = input.featured === true || input.featured === 'on' || input.featured === 'true';
  if (!next.image) delete next.image;
  if (!next.featured) delete next.featured;
  return next;
}

/** Nieuw conceptartikel (status altijd concept of ter goedkeuring). */
export function newArticle(input, { allowSubmit = false } = {}) {
  const slug = String(input.slug || slugify(input.title || '')).slice(0, 80);
  const a = applyContent({ slug, status: 'concept', author: 'Yukify Administratie & Support' }, input);
  if (allowSubmit && input.status === 'ter-goedkeuring') a.status = 'ter-goedkeuring';
  return a;
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' en ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

/** Voert een statusactie uit. Gooit WorkflowError met een Nederlandse uitleg als het niet mag. */
export function applyAction(article, action, { by, now = Date.now(), publishAt } = {}) {
  const a = { ...article };
  const s = a.status;
  const must = (cond, msg) => {
    if (!cond) throw new WorkflowError(msg);
  };
  switch (action) {
    case 'indienen':
      must(s === 'concept', 'Alleen een concept kan ter goedkeuring worden aangeboden.');
      a.status = 'ter-goedkeuring';
      break;
    case 'goedkeuren': {
      must(s === 'concept' || s === 'ter-goedkeuring', 'Dit artikel is al goedgekeurd of gepubliceerd.');
      must(Boolean(by), 'Goedkeuren kan alleen door een ingelogde beheerder.');
      const candidate = { ...a, status: 'goedgekeurd', approvedBy: by, approvedAt: nowIso(now) };
      const errors = validateArticle(candidate);
      must(errors.length === 0, `Het artikel is nog niet compleet: ${errors.join(' ')}`);
      Object.assign(a, { status: 'goedgekeurd', approvedBy: by, approvedAt: nowIso(now) });
      break;
    }
    case 'inplannen': {
      must((s === 'goedgekeurd' || s === 'ingepland') && isApproved(a), 'Alleen een goedgekeurd artikel kan worden ingepland.');
      const t = new Date(publishAt || '').getTime();
      must(Number.isFinite(t), 'Kies een geldige datum en tijd.');
      must(t > now, 'Het publicatiemoment moet in de toekomst liggen.');
      Object.assign(a, { status: 'ingepland', publishAt: new Date(t).toISOString(), date: amsterdamDate(t) });
      break;
    }
    case 'publiceren':
      must((s === 'goedgekeurd' || s === 'ingepland') && isApproved(a), 'Alleen een goedgekeurd artikel kan worden gepubliceerd.');
      a.status = 'gepubliceerd';
      if (!a.date || s === 'goedgekeurd') a.date = amsterdamDate(now);
      delete a.publishAt;
      break;
    case 'terugzetten':
      must(s !== 'concept', 'Dit artikel is al een concept.');
      a.status = 'concept';
      delete a.approvedBy;
      delete a.approvedAt;
      delete a.publishAt;
      break;
    default:
      throw new WorkflowError('Onbekende actie.');
  }
  return a;
}

/** Artikel dat de redactie-API mag aanmaken of bijwerken (nooit goedgekeurde artikelen). */
export function checkRedactieInput(input) {
  const errors = [];
  if (input.slug !== undefined && !SLUG_RE.test(String(input.slug))) errors.push('Ongeldige slug.');
  if (input.category !== undefined && !categoryById[input.category]) errors.push('Ongeldige categorie.');
  if (input.status !== undefined && !['concept', 'ter-goedkeuring'].includes(input.status)) errors.push('De redactie-API mag alleen de status concept of ter-goedkeuring zetten.');
  for (const k of ['approvedBy', 'approvedAt', 'publishAt', 'date']) if (input[k] !== undefined) errors.push(`Het veld ${k} kan alleen in /beheer worden gezet.`);
  return errors;
}

/* ---------- Socialmediaberichten ---------- */
export const SOCIAL_LIMITS = { linkedin: 3000, instagram: 2200, facebook: 5000 };

export function applySocialAction(social, platform, action, { article, by, now = Date.now(), text, url } = {}) {
  const p = social.platforms[platform];
  if (!p) throw new WorkflowError('Onbekend platform.');
  const next = { ...social, platforms: { ...social.platforms, [platform]: { ...p } } };
  const q = next.platforms[platform];
  const must = (cond, msg) => {
    if (!cond) throw new WorkflowError(msg);
  };
  switch (action) {
    case 'opslaan': {
      must(q.status !== 'gepubliceerd', 'Een gepubliceerd bericht kan niet meer worden gewijzigd.');
      const t = String(text ?? '').replace(/\r\n/g, '\n').trim();
      must(t.length <= SOCIAL_LIMITS[platform], `De tekst is te lang voor ${platform} (maximaal ${SOCIAL_LIMITS[platform]} tekens).`);
      if (t !== q.text && q.status === 'goedgekeurd') {
        // Gewijzigde tekst moet opnieuw worden goedgekeurd.
        q.status = 'concept';
        delete q.approvedBy;
        delete q.approvedAt;
      }
      q.text = t;
      break;
    }
    case 'goedkeuren':
      must(isApproved(article), 'Keur eerst het artikel goed; socialmediaberichten worden gemaakt op basis van een goedgekeurd artikel.');
      must(q.status === 'concept', 'Dit bericht is al goedgekeurd of gepubliceerd.');
      must(Boolean(by), 'Goedkeuren kan alleen door een ingelogde beheerder.');
      must(q.text.length >= 20, 'Schrijf eerst de tekst van het bericht.');
      Object.assign(q, { status: 'goedgekeurd', approvedBy: by, approvedAt: nowIso(now) });
      break;
    case 'gepubliceerd':
      must(q.status === 'goedgekeurd', 'Alleen een goedgekeurd bericht kan als gepubliceerd worden gemarkeerd.');
      must(/^https:\/\/[^\s]+$/.test(String(url || '')), 'Vul de https-link naar het geplaatste bericht in.');
      Object.assign(q, { status: 'gepubliceerd', publishedUrl: String(url), publishedAt: nowIso(now) });
      break;
    case 'terugzetten':
      must(q.status === 'goedgekeurd', 'Alleen een goedgekeurd (nog niet gepubliceerd) bericht kan terug naar concept.');
      q.status = 'concept';
      delete q.approvedBy;
      delete q.approvedAt;
      break;
    default:
      throw new WorkflowError('Onbekende actie.');
  }
  return next;
}
