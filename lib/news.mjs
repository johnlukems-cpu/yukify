// Nieuws & Inzichten: artikelformaat, statusregels en Markdown-rendering.
// Artikelen staan als Markdown met frontmatter in content/nieuws/<slug>.md.
// Wat openbaar wordt, wordt UITSLUITEND bepaald door isPublic(): zonder expliciete goedkeuring nooit.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Marked } from 'marked';

export const NEWS_DIR = 'content/nieuws';
export const SOCIAL_DIR = 'content/social';

export const categories = [
  { id: 'financiele-administratie', label: 'Financiële administratie', service: '/diensten/#financiele-administratie' },
  { id: 'btw-en-belastingen', label: 'Btw en belastingen', service: '/diensten/#btw-processen' },
  { id: 'accountancy-en-regelgeving', label: 'Accountancy en regelgeving', service: '/administratiekantoren/' },
  { id: 'ai-en-automatisering', label: 'AI en automatisering', service: '/#softwarekennis' },
  { id: 'boekhoudsoftware', label: 'Boekhoudsoftware', service: '/#softwarekennis' },
  { id: 'ondernemen-en-cashflow', label: 'Ondernemen en cashflow', service: '/mkb/' },
  { id: 'jaarafsluiting', label: 'Jaarafsluiting', service: '/diensten/#financiele-administratie' },
];
export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

export const statuses = [
  { id: 'concept', label: 'Concept' },
  { id: 'ter-goedkeuring', label: 'Ter goedkeuring' },
  { id: 'goedgekeurd', label: 'Goedgekeurd' },
  { id: 'ingepland', label: 'Ingepland' },
  { id: 'gepubliceerd', label: 'Gepubliceerd' },
];
export const statusLabel = Object.fromEntries(statuses.map((s) => [s.id, s.label]));
export const APPROVED_STATUSES = new Set(['goedgekeurd', 'ingepland', 'gepubliceerd']);

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Is dit artikel goedgekeurd door een persoon (status én vastgelegde goedkeuring)? */
export function isApproved(a) {
  return APPROVED_STATUSES.has(a.status) && Boolean(a.approvedBy) && Boolean(a.approvedAt);
}

/** Mag dit artikel openbaar op de website staan op moment `now`? */
export function isPublic(a, now = new Date()) {
  if (!isApproved(a)) return false;
  if (a.status === 'gepubliceerd') return true;
  if (a.status === 'ingepland') return Boolean(a.publishAt) && new Date(a.publishAt).getTime() <= now.getTime();
  return false;
}

/** Publicatiedatum zoals getoond (YYYY-MM-DD). */
export function publicationDate(a) {
  if (a.date && DATE_RE.test(a.date)) return a.date;
  if (a.publishAt) return new Date(a.publishAt).toISOString().slice(0, 10);
  return '';
}

/* ---------- Frontmatter (eenvoudige, voorspelbare YAML-subset) ----------
   key: waarde            (tekst; aanhalingstekens optioneel)
   key: true|false        (boolean)
   key: |                 (meerregelige tekst; volgende regels met 2 spaties inspringing) */
export function parseArticle(source, file = '') {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!m) throw new Error(`${file}: frontmatter ontbreekt`);
  const data = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = /^([A-Za-z][A-Za-z0-9]*):\s?(.*)$/.exec(line);
    if (!kv) throw new Error(`${file}: ongeldige frontmatter-regel: ${line}`);
    const [, key, rawValue] = kv;
    let value = rawValue.trim();
    if (value === '|') {
      const block = [];
      while (i + 1 < lines.length && (lines[i + 1].startsWith('  ') || lines[i + 1].trim() === '')) block.push(lines[++i].replace(/^ {2}/, ''));
      value = block.join('\n').trim();
    } else if (value === 'true' || value === 'false') {
      value = value === 'true';
    } else if (/^".*"$/.test(value)) {
      value = JSON.parse(value);
    } else if (/^'.*'$/.test(value)) {
      value = value.slice(1, -1).replace(/''/g, "'");
    }
    data[key] = value;
  }
  return { ...data, body: m[2].replace(/^\s+/, '') };
}

const FIELD_ORDER = ['title', 'slug', 'category', 'description', 'intro', 'status', 'date', 'updated', 'publishAt', 'approvedBy', 'approvedAt', 'featured', 'image', 'imageAlt', 'author', 'reviewNotes'];

export function serializeArticle(a) {
  const out = ['---'];
  const keys = [...FIELD_ORDER, ...Object.keys(a).filter((k) => !FIELD_ORDER.includes(k) && k !== 'body' && k !== 'sha' && k !== 'file')];
  for (const k of keys) {
    const v = a[k];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'boolean') out.push(`${k}: ${v}`);
    else if (String(v).includes('\n')) out.push(`${k}: |`, ...String(v).split('\n').map((l) => (l ? `  ${l}` : '')));
    else out.push(`${k}: ${JSON.stringify(String(v))}`);
  }
  out.push('---', '', String(a.body || '').trim(), '');
  return out.join('\n');
}

/** Controleert een artikel. Geeft een lijst met foutmeldingen (leeg = geldig). */
export function validateArticle(a) {
  const e = [];
  if (!a.title || a.title.length < 10 || a.title.length > 120) e.push('Titel is verplicht (10–120 tekens).');
  if (!a.slug || !SLUG_RE.test(a.slug) || a.slug.length > 80) e.push('Slug is verplicht: kleine letters, cijfers en koppeltekens.');
  if (!categoryById[a.category]) e.push('Kies een geldige categorie.');
  if (!a.description || a.description.length < 50 || a.description.length > 170) e.push('Meta description is verplicht (50–170 tekens).');
  if (!a.intro || a.intro.length < 40) e.push('Introductie is verplicht (minimaal 40 tekens).');
  if (!statusLabel[a.status]) e.push('Ongeldige status.');
  if (!a.body || a.body.trim().length < 200) e.push('Artikeltekst is te kort.');
  if (a.date && !DATE_RE.test(a.date)) e.push('Datum moet de vorm JJJJ-MM-DD hebben.');
  if (a.publishAt && Number.isNaN(new Date(a.publishAt).getTime())) e.push('Ongeldig publicatiemoment.');
  if (APPROVED_STATUSES.has(a.status) && !(a.approvedBy && a.approvedAt)) e.push('Goedkeuring (approvedBy/approvedAt) ontbreekt voor deze status.');
  if (a.status === 'ingepland' && !a.publishAt) e.push('Een ingepland artikel heeft een publicatiemoment nodig.');
  if (a.image && !/^\/assets\/img\/[a-z0-9/_-]+\.(svg|png|jpe?g|webp)$/.test(a.image)) e.push('Afbeelding moet een pad onder /assets/img/ zijn.');
  if (a.image && !a.imageAlt) e.push('Alt-tekst voor de afbeelding ontbreekt.');
  if (/^#\s/m.test(a.body || '')) e.push('Gebruik in de artikeltekst geen H1 (#); de titel is al de H1.');
  return e;
}

/* ---------- Markdown ---------- */
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const slugifyHeading = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const marked = new Marked({
  gfm: true,
  renderer: {
    // Ruwe HTML in Markdown wordt nooit doorgelaten.
    html({ text }) {
      return escapeHtml(text);
    },
    heading({ tokens, depth }) {
      const level = Math.min(Math.max(depth, 2), 4);
      const inner = this.parser.parseInline(tokens);
      return `<h${level} id="${slugifyHeading(inner)}">${inner}</h${level}>\n`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!/^(https:\/\/|\/|#|mailto:)/.test(href || '')) return text;
      const ext = href.startsWith('https://');
      return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}${ext ? '<span class="visually-hidden"> (opent in nieuw venster)</span>' : ''}</a>`;
    },
    image({ text }) {
      return escapeHtml(text || '');
    },
    // Afvinklijstjes als visuele checklist (geen formulierelementen).
    checkbox() {
      return '<span class="todo-box" aria-hidden="true"></span>';
    },
  },
});

export function renderMarkdown(md) {
  return marked.parse(String(md || ''));
}

export function plainText(md) {
  return renderMarkdown(md).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export function readingMinutes(md) {
  return Math.max(1, Math.round(plainText(md).split(' ').length / 200));
}

export function categoryImage(categoryId) {
  return `/assets/img/nieuws/${categoryId}.svg`;
}

/** Afbeelding + alt voor een artikel (eigen afbeelding of categorie-illustratie). */
export function articleImage(a) {
  const cat = categoryById[a.category];
  if (a.image) return { src: a.image, alt: a.imageAlt, og: a.image.replace(/\.svg$/, '.png') };
  return {
    src: categoryImage(a.category),
    alt: a.imageAlt || `Illustratie bij het onderwerp ${cat ? cat.label.toLowerCase() : 'financiële administratie'}`,
    og: `/assets/img/nieuws/${a.category}.png`,
  };
}

/** Leest alle artikelen uit een map (standaard content/nieuws). */
export async function loadArticles(dir = NEWS_DIR) {
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
  const out = [];
  for (const f of files) {
    const a = parseArticle(await readFile(join(dir, f), 'utf8'), f);
    if (a.slug !== f.replace(/\.md$/, '')) throw new Error(`${f}: slug "${a.slug}" komt niet overeen met de bestandsnaam`);
    out.push(a);
  }
  return out;
}

/** Openbare artikelen, nieuwste eerst. Gooit een fout als een openbaar artikel ongeldig is. */
export function publicArticles(all, now = new Date()) {
  const pub = all.filter((a) => isPublic(a, now));
  for (const a of pub) {
    const errors = validateArticle(a);
    if (errors.length) throw new Error(`Openbaar artikel "${a.slug}" is ongeldig: ${errors.join(' ')}`);
  }
  return pub.sort((x, y) => publicationDate(y).localeCompare(publicationDate(x)) || x.title.localeCompare(y.title));
}

/** Gerelateerde artikelen: eerst dezelfde categorie, daarna de nieuwste overige. */
export function relatedArticles(article, pub, n = 3) {
  const others = pub.filter((a) => a.slug !== article.slug);
  return [...others.filter((a) => a.category === article.category), ...others.filter((a) => a.category !== article.category)].slice(0, n);
}

export function formatDateNl(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' }).format(new Date(`${iso}T12:00:00Z`));
}
