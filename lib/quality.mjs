// Automatische redactiecontrole voor Nieuws & Inzichten.
// Een artikel wordt alleen automatisch gepubliceerd als qualityCheck() geen fouten geeft.
// Bij twijfel blokkeert de controle: dan blijft het artikel concept met een lijst van wat ontbreekt.
import { readFileSync } from 'node:fs';
import { validateArticle, categoryById } from './news.mjs';

export const redactieConfig = JSON.parse(readFileSync(new URL('../content/redactie.json', import.meta.url), 'utf8'));

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const FISCAL_CATEGORIES = new Set(['btw-en-belastingen', 'accountancy-en-regelgeving', 'jaarafsluiting']);
const SITE_EMAIL = 'info@yukifyadministratie.nl';
const IBAN_RE = /\b[A-Z]{2}\d{2}\s?[A-Z]{4}(?:\s?\d{4}){2}\s?\d{2}\b/;

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
const inList = (host, list) => list.some((d) => host === d || host.endsWith(`.${d}`));
export const isOfficial = (url, cfg = redactieConfig) => inList(hostOf(url), cfg.officialDomains);
export const isTrusted = (url, cfg = redactieConfig) => inList(hostOf(url), [...cfg.officialDomains, ...cfg.trustedDomains]);

/** "29 oktober 2026" of "2026-10-29" → Date (UTC-middag) of null. */
export function parseDutchDate(s) {
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  m = new RegExp(`(\\d{1,2})\\s+(${MONTHS.join('|')})\\s+(\\d{4})`, 'i').exec(s);
  if (m) return new Date(Date.UTC(+m[3], MONTHS.indexOf(m[2].toLowerCase()), +m[1], 12));
  return null;
}

/** Splitst de Markdown in secties per H2. */
function sections(body) {
  const out = [];
  let cur = { heading: '', text: '' };
  for (const line of String(body).split('\n')) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      out.push(cur);
      cur = { heading: h[1], text: '' };
    } else cur.text += `${line}\n`;
  }
  out.push(cur);
  return out;
}

const paragraphs = (body) =>
  String(body)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^#{2,4}\s/.test(p) && !/^\|/.test(p));
const sentences = (text) => text.replace(/\n/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9“"'(])/);
const links = (text) => [...String(text).matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);

/** Taal- en opmaakcorrecties die veilig automatisch kunnen. Geeft { article, fixes }. */
export function autofix(a) {
  const fixes = [];
  const fix = (field, re, to, label) => {
    if (typeof a[field] !== 'string') return;
    const next = a[field].replace(re, to);
    if (next !== a[field]) {
      fixes.push(`${field}: ${label}`);
      a = { ...a, [field]: next };
    }
  };
  for (const f of ['title', 'description', 'intro', 'imageAlt']) {
    fix(f, /\s{2,}/g, ' ', 'dubbele spaties');
    fix(f, /\s+([,.;:!?])/g, '$1', 'spatie vóór leesteken');
    fix(f, /^\s+|\s+$/g, '', 'witruimte');
  }
  fix('title', /\.$/, '', 'punt aan einde titel');
  fix('description', /([^.!?])$/, '$1.', 'description eindigt met punt');
  fix('intro', /([^.!?])$/, '$1.', 'intro eindigt met punt');
  fix('body', /[ \t]+$/gm, '', 'witruimte aan regeleinde');
  fix('body', /([^\s|])[ ]{2,}(?=\S)/g, '$1 ', 'dubbele spaties');
  fix('body', /\n{3,}/g, '\n\n', 'lege regels');
  fix('body', /([a-zà-ÿ]) ([,;:!?])(?=\s)/gi, '$1$2', 'spatie vóór leesteken');
  return { article: a, fixes };
}

/**
 * Inhoudelijke controle. `now` = moment van (automatische) goedkeuring; `others` = andere openbare artikelen.
 * Geeft { ok, errors, warnings }.
 */
export function qualityCheck(a, { now = new Date(), others = [], cfg = redactieConfig } = {}) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const body = String(a.body || '');
  const cut = body.search(/^##\s+Bronnen\s*$/m);
  const main = cut >= 0 ? body.slice(0, cut) : body;

  // 1. Basisvalidatie (zonder de goedkeuringsvelden, die zet de redactie zelf)
  for (const e of validateArticle({ ...a, status: 'concept' })) err(e);

  // 2. Open punten: wat nog onzeker is, blokkeert publicatie
  if (String(a.reviewNotes || '').trim()) err('Er staan nog open punten in reviewNotes.');
  const factcheck = String(a.factcheck || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (factcheck.length < 2) err('Factcheck ontbreekt: noteer per kernclaim de bevestigende bron (veld factcheck).');

  // 3. Opbouw
  const secs = sections(body);
  const h2 = secs.slice(1).map((s) => s.heading);
  if (h2.length < 3) err('Minimaal drie tussenkoppen (##) nodig.');
  if (!h2.some((h) => /^conclusie/i.test(h))) err('Sectie "## Conclusie" ontbreekt.');
  const bronnen = secs.find((s) => /^bronnen$/i.test(s.heading));
  if (!bronnen) err('Sectie "## Bronnen" ontbreekt.');
  else if (h2.at(-1).toLowerCase() !== 'bronnen') err('"## Bronnen" moet de laatste sectie zijn.');

  // 4. Bronnen: betrouwbaar, actueel en gecontroleerd
  if (bronnen) {
    const items = bronnen.text.split('\n').filter((l) => /^\s*[-*]\s/.test(l));
    if (items.length < 2) err('Minimaal twee bronnen nodig.');
    let official = 0;
    for (const item of items) {
      const url = links(item)[0];
      const label = item.replace(/^\s*[-*]\s*/, '').slice(0, 60);
      if (!url || !url.startsWith('https://')) {
        err(`Bron zonder https-link: "${label}".`);
        continue;
      }
      if (!isTrusted(url, cfg)) err(`Bron niet op de lijst van betrouwbare domeinen: ${hostOf(url)}.`);
      if (isOfficial(url, cfg)) official++;
      const m = /geraadpleegd op ([^.;)]+)/i.exec(item);
      const checked = m && parseDutchDate(m[1]);
      if (!checked) err(`Bron zonder controledatum ("Geraadpleegd op …"): ${hostOf(url)}.`);
      else {
        const age = (new Date(now).getTime() - checked.getTime()) / 86400000;
        if (age < -1) err(`Controledatum ligt in de toekomst: ${hostOf(url)}.`);
        else if (age > cfg.maxSourceAgeDays) err(`Bron is langer dan ${cfg.maxSourceAgeDays} dagen geleden gecontroleerd: ${hostOf(url)}.`);
      }
    }
    if (items.length && official === 0) err('Minimaal één primaire/officiële bron nodig (bijv. Belastingdienst, Rijksoverheid, KVK, wetten.overheid.nl, EUR-Lex).');
  }

  // 5. Links in de tekst
  for (const url of links(body)) {
    if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:')) continue;
    if (!url.startsWith('https://')) err(`Link zonder https: ${url}.`);
    else if (!isTrusted(url, cfg)) err(`Externe link naar niet-vertrouwd domein: ${hostOf(url)}.`);
  }
  if (!links(body).some((u) => u.startsWith('/') && !u.startsWith('/nieuws/'))) warnings.push('Geen interne link naar een dienstpagina in de tekst.');

  // 6. Cijfers en bedragen moeten direct onderbouwd zijn
  for (const p of paragraphs(main)) {
    if (/\d\s?%|\bprocent\b|€\s?\d/.test(p) && !links(p).some((u) => u.startsWith('https://'))) {
      err(`Cijfer of bedrag zonder bronlink in dezelfde alinea: "${p.replace(/\s+/g, ' ').slice(0, 70)}…"`);
    }
  }

  // 7. Toekomstige regels: altijd de status benoemen (geldend, aangenomen, voorstel, verwachting)
  const year = new Date(now).getUTCFullYear();
  const status = /\b(voorstel|wetsvoorstel|voornemen|plan|plannen|kabinet wil|beoogd|verwacht|naar verwachting|aangekondigd|nog niet definitief|consultatie|aangenomen|vastgesteld|geldt vanaf|treedt .*in werking|wet is|verordening)/i;
  for (const p of paragraphs(main)) {
    for (const s of sentences(p)) {
      const future = [...s.matchAll(/\b(20\d{2})\b/g)].some((m) => +m[1] > year);
      if (future && !status.test(s) && !/^\**\s*(vooruitblik|in beweging|voorstel|verwachting|geldend)\b/i.test(p)) {
        err(`Toekomstige datum zonder status (geldend/aangenomen/voorstel/verwachting): "${s.slice(0, 80)}…"`);
      }
    }
  }

  // 8. Geen persoonsgegevens of vertrouwelijke gegevens
  const all = [a.title, a.description, a.intro, body].join('\n');
  for (const m of all.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) if (m[0].toLowerCase() !== SITE_EMAIL) err(`E-mailadres in de tekst: ${m[0]}.`);
  if (/(?:\+31|0031|\b0)[ -]?(?:6|[1-9]\d)[ -]?\d{3,4}[ -]?\d{3,4}\b/.test(all.replace(/\+31 6 14856469/g, ''))) err('Mogelijk telefoonnummer in de tekst.');
  if (IBAN_RE.test(all)) err('Mogelijk IBAN in de tekst.');
  if (/\b\d{9}\b/.test(all)) err('Mogelijk BSN of ander identificatienummer (9 cijfers) in de tekst.');

  // 9. Ongeoorloofde of misleidende inhoud en restanten van het schrijfproces
  if (/\b(TODO|TBD|XXX|lorem ipsum|PLACEHOLDER)\b|\[bron\]|\(bron\?\)|nog (te )?controleren/i.test(all)) err('Tekst bevat een placeholder of open notitie.');
  if (/\b(gegarandeerd|garanderen|garantie op|zonder enig risico|100% zeker|nooit meer een naheffing)\b/i.test(all)) err('Tekst bevat een te stellige belofte (garantie/zekerheid).');
  if (FISCAL_CATEGORIES.has(a.category) && !/(algemene informatie|geen (persoonlijk )?(fiscaal )?advies)/i.test(body)) {
    err('Fiscaal artikel zonder vermelding dat het algemene informatie is (geen persoonlijk advies).');
  }

  // 10. Doelgroep: Nederlandstalig
  const words = all.toLowerCase().match(/[a-zà-ÿ]+/g) || [];
  const dutch = words.filter((w) => ['de', 'het', 'een', 'en', 'van', 'u', 'uw', 'is', 'dat', 'voor', 'met', 'niet', 'of', 'op', 'te', 'zijn', 'bij', 'die'].includes(w)).length;
  if (words.length > 100 && dutch / words.length < 0.12) err('Tekst lijkt niet (volledig) Nederlandstalig.');
  // "dat dat" en "die die" kunnen correct zijn; daarom een waarschuwing en geen automatische correctie.
  for (const m of main.matchAll(/(?<![\p{L}])(\p{L}{2,})\s+\1(?![\p{L}])/giu)) warnings.push(`Herhaald woord: "${m[0]}".`);
  if (words.length < 450) warnings.push(`Artikel is kort (${words.length} woorden); streef naar 600–1200 woorden.`);
  if (!categoryById[a.category]) err('Onbekende categorie.');

  // 11. SEO
  if (`${a.title} | Yukify`.length > 65 && String(a.title).length > 70) warnings.push('Titel is lang voor zoekresultaten (> 70 tekens).');
  if (a.description && (a.description.length < 110 || a.description.length > 160)) warnings.push(`Meta description ${a.description.length} tekens (advies 110–160).`);
  if (!a.imageAlt) warnings.push('Geen eigen alt-tekst; de standaard van de categorie wordt gebruikt.');

  // 12. Geen dubbele publicaties
  const tokens = (s) => new Set(String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{4,}/g) || []);
  const mine = tokens(a.title);
  for (const o of others) {
    if (o.slug === a.slug) continue;
    if (o.title === a.title) err(`Er is al een artikel met dezelfde titel (${o.slug}).`);
    if (o.description === a.description) err(`Er is al een artikel met dezelfde description (${o.slug}).`);
    const t = tokens(o.title);
    const overlap = [...mine].filter((w) => t.has(w)).length / Math.max(1, Math.min(mine.size, t.size));
    if (overlap >= 0.8) err(`Onderwerp lijkt sterk op een bestaand artikel (${o.slug}).`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/* ---------- Socialmediaberichten ---------- */
export const SOCIAL_RULES = {
  linkedin: { max: 3000, min: 150, needsUrl: true },
  facebook: { max: 2000, min: 100, needsUrl: true },
  instagram: { max: 2200, min: 100, needsUrl: false },
};

export function socialCheck(platform, text, articleUrl) {
  const rule = SOCIAL_RULES[platform];
  const errors = [];
  if (!rule) return ['Onbekend platform.'];
  const t = String(text || '');
  if (t.length < rule.min || t.length > rule.max) errors.push(`${platform}: lengte ${t.length} (toegestaan ${rule.min}–${rule.max}).`);
  if (rule.needsUrl && !t.includes(articleUrl)) errors.push(`${platform}: link naar het artikel ontbreekt.`);
  if ((t.match(/#[\p{L}\d]+/gu) || []).length > 6) errors.push(`${platform}: meer dan 6 hashtags.`);
  for (const m of t.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) if (m[0].toLowerCase() !== SITE_EMAIL) errors.push(`${platform}: e-mailadres in de tekst.`);
  if (IBAN_RE.test(t) || /\b\d{9}\b/.test(t)) errors.push(`${platform}: mogelijk identificatie- of rekeningnummer.`);
  if (/\b(TODO|XXX|PLACEHOLDER)\b|\[link\]/i.test(t)) errors.push(`${platform}: placeholder in de tekst.`);
  if (/\b(gegarandeerd|100% zeker|zonder enig risico)\b/i.test(t)) errors.push(`${platform}: te stellige belofte.`);
  return errors;
}
