// Opslag van artikelen en socialmediaberichten in de GitHub-repository (via de Contents-API).
// Elke wijziging is een commit op de ingestelde branch; Vercel bouwt daarna automatisch opnieuw.
import { NEWS_DIR, SOCIAL_DIR, parseArticle, serializeArticle, SLUG_RE } from '../news.mjs';

function cfg(env = process.env) {
  return {
    api: (env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, ''),
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH || 'main',
    token: env.GITHUB_TOKEN,
  };
}

async function gh(method, path, body) {
  const c = cfg();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  let res;
  try {
    res = await fetch(`${c.api}/repos/${c.repo}/contents/${path}${method === 'GET' ? `?ref=${encodeURIComponent(c.branch)}` : ''}`, {
      method,
      headers: {
        Authorization: `Bearer ${c.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'yukify-beheer',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify({ ...body, branch: c.branch }) : undefined,
      signal: ctrl.signal,
    });
  } catch {
    throw Object.assign(new Error('GitHub onbereikbaar'), { code: 'STORE_UNAVAILABLE' });
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) return null;
  if (res.status === 409 || res.status === 422) throw Object.assign(new Error('Het bestand is intussen gewijzigd'), { code: 'CONFLICT' });
  if (!res.ok) throw Object.assign(new Error(`GitHub-fout ${res.status}`), { code: `STORE_${res.status}` });
  return res.json();
}

const decode = (b64) => Buffer.from(String(b64).replace(/\n/g, ''), 'base64').toString('utf8');
const encode = (text) => Buffer.from(text, 'utf8').toString('base64');

async function readText(path) {
  const f = await gh('GET', path);
  return f ? { text: decode(f.content), sha: f.sha } : null;
}

async function writeText(path, text, sha, message) {
  const r = await gh('PUT', path, { message, content: encode(text), ...(sha ? { sha } : {}) });
  return r?.content?.sha;
}

export async function listArticles() {
  const dir = (await gh('GET', NEWS_DIR)) || [];
  const files = dir.filter((f) => f.type === 'file' && f.name.endsWith('.md'));
  const out = [];
  for (const f of files) {
    const r = await readText(f.path);
    if (r) out.push({ ...parseArticle(r.text, f.name), sha: r.sha });
  }
  return out.sort((a, b) => String(b.date || b.publishAt || '').localeCompare(String(a.date || a.publishAt || '')) || a.title.localeCompare(b.title));
}

export async function getArticle(slug) {
  if (!SLUG_RE.test(slug || '')) return null;
  const r = await readText(`${NEWS_DIR}/${slug}.md`);
  return r ? { ...parseArticle(r.text, `${slug}.md`), sha: r.sha } : null;
}

export async function saveArticle(article, sha, message) {
  const { sha: _ignored, ...clean } = article;
  return writeText(`${NEWS_DIR}/${article.slug}.md`, serializeArticle(clean), sha, message);
}

export const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
];

export function emptySocial(slug) {
  return { article: slug, platforms: Object.fromEntries(PLATFORMS.map((p) => [p.id, { text: '', status: 'concept' }])) };
}

export async function getSocial(slug) {
  if (!SLUG_RE.test(slug || '')) return null;
  const r = await readText(`${SOCIAL_DIR}/${slug}.json`);
  if (!r) return { ...emptySocial(slug), sha: null };
  const data = JSON.parse(r.text);
  const base = emptySocial(slug);
  return { ...base, ...data, platforms: { ...base.platforms, ...(data.platforms || {}) }, sha: r.sha };
}

export async function saveSocial(social, message) {
  const { sha, ...clean } = social;
  return writeText(`${SOCIAL_DIR}/${social.article}.json`, `${JSON.stringify(clean, null, 2)}\n`, sha, message);
}

/** Alle socialmediaberichten (één JSON-bestand per artikel). */
export async function listSocial() {
  const dir = (await gh('GET', SOCIAL_DIR)) || [];
  const out = [];
  for (const f of dir.filter((x) => x.type === 'file' && x.name.endsWith('.json'))) {
    const s = await getSocial(f.name.replace(/\.json$/, ''));
    if (s) out.push(s);
  }
  return out;
}
