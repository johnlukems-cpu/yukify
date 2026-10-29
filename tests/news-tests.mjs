// Tests voor Nieuws & Inzichten: openbare pagina's (met testartikelen), beheer, redactie-API en publicatieronde.
// Gebruikt een eigen testbuild (test-results/) en een nagebootste GitHub-API; raakt de echte repository niet.
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { serializeArticle, parseArticle, isPublic } from '../lib/news.mjs';
import { hashPassword } from '../lib/admin/auth.mjs';
import { amsterdamLocalToIso, applyAction, checkRedactieInput } from '../lib/admin/workflow.mjs';

const SHOTS = process.env.SHOTS !== 'false';
const results = [];
const check = (cond, msg) => results.push({ ok: Boolean(cond), msg });
const WWW = 'https://www.yukifyadministratie.nl';

/* ---------- Testartikelen ---------- */
const FIX = 'test-results/fixture-nieuws';
const OUT = 'test-results/dist-nieuws';
const NOW = new Date('2026-06-15T12:00:00Z');
const cats = ['financiele-administratie', 'btw-en-belastingen', 'accountancy-en-regelgeving', 'ai-en-automatisering', 'boekhoudsoftware', 'ondernemen-en-cashflow', 'jaarafsluiting'];
const body = (n) => `## Waarom dit belangrijk is

Dit is testartikel ${n} (kenmerk ${n.replace(/-/g, '')}x). Een overzichtelijke administratie helpt bij betrouwbare cijfers en tijdige aangiftes; dit stuk tekst is lang genoeg voor de validatie.

## Checklist

- [ ] Bankmutaties verwerkt
- [ ] Openstaande posten gecontroleerd

## Bronnen

- [Voorbeeldbron](https://www.example.org/bron-${n})

## Conclusie

Regelmatig controleren voorkomt verrassingen. Zie ook [onze diensten](/diensten/).`;
const approved = { approvedBy: 'Test Eigenaar', approvedAt: '2026-01-01T10:00:00.000Z' };
const art = (slug, extra) => ({
  title: `Testartikel ${slug.replace(/-/g, ' ')} voor de nieuwspagina`,
  slug,
  category: 'financiele-administratie',
  description: `Beschrijving van ${slug}: praktische uitleg over financiële administratie voor ondernemers en kantoren.`,
  intro: `Introductie van ${slug}, met een korte samenvatting van wat de lezer in dit artikel leert.`,
  status: 'gepubliceerd',
  ...approved,
  body: body(slug),
  ...extra,
});
const fixtures = [];
for (let i = 1; i <= 12; i++) {
  fixtures.push(art(`gepubliceerd-${i}`, { category: cats[i % cats.length], date: `2026-0${1 + (i % 5)}-${String(10 + i).padStart(2, '0')}`, ...(i === 3 ? { featured: true, title: 'Uitgelicht testartikel over de jaarafsluiting voorbereiden' } : {}) }));
}
fixtures.push(art('ingepland-verleden', { status: 'ingepland', publishAt: '2026-06-01T07:00:00.000Z', date: '2026-06-01', category: 'btw-en-belastingen', title: 'Zoekwoord kwartaalaangifte in een ingepland artikel' }));
fixtures.push(art('ingepland-toekomst', { status: 'ingepland', publishAt: '2026-07-01T07:00:00.000Z', date: '2026-07-01' }));
fixtures.push(art('goedgekeurd-niet-gepubliceerd', { status: 'goedgekeurd', date: '2026-05-01' }));
fixtures.push(art('zonder-goedkeuring', { status: 'gepubliceerd', approvedBy: '', approvedAt: '', date: '2026-05-02' }));
fixtures.push(art('concept-artikel', { status: 'concept', approvedBy: '', approvedAt: '' }));
fixtures.push(art('ter-goedkeuring-artikel', { status: 'ter-goedkeuring', approvedBy: '', approvedAt: '' }));
const HIDDEN = ['ingepland-toekomst', 'goedgekeurd-niet-gepubliceerd', 'zonder-goedkeuring', 'concept-artikel', 'ter-goedkeuring-artikel'];
const VISIBLE = [...fixtures.map((f) => f.slug).filter((s) => !HIDDEN.includes(s))];

await rm(FIX, { recursive: true, force: true });
await mkdir(FIX, { recursive: true });
for (const f of fixtures) {
  const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
  await writeFile(`${FIX}/${f.slug}.md`, serializeArticle(clean));
}
execFileSync(process.execPath, ['scripts/build.mjs'], { env: { ...process.env, BUILD_OUT_DIR: OUT, NEWS_CONTENT_DIR: FIX, BUILD_NOW: NOW.toISOString() }, stdio: 'pipe' });

/* ---------- Nagebootste GitHub Contents-API ---------- */
const repo = new Map(); // pad → { text, sha }
const commits = [];
const sha = (t) => createHash('sha1').update(t).digest('hex');
for (const f of await readdir('content/nieuws')) {
  const text = await readFile(`content/nieuws/${f}`, 'utf8');
  repo.set(`content/nieuws/${f}`, { text, sha: sha(text) });
}
const GH_TOKEN = 'ghtest_token_voor_tests';
const github = http.createServer(async (req, res) => {
  const json = (s, o) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.headers.authorization !== `Bearer ${GH_TOKEN}`) return json(401, { message: 'Bad credentials' });
  const url = new URL(req.url, 'http://x');
  const m = /^\/repos\/test\/yukify\/contents\/(.+)$/.exec(url.pathname);
  if (!m) return json(404, {});
  const path = decodeURIComponent(m[1]);
  if (req.method === 'GET') {
    const f = repo.get(path);
    if (f) return json(200, { type: 'file', path, sha: f.sha, content: Buffer.from(f.text).toString('base64') });
    const children = [...repo.keys()].filter((k) => k.startsWith(path + '/'));
    if (children.length) return json(200, children.map((k) => ({ type: 'file', path: k, name: k.slice(path.length + 1) })));
    return json(404, {});
  }
  if (req.method === 'PUT') {
    let raw = '';
    for await (const c of req) raw += c;
    const b = JSON.parse(raw);
    const cur = repo.get(path);
    if ((cur && b.sha !== cur.sha) || (!cur && b.sha)) return json(409, { message: 'sha mismatch' });
    const text = Buffer.from(b.content, 'base64').toString('utf8');
    repo.set(path, { text, sha: sha(text) });
    commits.push({ path, message: b.message, branch: b.branch });
    return json(cur ? 200 : 201, { content: { sha: sha(text) } });
  }
  json(405, {});
});
await new Promise((r) => github.listen(4400, '127.0.0.1', r));

/* ---------- Servers ---------- */
const PASSWORD = 'Test-Wachtwoord-2026!';
const SECRET = 'sessie-geheim-voor-tests-0123456789abcdef';
const REDACTIE = 'redactie-token-voor-tests-0123456789abcdef';
const CRON = 'cron-geheim-voor-tests-0123456789abcdef-xyz';
const ADMIN_ENV = {
  ADMIN_PASSWORD_HASH: hashPassword(PASSWORD),
  ADMIN_SESSION_SECRET: SECRET,
  ADMIN_NAME: 'Test Eigenaar',
  ADMIN_LOGIN_MAX: '5',
  GITHUB_TOKEN: GH_TOKEN,
  GITHUB_REPO: 'test/yukify',
  GITHUB_BRANCH: 'main',
  GITHUB_API_URL: 'http://127.0.0.1:4400',
  REDACTIE_TOKEN: REDACTIE,
  CRON_SECRET: CRON,
};
const logs = {};
function startServer(port, env) {
  const child = spawn(process.execPath, ['serve.mjs'], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', RESEND_API_KEY: '', SMTP_HOST: '', ADMIN_PASSWORD_HASH: '', ADMIN_SESSION_SECRET: '', GITHUB_TOKEN: '', GITHUB_REPO: '', REDACTIE_TOKEN: '', CRON_SECRET: '', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  logs[port] = '';
  child.stdout.on('data', (d) => (logs[port] += d));
  child.stderr.on('data', (d) => (logs[port] += d));
  return new Promise((resolve) => child.stdout.on('data', (d) => d.toString().includes('Server actief') && resolve(child)));
}
const site = await startServer(4500, { DIST_DIR: OUT, ...ADMIN_ENV });
const bare = await startServer(4501, {});
const BASE = 'http://127.0.0.1:4500';
const browser = await chromium.launch();
await mkdir('test-results/screenshots', { recursive: true });

try {
  /* ---------- Build: alleen goedgekeurde, vrijgegeven artikelen ---------- */
  {
    const dirs = await readdir(`${OUT}/nieuws`);
    check(VISIBLE.every((s) => dirs.includes(s)), `build: alle ${VISIBLE.length} openbare artikelen gebouwd (incl. ingepland met verstreken moment)`);
    check(HIDDEN.every((s) => !dirs.includes(s)), 'build: concept, ter goedkeuring, alleen goedgekeurd, toekomstig ingepland en zonder goedkeuring NIET gebouwd');
    const sm = await readFile(`${OUT}/sitemap.xml`, 'utf8');
    check(VISIBLE.every((s) => sm.includes(`<loc>${WWW}/nieuws/${s}/</loc>`)), 'sitemap: alle openbare artikelen');
    check(HIDDEN.every((s) => !sm.includes(s)), 'sitemap: geen niet-openbare artikelen');
    check(sm.includes(`${WWW}/nieuws/pagina/2/`) && sm.includes(`${WWW}/nieuws/categorie/btw-en-belastingen/`), 'sitemap: paginering en gevulde categoriepagina\'s');
    check(/<loc>[^<]+gepubliceerd-1\/<\/loc><lastmod>2026-02-11<\/lastmod>/.test(sm), 'sitemap: lastmod = publicatiedatum');
    const idx = JSON.parse(await readFile(`${OUT}/nieuws/zoekindex.json`, 'utf8'));
    check(idx.length === VISIBLE.length && idx.every((x) => !HIDDEN.some((h) => x.url.includes(h))), 'zoekindex: alleen openbare artikelen');
    const robots = await readFile(`${OUT}/robots.txt`, 'utf8');
    check(/^Disallow: \/beheer$/m.test(robots) && /^Disallow: \/api\/$/m.test(robots), 'robots.txt: /beheer en /api/ uitgesloten');
    // Echte content: de drie conceptartikelen staan niet op de site
    const real = await readdir('dist/nieuws');
    const drafts = (await readdir('content/nieuws')).map((f) => f.replace(/\.md$/, ''));
    check(drafts.length === 3 && drafts.every((d) => !real.includes(d)), 'echte build: de 3 conceptartikelen worden niet gepubliceerd');
    for (const d of drafts) {
      const a = parseArticle(await readFile(`content/nieuws/${d}.md`, 'utf8'), `${d}.md`);
      check(a.status === 'concept' && !a.approvedBy && !isPublic(a, new Date('2100-01-01')), `concept "${a.title.slice(0, 40)}…": status concept, geen goedkeuring`);
    }
    check(JSON.parse(await readFile('dist/nieuws/zoekindex.json', 'utf8')).length === 0 && !(await readFile('dist/sitemap.xml', 'utf8')).match(/nieuws\/[a-z]/), 'echte build: zoekindex leeg en geen artikel-URL\'s in sitemap');
  }

  /* ---------- Overzicht ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + '/nieuws/', { waitUntil: 'networkidle' });
    check((await page.textContent('h1')).trim() === 'Nieuws & Inzichten', 'overzicht: titel "Nieuws & Inzichten"');
    check((await page.textContent('main')).includes('Blijf op de hoogte van ontwikkelingen in financiële administratie, btw, accountancy en automatisering. Yukify deelt praktische inzichten en actuele informatie waarmee ondernemers en financiële professionals hun administratie beter kunnen organiseren.'), 'overzicht: introductietekst exact');
    const feat = page.locator('.news-featured');
    check((await feat.count()) === 1 && (await feat.textContent()).includes('Uitgelicht testartikel'), 'overzicht: uitgelicht artikel (featured)');
    check((await feat.locator('img').count()) === 1 && (await feat.locator('.news-chip').count()) === 1 && (await feat.locator('time').count()) === 1, 'uitgelicht: afbeelding, categorie en datum');
    check((await feat.locator('a.btn', { hasText: 'Lees artikel' }).count()) === 1, 'uitgelicht: knop "Lees artikel"');
    const filterLabels = (await page.locator('.news-filters a').allTextContents()).map((t) => t.replace(/\s*\d+\s*$/, '').trim());
    check(['Financiële administratie', 'Btw en belastingen', 'Accountancy en regelgeving', 'AI en automatisering', 'Boekhoudsoftware', 'Ondernemen en cashflow', 'Jaarafsluiting'].every((l) => filterLabels.some((f) => f.startsWith(l))), `filters: alle 7 categorieën (${filterLabels.join(' | ')})`);
    check((await page.locator('.news-grid .news-card').count()) === 8, 'overzicht: 9 artikelen per pagina (uitgelicht + 8)');
    check(await page.isVisible('.news-pagination a[href="/nieuws/pagina/2/"]'), 'paginering: link naar pagina 2');
    check((await page.locator('link[rel=next]').getAttribute('href')).endsWith('/nieuws/pagina/2/'), 'paginering: rel=next');
    check(errors.length === 0, `overzicht: geen console-/CSP-fouten${errors.length ? ' — ' + errors.join(' | ') : ''}`);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    check(axe.violations.length === 0, `overzicht: WCAG AA${axe.violations.length ? ' — ' + axe.violations.map((v) => `${v.id}: ${v.nodes[0].target}`).join('; ') : ''}`);
    check(await page.isVisible('#main-nav a[href="/nieuws/"][aria-current="page"]'), 'navigatie: "Nieuws" actief op /nieuws/');
    if (SHOTS) await page.screenshot({ path: 'test-results/screenshots/nieuws-desktop.png', fullPage: true });

    // Zoeken op titel en inhoud
    await page.fill('.news-search input[type=search]', 'kwartaalaangifte');
    await page.waitForSelector('[data-news-results]:not([hidden])');
    let found = await page.locator('[data-news-results] .news-card-title').allTextContents();
    check(found.length === 1 && found[0].includes('kwartaalaangifte'), `zoeken op titel: 1 resultaat (${found.length})`);
    check(await page.isHidden('[data-news-default]'), 'zoeken: standaardoverzicht verborgen tijdens zoeken');
    await page.fill('.news-search input[type=search]', 'gepubliceerd7x');
    await page.waitForFunction(() => document.querySelector('.news-search-status').textContent.includes('gepubliceerd7x'));
    found = await page.locator('[data-news-results] .news-card-title').allTextContents();
    check(found.length === 1 && found[0].includes('gepubliceerd 7'), 'zoeken op inhoud: vindt artikel via tekst in de body');
    await page.fill('.news-search input[type=search]', 'adminstratie-bestaat-niet-xyz');
    await page.waitForFunction(() => document.querySelector('.news-search-status').textContent.includes('Geen artikelen'));
    check(true, 'zoeken: melding bij geen resultaten');
    await page.fill('.news-search input[type=search]', 'testartikel geheim concept');
    await page.waitForFunction(() => document.querySelector('.news-search-status').textContent.length > 0);
    check(!(await page.textContent('[data-news-results]')).includes('concept artikel'), 'zoeken: vindt geen conceptartikelen');
    await page.fill('.news-search input[type=search]', '');
    await page.waitForSelector('[data-news-default]:not([hidden])');
    check(true, 'zoeken: leegmaken toont het overzicht weer');

    // Filter
    await page.click('.news-filters a[href="/nieuws/categorie/btw-en-belastingen/"]');
    await page.waitForURL('**/categorie/btw-en-belastingen/');
    const chips = await page.locator('.news-grid .news-chip').allTextContents();
    check(chips.length > 0 && chips.every((c) => c.trim() === 'Btw en belastingen'), `filter: alleen artikelen uit de gekozen categorie (${chips.length})`);
    check((await page.getAttribute('.news-filters a[href="/nieuws/categorie/btw-en-belastingen/"]', 'aria-current')) === 'page', 'filter: actieve categorie gemarkeerd (aria-current)');
    check(!(await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex') && (await page.locator('link[rel=canonical]').getAttribute('href')) === `${WWW}/nieuws/categorie/btw-en-belastingen/`, 'gevulde categoriepagina: indexeerbaar met canonical');

    // Pagina 2
    await page.goto(BASE + '/nieuws/pagina/2/');
    check((await page.locator('.news-grid .news-card').count()) === VISIBLE.length - 9 && (await page.locator('.news-featured').count()) === 0, 'paginering: pagina 2 toont de rest, zonder uitgelicht artikel');
    check((await page.locator('link[rel=prev]').getAttribute('href')).endsWith('/nieuws/'), 'paginering: rel=prev');
    check((await page.locator('link[rel=canonical]').getAttribute('href')) === `${WWW}/nieuws/pagina/2/`, 'paginering: eigen canonical');
    const titles = new Set();
    for (const p of ['/nieuws/', '/nieuws/pagina/2/', '/nieuws/categorie/btw-en-belastingen/']) { await page.goto(BASE + p); titles.add(await page.title()); }
    check(titles.size === 3, 'overzicht, pagina 2 en categorie hebben unieke titles');
    await ctx.close();
  }

  /* ---------- Artikelpagina ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const res = await page.goto(BASE + '/nieuws/gepubliceerd-5/', { waitUntil: 'networkidle' });
    check(res.status() === 200, 'artikel: eigen URL /nieuws/<slug>/ → 200');
    const m = await page.evaluate(() => ({
      h1: [...document.querySelectorAll('h1')].map((h) => h.textContent),
      canonical: document.querySelector('link[rel=canonical]')?.href,
      ogType: document.querySelector('meta[property="og:type"]')?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      ogUrl: document.querySelector('meta[property="og:url"]')?.content,
      robots: document.querySelector('meta[name=robots]')?.content,
      title: document.title,
      desc: document.querySelector('meta[name=description]')?.content,
      published: document.querySelector('meta[property="article:published_time"]')?.content,
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)),
      imgAlt: document.querySelector('.news-figure img')?.alt,
      h2: [...document.querySelectorAll('.news-prose h2')].map((h) => h.textContent),
      todo: document.querySelectorAll('.news-prose .todo-box').length,
      inputs: document.querySelectorAll('.news-prose input').length,
      extLink: document.querySelector('.news-prose a[href^="https://"]')?.getAttribute('rel'),
      internal: [...document.querySelectorAll('main a[href^="/"]')].map((a) => a.getAttribute('href')),
    }));
    check(m.h1.length === 1 && m.h1[0].includes('gepubliceerd 5'), 'artikel: één H1 met de titel');
    check(m.canonical === `${WWW}/nieuws/gepubliceerd-5/` && m.ogUrl === m.canonical, 'artikel: canonical en og:url');
    check(m.ogType === 'article' && m.ogImage.startsWith(`${WWW}/assets/img/nieuws/`) && m.ogImage.endsWith('.png'), 'artikel: og:type article en eigen OG-afbeelding (png)');
    check(m.robots.startsWith('index') && m.title.length <= 65 && m.desc.length >= 50 && m.desc.length <= 170, 'artikel: indexeerbaar, title ≤ 65, description 50–170');
    check(m.published === '2026-01-15', 'artikel: article:published_time');
    const post = m.ld.find((d) => d['@type'] === 'BlogPosting');
    check(post && post.headline && post.datePublished === '2026-01-15' && post.mainEntityOfPage === m.canonical && post.image.endsWith('.png') && post.publisher?.name, 'artikel: BlogPosting JSON-LD compleet');
    check(m.ld.some((d) => d['@type'] === 'BreadcrumbList'), 'artikel: BreadcrumbList JSON-LD');
    check(m.imgAlt && m.imgAlt.length > 10, `artikel: afbeelding met alt-tekst (${m.imgAlt})`);
    check(m.h2.includes('Checklist') && m.h2.includes('Bronnen') && m.h2.includes('Conclusie'), 'artikel: tussenkoppen, checklist, bronnen en conclusie');
    check(m.todo === 2 && m.inputs === 0, 'artikel: checklist zonder formulierelementen');
    check(m.extLink === 'noopener noreferrer', 'artikel: externe bronlinks met noopener');
    const cta = await page.textContent('.news-cta');
    check(cta.includes('Op zoek naar ondersteuning bij uw financiële administratie? Yukify Administratie & Support denkt graag met u mee.'), 'artikel: CTA-tekst exact');
    check((await page.getAttribute('.news-cta a.btn', 'href')) === '/contact/' && (await page.textContent('.news-cta a.btn')).includes('Plan een vrijblijvend kennismakingsgesprek'), 'artikel: CTA-knop naar contact');
    check(await page.isVisible('.news-back a[href="/nieuws/"]'), 'artikel: terugknop naar overzicht');
    check((await page.locator('[aria-labelledby=gerelateerd-titel] .news-card').count()) === 3, 'artikel: 3 gerelateerde artikelen');
    check(m.internal.includes('/diensten/') && m.internal.some((h) => h.startsWith('/nieuws/categorie/')), 'artikel: interne links (dienst en categorie)');
    check(errors.length === 0, `artikel: geen console-/CSP-fouten${errors.length ? ' — ' + errors.join(' | ') : ''}`);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    check(axe.violations.length === 0, `artikel: WCAG AA${axe.violations.length ? ' — ' + axe.violations.map((v) => `${v.id}: ${v.nodes[0].target}`).join('; ') : ''}`);
    await page.click('.news-back a');
    await page.waitForURL('**/nieuws/');
    check(true, 'terugknop werkt');
    for (const h of HIDDEN) check((await page.goto(`${BASE}/nieuws/${h}/`)).status() === 404, `niet-openbaar artikel ${h}: 404`);
    await ctx.close();

    // Links op de nieuwspagina's werken
    const hrefs = new Set();
    for (const p of ['/nieuws/', '/nieuws/pagina/2/', '/nieuws/gepubliceerd-5/', '/nieuws/categorie/jaarafsluiting/']) {
      const html = await (await fetch(BASE + p)).text();
      for (const mm of html.matchAll(/href="(\/[^"#]*)/g)) hrefs.add(mm[1]);
    }
    const broken = [];
    for (const h of hrefs) if ((await fetch(BASE + h)).status !== 200) broken.push(h);
    check(broken.length === 0, `interne links op nieuwspagina's werken (${hrefs.size})${broken.length ? ' — ' + broken.join(', ') : ''}`);
  }

  /* ---------- Mobiel ---------- */
  for (const width of [320, 390, 820]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width < 800 });
    const page = await ctx.newPage();
    for (const p of ['/nieuws/', '/nieuws/gepubliceerd-5/']) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
      const ovf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(ovf <= 0, `${p} ${width}px: geen horizontale scroll`);
      if (SHOTS && width === 390) await page.screenshot({ path: `test-results/screenshots/nieuws-${p === '/nieuws/' ? 'overzicht' : 'artikel'}-390.png`, fullPage: true });
    }
    const filterBox = await page.goto(BASE + '/nieuws/').then(() => page.locator('.news-filters a').first().boundingBox());
    check(filterBox.height >= 44, `${width}px: filterknoppen ≥ 44px hoog`);
    await page.click('.nav-toggle').catch(() => {});
    if (width < 1100) check(await page.isVisible('#main-nav .nav-list a[href="/nieuws/"]'), `${width}px: "Nieuws & Inzichten" in mobiel menu`);
    await ctx.close();
  }

  /* ---------- Beheer: niet ingesteld ---------- */
  {
    const r = await fetch('http://127.0.0.1:4501/beheer');
    const t = await r.text();
    check(r.status === 503 && t.includes('ADMIN_PASSWORD_HASH') && t.includes('GITHUB_TOKEN'), 'beheer zonder configuratie: 503 met namen van ontbrekende variabelen');
    check(r.headers.get('x-robots-tag') === 'noindex, nofollow' && r.headers.get('cache-control') === 'no-store', 'beheer: noindex en no-store');
    const rr = await fetch('http://127.0.0.1:4501/api/redactie/artikelen');
    check(rr.status === 503, 'redactie-API zonder configuratie: 503');
  }

  /* ---------- Beheer: authenticatie ---------- */
  const form = (o) => new URLSearchParams(o).toString();
  const req = (path, { method = 'GET', body, cookie, headers = {} } = {}) =>
    fetch(BASE + path, { method, body, redirect: 'manual', headers: { ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers } });
  let cookie = '';
  {
    let r = await req('/beheer');
    let t = await r.text();
    check(r.status === 200 && t.includes('type="password"') && /noindex, nofollow/.test(t) && r.headers.get('x-robots-tag') === 'noindex, nofollow', 'beheer: loginpagina, noindex');
    check(!t.includes(SECRET) && !t.includes('scrypt$') && !t.includes(GH_TOKEN), 'beheer: geen geheimen in de HTML');
    r = await req('/beheer/artikel?slug=concept-artikel');
    check(r.status === 303 && r.headers.get('location') === '/beheer', 'beheer: artikelpagina zonder sessie → login');
    r = await req('/beheer/status', { method: 'POST', body: form({ slug: 'x', action: 'goedkeuren' }) });
    check(r.status === 401, 'beheer: statuswijziging zonder sessie geweigerd (401)');
    r = await req('/beheer/inloggen', { method: 'POST', body: form({ wachtwoord: 'fout' }) });
    check(r.status === 401 && !r.headers.get('set-cookie'), 'beheer: fout wachtwoord → 401, geen cookie');
    r = await req('/beheer/inloggen', { method: 'POST', body: form({ wachtwoord: PASSWORD }), headers: { Origin: 'https://kwaadaardig.example' } });
    check(r.status === 403, 'beheer: login vanaf andere origin geweigerd');
    r = await req('/beheer', { cookie: 'yk_beheer=9999999999999.abc.vervalst' });
    check((await r.text()).includes('type="password"'), 'beheer: vervalste sessiecookie werkt niet');
    r = await req('/beheer/inloggen', { method: 'POST', body: form({ wachtwoord: PASSWORD }) });
    const sc = r.headers.get('set-cookie') || '';
    check(r.status === 303 && /HttpOnly/.test(sc) && /SameSite=Strict/.test(sc) && /Path=\/beheer/.test(sc), 'beheer: juist wachtwoord → sessiecookie (HttpOnly, SameSite=Strict, Path=/beheer)');
    cookie = sc.split(';')[0];
  }
  const csrfOf = async (path) => /name="csrf" value="([^"]+)"/.exec(await (await req(path, { cookie })).text())?.[1];

  /* ---------- Beheer: overzicht, CSRF en workflow ---------- */
  {
    let r = await req('/beheer', { cookie });
    let t = await r.text();
    check(r.status === 200 && t.includes('Uw financiële administratie op orde') && t.includes('badge--concept'), 'beheer: overzicht toont de conceptartikelen');
    const slug = 'btw-aangifte-voorbereiden-fouten-voorkomen';
    r = await req(`/beheer/artikel?slug=${slug}`, { cookie });
    t = await r.text();
    check(r.status === 200 && t.includes('Te controleren vóór goedkeuring') && t.includes('Goedkeuren'), 'beheer: artikel bewerken met redactie-aantekeningen en goedkeurknop');
    const csrf = /name="csrf" value="([^"]+)"/.exec(t)[1];
    const before = commits.length;
    r = await req('/beheer/status', { method: 'POST', cookie, body: form({ slug, action: 'goedkeuren', bevestig: 'ja', csrf: 'fout' }) });
    check(r.status === 403 && commits.length === before, 'beheer: POST zonder geldig CSRF-token geweigerd');
    r = await req('/beheer/status', { method: 'POST', cookie, body: form({ slug, action: 'goedkeuren', bevestig: 'ja', csrf }), headers: { Origin: 'https://kwaadaardig.example' } });
    check(r.status === 403 && commits.length === before, 'beheer: POST vanaf andere origin geweigerd');
    r = await req('/beheer/status', { method: 'POST', cookie, body: form({ slug, action: 'goedkeuren', csrf }) });
    check(r.status === 422 && commits.length === before, 'beheer: goedkeuren vereist bevestiging van de controle');
    r = await req('/beheer/status', { method: 'POST', cookie, body: form({ slug, action: 'publiceren', csrf }) });
    check(r.status === 422 && commits.length === before, 'beheer: concept kan niet direct gepubliceerd worden');
    r = await req('/beheer/status', { method: 'POST', cookie, body: form({ slug, action: 'indienen', csrf }) });
    check(r.status === 303 && /status: "?ter-goedkeuring/.test(repo.get(`content/nieuws/${slug}.md`).text), 'beheer: ter goedkeuring aanbieden');
    r = await req('/beheer/status', { method: 'POST', cookie, body: form({ slug, action: 'goedkeuren', bevestig: 'ja', csrf }) });
    let a = parseArticle(repo.get(`content/nieuws/${slug}.md`).text);
    check(r.status === 303 && a.status === 'goedgekeurd' && a.approvedBy === 'Test Eigenaar' && a.approvedAt, 'beheer: goedkeuren legt naam en tijdstip vast');
    check(!isPublic(a), 'goedgekeurd ≠ openbaar: pas na publiceren of inplannen');
    r = await req('/beheer/status', { method: 'POST', cookie, body: form({ slug, action: 'inplannen', publishAt: '2020-01-01T09:00', csrf }) });
    check(r.status === 422, 'beheer: inplannen in het verleden geweigerd');
    r = await req('/beheer/status', { method: 'POST', cookie, body: form({ slug, action: 'inplannen', publishAt: '2099-03-01T09:30', csrf }) });
    a = parseArticle(repo.get(`content/nieuws/${slug}.md`).text);
    check(r.status === 303 && a.status === 'ingepland' && a.publishAt === '2099-03-01T08:30:00.000Z', 'beheer: inplannen (Nederlandse tijd → UTC)');
    check(commits.at(-1).message.includes('Test Eigenaar') && commits.at(-1).branch === 'main', 'beheer: commitbericht met naam, op ingestelde branch');

    // Publicatieronde (cron)
    r = await fetch(BASE + '/api/cron-publiceren');
    check(r.status === 401, 'cron: zonder geheim geweigerd');
    r = await fetch(BASE + '/api/cron-publiceren', { headers: { Authorization: `Bearer ${CRON}` } });
    let j = await r.json();
    check(r.status === 200 && j.published.length === 0 && /status: "?ingepland/.test(repo.get(`content/nieuws/${slug}.md`).text), 'cron: publiceert niets vóór het ingeplande moment');
    // Zet het moment in het verleden (zoals na verloop van tijd) en draai opnieuw
    const f = repo.get(`content/nieuws/${slug}.md`);
    const past = f.text.replace(/publishAt: .*/, 'publishAt: "2026-01-01T08:00:00.000Z"');
    repo.set(`content/nieuws/${slug}.md`, { text: past, sha: sha(past) });
    // Een ingepland artikel zonder goedkeuring mag de cron nooit publiceren
    const rogue = serializeArticle({ ...parseArticle(past), slug: 'zonder-goedkeuring-ingepland', approvedBy: '', approvedAt: '' }).replace(/approved(By|At): ""\n/g, '') + 'x'.repeat(250);
    repo.set('content/nieuws/zonder-goedkeuring-ingepland.md', { text: rogue, sha: sha(rogue) });
    r = await fetch(BASE + '/api/cron-publiceren', { headers: { Authorization: `Bearer ${CRON}` } });
    j = await r.json();
    check(r.status === 200 && JSON.stringify(j.published) === JSON.stringify([slug]), `cron: publiceert alleen het goedgekeurde, verlopen ingeplande artikel (${j.published})`);
    check(/status: "?gepubliceerd/.test(repo.get(`content/nieuws/${slug}.md`).text) && /status: "?ingepland/.test(repo.get('content/nieuws/zonder-goedkeuring-ingepland.md').text), 'cron: artikel zonder goedkeuring blijft ongepubliceerd');
    repo.delete('content/nieuws/zonder-goedkeuring-ingepland.md');

    // Bewerken van een gepubliceerd artikel = nieuwe goedkeuring + updated
    r = await req(`/beheer/artikel?slug=${slug}`, { cookie });
    t = await r.text();
    const shaField = /name="sha" value="([^"]+)"/.exec(t)[1];
    a = parseArticle(repo.get(`content/nieuws/${slug}.md`).text);
    r = await req('/beheer/opslaan', { method: 'POST', cookie, body: form({ csrf, sha: shaField, slug, title: a.title, category: a.category, description: a.description, intro: a.intro, body: a.body + '\n\nAanvulling.', imageAlt: '', image: '', reviewNotes: '' }) });
    a = parseArticle(repo.get(`content/nieuws/${slug}.md`).text);
    check(r.status === 303 && a.body.trimEnd().endsWith('Aanvulling.') && a.updated && a.status === 'gepubliceerd', `beheer: gepubliceerd artikel bewerken (met updated-datum) [${r.status} ${r.status !== 303 ? (/msg--err[^>]*>([^<]*)/.exec(await r.text()) || [])[1] : ''}]`);
    r = await req('/beheer/opslaan', { method: 'POST', cookie, body: form({ csrf, sha: shaField, slug, title: a.title, category: a.category, description: a.description, intro: a.intro, body: a.body }) });
    check(r.status === 409, 'beheer: verouderde versie opslaan → conflict (geen overschrijving)');
    r = await req('/beheer/opslaan', { method: 'POST', cookie, body: form({ csrf, sha: repo.get(`content/nieuws/${slug}.md`).sha, slug, title: a.title, category: a.category, description: 'te kort', intro: a.intro, body: a.body }) });
    check(r.status === 422, 'beheer: goedgekeurd artikel ongeldig maken wordt geweigerd');

    // Voorbeeld van een concept (noindex, niet openbaar)
    r = await req('/beheer/voorbeeld?slug=ai-en-automatisering-financiele-administratie', { cookie });
    t = await r.text();
    check(r.status === 200 && t.includes('preview-banner') && /name="robots" content="noindex/.test(t) && !t.includes('BlogPosting') && !t.includes('rel="canonical"'), 'beheer: voorbeeld van concept is noindex, zonder canonical en JSON-LD');
    check(!t.includes('Te controleren'), 'beheer: redactie-aantekeningen niet in het voorbeeld van de artikelpagina');

    // Nieuw artikel
    r = await req('/beheer/opslaan', { method: 'POST', cookie, body: form({ csrf, new: '1', title: 'Nieuw testartikel over cashflowplanning voor ondernemers', category: 'ondernemen-en-cashflow', body: '' }) });
    check(r.status === 303 && /status: "?concept/.test(repo.get('content/nieuws/nieuw-testartikel-over-cashflowplanning-voor-ondernemers.md')?.text || ''), 'beheer: nieuw artikel wordt als concept opgeslagen');
    r = await req('/beheer/opslaan', { method: 'POST', cookie, body: form({ csrf, new: '1', title: 'Nieuw testartikel over cashflowplanning voor ondernemers', category: 'ondernemen-en-cashflow' }) });
    check(r.status === 422, 'beheer: dubbele slug geweigerd');
    r = await req('/beheer/opslaan', { method: 'POST', cookie, body: form({ csrf, new: '1', title: 'Artikel met ongeldige categorie test', category: 'bestaat-niet' }) });
    check(r.status === 422, 'beheer: ongeldige categorie geweigerd');

    // Socialmedia
    const s1 = 'financiele-administratie-op-orde-7-controles';
    r = await req('/beheer/social', { method: 'POST', cookie, body: form({ csrf, slug: s1, platform: 'linkedin', action: 'opslaan', text: 'Zeven controles voor een administratie die altijd op orde is. Lees het artikel.' }) });
    check(r.status === 303 && JSON.parse(repo.get(`content/social/${s1}.json`).text).platforms.linkedin.status === 'concept', 'social: concepttekst opgeslagen');
    r = await req('/beheer/social', { method: 'POST', cookie, body: form({ csrf, slug: s1, platform: 'linkedin', action: 'goedkeuren' }) });
    check(r.status === 422, 'social: goedkeuren geweigerd zolang het artikel niet is goedgekeurd');
    r = await req('/beheer/social', { method: 'POST', cookie, body: form({ csrf, slug, platform: 'instagram', action: 'opslaan', text: 'Btw-aangifte voorbereiden zonder fouten: onze checklist.' }) });
    r = await req('/beheer/social', { method: 'POST', cookie, body: form({ csrf, slug, platform: 'instagram', action: 'gepubliceerd', url: 'https://www.instagram.com/p/x' }) });
    check(r.status === 422, 'social: niet-goedgekeurd bericht kan niet als geplaatst worden gemarkeerd');
    r = await req('/beheer/social', { method: 'POST', cookie, body: form({ csrf, slug, platform: 'instagram', action: 'goedkeuren' }) });
    const soc = JSON.parse(repo.get(`content/social/${slug}.json`).text);
    check(r.status === 303 && soc.platforms.instagram.status === 'goedgekeurd' && soc.platforms.instagram.approvedBy === 'Test Eigenaar', 'social: bericht goedgekeurd door eigenaar');
    check(soc.article === slug, 'social: bericht gekoppeld aan het artikel');

    // Redactie-API
    const api = (path, { method = 'GET', body, token = REDACTIE } = {}) =>
      fetch(BASE + '/api/redactie/' + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    r = await api('artikelen', { token: '' });
    check(r.status === 401, 'redactie-API: zonder token geweigerd');
    r = await api('artikelen', { token: 'x'.repeat(40) });
    check(r.status === 401, 'redactie-API: fout token geweigerd');
    r = await api('artikelen');
    j = await r.json();
    check(r.status === 200 && j.articles.length >= 4 && r.headers.get('x-robots-tag') === 'noindex, nofollow', 'redactie-API: artikelen opvragen');
    r = await api('artikelen', { method: 'POST', body: { title: 'Concept via de API over jaarafsluiting', category: 'jaarafsluiting', status: 'goedgekeurd' } });
    check(r.status === 422, 'redactie-API: kan geen goedgekeurde status zetten');
    r = await api('artikelen', { method: 'POST', body: { title: 'Concept via de API over jaarafsluiting', category: 'jaarafsluiting', approvedBy: 'Claude' } });
    check(r.status === 422, 'redactie-API: kan geen goedkeuring invullen');
    r = await api('artikelen', { method: 'POST', body: { title: 'Concept via de API over jaarafsluiting', category: 'jaarafsluiting', body: 'Kort.' } });
    j = await r.json();
    check(r.status === 201 && j.article.status === 'concept', 'redactie-API: concept aanmaken');
    r = await api('artikelen', { method: 'POST', body: { slug: j.article.slug, status: 'ter-goedkeuring' } });
    check(r.status === 422, 'redactie-API: onvolledig artikel kan niet ter goedkeuring');
    r = await api('artikelen', { method: 'POST', body: { slug, title: 'Overschrijven' } });
    check(r.status === 409, 'redactie-API: gepubliceerd artikel kan niet worden gewijzigd');
    r = await api('social', { method: 'POST', body: { slug, platform: 'instagram', text: 'Andere tekst die niet mag.' } });
    check(r.status === 409, 'redactie-API: goedgekeurd socialbericht kan niet worden gewijzigd');
    r = await api('social', { method: 'POST', body: { slug, platform: 'facebook', text: 'Conceptbericht voor Facebook over de btw-aangifte.' } });
    check(r.status === 200 && JSON.parse(repo.get(`content/social/${slug}.json`).text).platforms.facebook.status === 'concept', 'redactie-API: socialconcept opslaan');
    r = await api('social');
    j = await r.json();
    check(j.approved.length === 1 && j.approved[0].platform === 'instagram', 'redactie-API: wachtrij bevat alleen door eigenaar goedgekeurde berichten');
    r = await api('social/gepubliceerd', { method: 'POST', body: { slug, platform: 'facebook', url: 'https://facebook.com/x' } });
    check(r.status === 422, 'redactie-API: niet-goedgekeurd bericht kan niet als geplaatst gemarkeerd worden');
    r = await api('social/gepubliceerd', { method: 'POST', body: { slug, platform: 'instagram', url: 'https://www.instagram.com/p/test123' } });
    const soc2 = JSON.parse(repo.get(`content/social/${slug}.json`).text);
    check(r.status === 200 && soc2.platforms.instagram.status === 'gepubliceerd' && soc2.platforms.instagram.publishedUrl === 'https://www.instagram.com/p/test123', 'redactie-API: geplaatst bericht vastgelegd met link');
    check(checkRedactieInput({ publishAt: 'x', date: 'y' }).length === 2, 'workflow: redactie mag publicatiemoment en datum niet zetten');
    let threw = false;
    try { applyAction({ status: 'concept', title: 't' }, 'goedkeuren', {}); } catch { threw = true; }
    check(threw, 'workflow: goedkeuren zonder persoon onmogelijk');
    check(amsterdamLocalToIso('2026-01-15T10:00') === '2026-01-15T09:00:00.000Z' && amsterdamLocalToIso('2026-07-15T10:00') === '2026-07-15T08:00:00.000Z', 'workflow: wintertijd en zomertijd correct');

    // Terugzetten = offline
    r = await req('/beheer/status', { method: 'POST', cookie, body: form({ slug, action: 'terugzetten', csrf, sha: repo.get(`content/nieuws/${slug}.md`).sha }) });
    a = parseArticle(repo.get(`content/nieuws/${slug}.md`).text);
    check(r.status === 303 && a.status === 'concept' && !a.approvedBy && !isPublic(a), 'beheer: terugzetten haalt artikel offline en wist goedkeuring');

    // Uitloggen
    const csrf2 = await csrfOf('/beheer');
    r = await req('/beheer/uitloggen', { method: 'POST', cookie, body: form({ csrf: csrf2 }) });
    check(r.status === 303 && /Max-Age=0/.test(r.headers.get('set-cookie')), 'beheer: uitloggen wist de cookie');

    // Gebruikersinterface + schermafbeelding
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await page.goto(BASE + '/beheer');
    await page.fill('#wachtwoord', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForSelector('table');
    await page.click('a[href*="financiele-administratie-op-orde"]');
    await page.waitForSelector('#status-titel');
    check(await page.isVisible('text=Ter goedkeuring aanbieden'), 'beheer-UI: statusacties zichtbaar');
    if (SHOTS) await page.screenshot({ path: 'test-results/screenshots/beheer-artikel.png', fullPage: true });
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    check(axe.violations.length === 0, `beheer-UI: WCAG AA${axe.violations.length ? ' — ' + axe.violations.map((v) => `${v.id}: ${v.nodes[0].target}`).join('; ') : ''}`);
    check(errs.length === 0, `beheer-UI: geen console-/CSP-fouten${errs.length ? ' — ' + errs.join(' | ') : ''}`);
    await ctx.close();
  }

  // Inlogbeperking (na de andere tests; ADMIN_LOGIN_MAX=5)
  {
    let limited = false;
    for (let i = 0; i < 6; i++) if ((await req('/beheer/inloggen', { method: 'POST', body: form({ wachtwoord: 'fout' + i }) })).status === 429) limited = true;
    check(limited, 'beheer: te veel inlogpogingen → 429');
  }

  /* ---------- Geen geheimen in de clientcode of logs ---------- */
  {
    const files = (await readdir(OUT, { recursive: true })).filter((f) => /\.(html|js|css|json|xml|txt)$/.test(f));
    const leaks = [];
    for (const f of files) if (/ADMIN_|GITHUB_TOKEN|REDACTIE_TOKEN|CRON_SECRET|reviewNotes|Te controleren/.test(await readFile(`${OUT}/${f}`, 'utf8'))) leaks.push(f);
    check(leaks.length === 0, `geen beheergegevens of geheimen in de gebouwde site${leaks.length ? ' — ' + leaks.join(', ') : ''}`);
    check(![PASSWORD, SECRET, REDACTIE, CRON, GH_TOKEN].some((s) => logs[4500].includes(s)), 'geen geheimen in serverlogs');
    const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
    check(vercel.rewrites.some((r) => r.source === '/beheer/:path*') && vercel.crons?.[0]?.path === '/api/cron-publiceren', 'vercel.json: beheer-rewrite en dagelijkse publicatieronde');
  }
} finally {
  await browser.close();
  site.kill();
  bare.kill();
  github.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) if (!r.ok || process.env.VERBOSE) console.log(`${r.ok ? '✔' : '✘'} ${r.msg}`);
console.log(`\nNieuws: ${results.length - failed.length}/${results.length} controles geslaagd.`);
process.exit(failed.length ? 1 : 0);
