// End-to-end tests: pagina's, links, SEO, toegankelijkheid, responsiviteit en het contactformulier.
// Gebruik: npm test   (bouwt eerst de site)
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdir } from 'node:fs/promises';
import { SMTPServer } from 'smtp-server';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { securityHeaders } from '../lib/security.mjs';
import site from '../site.config.mjs';
const MAILTO = `mailto:${site.email}`;

const SHOTS = process.env.SHOTS !== 'false';
const results = [];
const fail = (msg) => results.push({ ok: false, msg });
const pass = (msg) => results.push({ ok: true, msg });
const check = (cond, msg) => (cond ? pass(msg) : fail(msg));

/* ---------- Test-SMTP-server ---------- */
const mails = [];
// Net als Gmail: inloggen verplicht. Testaccount met een "app-wachtwoord" (zonder spaties).
const TEST_USER = 'info@yukifyadministratie.nl';
const TEST_PASS = 'abcdefghijklmnop';
const smtp = new SMTPServer({
  authOptional: false,
  allowInsecureAuth: true,
  disabledCommands: ['STARTTLS'],
  logger: false,
  onAuth(auth, session, cb) {
    if (auth.username === TEST_USER && auth.password === TEST_PASS) return cb(null, { user: auth.username });
    return cb(Object.assign(new Error('Username and Password not accepted'), { responseCode: 535 }));
  },
  onData(stream, session, cb) {
    let raw = '';
    stream.on('data', (c) => (raw += c));
    stream.on('end', () => {
      mails.push(raw.replace(/=\r?\n/g, ''));
      cb();
    });
  },
});
await new Promise((r) => smtp.listen(2525, '127.0.0.1', r));

const CLEAN_ENV = { SMTP_HOST: '', SMTP_PORT: '', SMTP_SECURE: '', SMTP_USER: '', SMTP_PASS: '', MAIL_FROM: '', MAIL_TO: '', SMTP_REQUIRE_TLS: '', RESEND_API_KEY: '', RESEND_API_URL: '' };

/* ---------- Nagebootste Resend-API (POST /emails) ---------- */
const RESEND_KEY = 're_test_0123456789';
const resendCalls = [];
const resendApi = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const json = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.method !== 'POST' || req.url !== '/emails') return json(404, { name: 'not_found' });
    if (req.headers.authorization !== `Bearer ${RESEND_KEY}`) return json(401, { statusCode: 401, name: 'validation_error', message: 'API key is invalid' });
    const data = JSON.parse(body);
    if (!/@yukifyadministratie\.nl>?$/.test(data.from)) return json(403, { statusCode: 403, name: 'validation_error', message: 'domain not verified' });
    resendCalls.push(data);
    json(200, { id: `test-${resendCalls.length}` });
  });
});
await new Promise((r) => resendApi.listen(4300, '127.0.0.1', r));
const RESEND_TEST_ENV = { RESEND_API_URL: 'http://127.0.0.1:4300' };
const logs = {};
function startServer(port, extraEnv) {
  const child = spawn(process.execPath, ['serve.mjs'], {
    env: { ...process.env, ...CLEAN_ENV, PORT: String(port), HOST: '127.0.0.1', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  logs[port] = '';
  child.stdout.on('data', (d) => (logs[port] += d));
  child.stderr.on('data', (d) => (logs[port] += d));
  return new Promise((resolve) => {
    child.stdout.on('data', (d) => d.toString().includes('Server actief') && resolve(child));
  });
}
// Lokale test-SMTP zonder TLS; in productie (smtp.gmail.com:465) is TLS altijd aan.
const SMTP_TEST_ENV = { SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_SECURE: 'false', SMTP_REQUIRE_TLS: 'false', SMTP_USER: TEST_USER };
// App-wachtwoord zoals Google het toont (met spaties); MAIL_FROM en MAIL_TO bewust leeg → standaardwaarden.
const live = await startServer(4100, { RATE_LIMIT_MAX: '10', ...SMTP_TEST_ENV, SMTP_PASS: 'abcd efgh ijkl mnop' });
const unconfigured = await startServer(4101, {});
const partial = await startServer(4102, { SMTP_HOST: 'smtp.gmail.com' });
const wrongPass = await startServer(4103, { ...SMTP_TEST_ENV, SMTP_PASS: 'fout-wachtwoord-123' });
const viaResend = await startServer(4104, { ...RESEND_TEST_ENV, RESEND_API_KEY: RESEND_KEY });
const resendWrongKey = await startServer(4105, { ...RESEND_TEST_ENV, RESEND_API_KEY: 're_verkeerde_sleutel_999' });
const BASE = 'http://127.0.0.1:4100';

const pages = process.env.ONLY ? JSON.parse(process.env.ONLY) : ['/', '/diensten/', '/administratiekantoren/', '/mkb/', '/over-yukify/', '/veelgestelde-vragen/', '/contact/', '/privacyverklaring/', '/algemene-voorwaarden/', '/contact/bedankt/', '/contact/niet-verzonden/'];
const viewports = { desktop: { width: 1440, height: 900 }, tablet: { width: 820, height: 1180 }, mobile: { width: 390, height: 844 } };
// Extra breedtes alleen voor overflowcontrole (geen screenshots)
const extraWidths = { 'w320': { width: 320, height: 640 }, 'w360': { width: 360, height: 740 }, 'w430': { width: 430, height: 932 }, 'w1024': { width: 1024, height: 768 } };
const TEL = 'tel:+31614856469';
const WA = 'https://wa.me/31614856469?text=Hallo%20Yukify%2C%20ik%20wil%20graag%20meer%20informatie%20over%20jullie%20administratieve%20ondersteuning.';
const NAV_PAGES = ['/', '/diensten/', '/administratiekantoren/', '/mkb/', '/over-yukify/', '/veelgestelde-vragen/', '/contact/'];

const browser = await chromium.launch();
await mkdir('test-results/screenshots', { recursive: true });

try {
  /* ---------- Per pagina ---------- */
  const titles = new Set();
  const descriptions = new Set();
  const linkTargets = new Set();
  for (const path of pages) {
    const ctx = await browser.newContext({ viewport: viewports.desktop });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    check(res.status() === 200, `${path}: HTTP 200`);
    check(errors.length === 0, `${path}: geen console-/CSP-fouten${errors.length ? ' — ' + errors.join(' | ') : ''}`);

    const meta = await page.evaluate(() => ({
      title: document.title,
      desc: document.querySelector('meta[name=description]')?.content,
      canonical: document.querySelector('link[rel=canonical]')?.href,
      ogTitle: document.querySelector('meta[property="og:title"]')?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      robots: document.querySelector('meta[name=robots]')?.content,
      h1: document.querySelectorAll('h1').length,
      lang: document.documentElement.lang,
      imgsNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
      svgRoleImgNoName: [...document.querySelectorAll('svg[role=img]')].filter((s) => !s.getAttribute('aria-label') && !s.getAttribute('aria-labelledby')).length,
      headingSkips: (() => {
        const hs = [...document.querySelectorAll('main h1, main h2, main h3, main h4')].map((h) => +h.tagName[1]);
        return hs.filter((l, i) => i > 0 && l - hs[i - 1] > 1).length;
      })(),
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
        try { JSON.parse(s.textContent); return true; } catch { return false; }
      }),
    }));
    check(meta.title && meta.title.length <= 65, `${path}: title aanwezig (${meta.title.length} tekens)`);
    // Max. 170: de door de eigenaar opgegeven homepage-description is iets langer dan de gebruikelijke 160.
    if (!meta.robots.includes('noindex')) check(meta.desc && meta.desc.length >= 70 && meta.desc.length <= 170, `${path}: meta description (${meta.desc?.length} tekens)`);
    if (!path.startsWith('/contact/')) {
      check(!titles.has(meta.title), `${path}: unieke title`);
      check(!descriptions.has(meta.desc), `${path}: unieke description`);
    }
    titles.add(meta.title);
    descriptions.add(meta.desc);
    if (meta.robots.includes('noindex')) check(meta.canonical === undefined, `${path}: geen canonical op noindex-pagina`);
    else check(meta.canonical === `https://www.yukifyadministratie.nl${path}`, `${path}: canonical op www (${meta.canonical})`);
    check(meta.ogTitle && meta.ogImage, `${path}: Open Graph`);
    check(meta.h1 === 1, `${path}: precies één H1 (${meta.h1})`);
    check(meta.lang === 'nl', `${path}: lang="nl"`);
    check(meta.imgsNoAlt === 0 && meta.svgRoleImgNoName === 0, `${path}: alle afbeeldingen hebben een alt/naam`);
    check(meta.headingSkips === 0, `${path}: logische koppenstructuur`);
    check(meta.jsonLd.every(Boolean), `${path}: geldige JSON-LD (${meta.jsonLd.length})`);
    for (const l of meta.links) {
      if (l.startsWith('/') || l.startsWith('#')) linkTargets.add(l.startsWith('#') ? path + l : l);
      if (l.startsWith('mailto:')) check(l === 'mailto:info@yukifyadministratie.nl', `${path}: mailto-link ${l}`);
      if (l.startsWith('tel:')) check(l === TEL, `${path}: telefoonlink ${l}`);
      if (l.includes('wa.me')) check(l === WA, `${path}: WhatsApp-link correct`);
      if (/linkedin|instagram/i.test(l)) fail(`${path}: sociale link zonder ingestelde URL: ${l}`);
    }

    // Toegankelijkheid (axe, WCAG 2.1 A/AA)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    check(axe.violations.length === 0, `${path}: axe WCAG 2.1 AA${axe.violations.length ? ' — ' + axe.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0].target}`).join('; ') : ''}`);

    // Contactmogelijkheden in footer
    const footer = await page.evaluate(() => [...document.querySelectorAll('.site-footer a')].map((a) => a.getAttribute('href')));
    check([MAILTO, 'tel:+31614856469', '/privacyverklaring/', '/algemene-voorwaarden/'].every((h) => footer.includes(h)) && footer.some((h) => h.includes('wa.me/31614856469')), `${path}: footer bevat e-mail, telefoon, WhatsApp en juridische links`);
    check((await page.textContent('.site-footer')).includes('Paramaribo, Suriname'), `${path}: footer toont locatie`);
    check((await page.textContent('.footer-slogan')).trim() === 'Uw betrouwbare partner voor financiële backoffice', `${path}: footer-slogan`);

    // Responsiviteit
    for (const [name, vp] of Object.entries(extraWidths)) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(overflow <= 0, `${path} [${name}]: geen horizontale scroll (${overflow}px)`);
    }
    for (const [name, vp] of Object.entries(viewports)) {
      await page.setViewportSize(vp);
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible')));
      await page.waitForTimeout(700);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(overflow <= 0, `${path} [${name}]: geen horizontale scroll (${overflow}px)`);
      if (SHOTS) await page.screenshot({ path: `test-results/screenshots/${name}${path.replace(/\//g, '_') || '_home'}.png`, fullPage: true });
    }
    await ctx.close();
  }

  /* ---------- Koppen: geen woordafbreking of overloop ---------- */
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of pages) {
        await page.goto(BASE + path);
        const issues = await page.evaluate(() => {
          const out = [];
          for (const h of document.querySelectorAll('h1, h2, h3, h4')) {
            if (!h.offsetParent || h.closest('.visually-hidden') || h.classList.contains('visually-hidden')) continue;
            const cs = getComputedStyle(h);
            if (cs.hyphens !== 'none') out.push(`hyphens=${cs.hyphens}: ${h.textContent.trim().slice(0, 40)}`);
            if (h.scrollWidth > h.clientWidth + 1) out.push(`overloop: ${h.textContent.trim().slice(0, 40)}`);
            const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
            let n;
            while ((n = walker.nextNode())) {
              const re = /\S+/g;
              let m;
              while ((m = re.exec(n.textContent))) {
                const r = document.createRange();
                r.setStart(n, m.index);
                r.setEnd(n, m.index + m[0].length);
                const tops = new Set([...r.getClientRects()].map((x) => Math.round(x.top)));
                if (tops.size > 1) out.push(`woord gebroken: ${m[0]}`);
              }
            }
          }
          return out;
        });
        check(issues.length === 0, `${path} [${width}px]: koppen zonder afgebroken woorden${issues.length ? ' — ' + issues.join('; ') : ''}`);
      }
    }
    await page.goto(BASE + '/');
    check((await page.textContent('#hero-titel')).replace(/\s+/g, ' ').trim() === 'Uw betrouwbare partner voor financiële backoffice', 'hero-headline heeft de juiste tekst');
    check((await page.textContent('.hero .hero-price')).replace(/\s+/g, ' ').trim() === 'Vanaf € 12 per uur', 'hero toont klein "Vanaf € 12 per uur" onder de kop');
    await ctx.close();
  }

  /* ---------- Geen oude domein- of e-mailverwijzingen in de gebouwde site ---------- */
  {
    const { readdir } = await import('node:fs/promises');
    const files = (await readdir('dist', { recursive: true })).filter((f) => /\.(html|xml|txt|js|css|json|webmanifest)$/.test(f));
    const hits = [];
    for (const f of files) if (/yukify\.nl|info@yukify\b/i.test(await readFile(`dist/${f}`, 'utf8'))) hits.push(f);
    check(hits.length === 0, `geen verwijzingen naar yukify.nl of info@yukify.nl in dist/${hits.length ? ' — ' + hits.join(', ') : ''}`);
    check(site.url === 'https://www.yukifyadministratie.nl' && site.email === 'info@yukifyadministratie.nl', 'centrale config gebruikt het nieuwe domein en e-mailadres');
  }

  /* ---------- SEO-metadata (gerenderde HTML) ---------- */
  {
    const WWW = 'https://www.yukifyadministratie.nl';
    const EXPECTED_NOINDEX = ['/privacyverklaring/', '/algemene-voorwaarden/', '/contact/bedankt/', '/contact/niet-verzonden/', '/404.html'];
    const htmlOf = async (p) => readFile(p === '/404.html' ? 'dist/404.html' : `dist${p}index.html`, 'utf8');
    const attr = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
    const allPaths = [...new Set([...pages, '/404.html'])];
    const indexable = [];
    for (const p of allPaths) {
      const html = await htmlOf(p);
      const count = (re) => (html.match(re) || []).length;
      const once = ['<title>', 'name="description"', 'name="robots"', 'property="og:type"', 'property="og:site_name"', 'property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:image"', 'property="og:locale"', 'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"'];
      const dup = once.filter((t) => count(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) !== 1);
      const noindex = /name="robots" content="noindex/.test(html);
      if (!noindex) indexable.push(p);
      check(dup.length === 0 && count(/rel="canonical"/g) === (noindex ? 0 : 1), `${p}: elke SEO-tag precies één keer${dup.length ? ' — ' + dup.join(', ') : ''}`);
      check(!/name="keywords"/.test(html), `${p}: geen meta keywords`);
      check(attr(html, /property="og:image" content="([^"]+)"/g)[0] === `${WWW}/assets/img/og-yukify.png` && attr(html, /name="twitter:image" content="([^"]+)"/g)[0] === `${WWW}/assets/img/og-yukify.png`, `${p}: OG/Twitter-afbeelding absolute https-URL op www`);
      check(attr(html, /property="og:url" content="([^"]+)"/g)[0].startsWith(WWW + '/'), `${p}: og:url op www`);
      check(!/yukify\.vercel\.app|yukify\.nl|https:\/\/yukifyadministratie\.nl/.test(html), `${p}: geen oude of niet-voorkeursdomeinen`);
    }
    check(JSON.stringify(allPaths.filter((p) => !indexable.includes(p)).sort()) === JSON.stringify([...EXPECTED_NOINDEX].sort()), `noindex alleen op bedoelde pagina's (${allPaths.filter((p) => !indexable.includes(p)).join(', ')})`);

    // Homepage exact volgens opdracht
    const home = await htmlOf('/');
    const meta = (name) => attr(home, new RegExp(`(?:name|property)="${name}" content="([^"]*)"`, 'g'))[0];
    const dec = (v) => v.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    check(attr(home, /<title>([^<]*)<\/title>/g)[0] === 'Uw betrouwbare partner voor financiële backoffice', 'home: title');
    check(meta('description') === 'Yukify biedt administratieve ondersteuning op afstand voor administratie- en accountantskantoren. Meer capaciteit, minder administratieve druk. Ontdek onze ondersteuning.', 'home: meta description');
    check(attr(home, /rel="canonical" href="([^"]+)"/g)[0] === `${WWW}/`, 'home: canonical');
    check(meta('og:type') === 'website' && dec(meta('og:site_name')) === 'Yukify — Administratie & Support' && dec(meta('og:title')) === 'Yukify — Administratie & Support' && meta('og:url') === `${WWW}/` && meta('og:locale') === 'nl_NL', 'home: og:type/site_name/title/url/locale');
    check(meta('og:description') === 'Meer capaciteit. Minder administratieve druk. Administratieve ondersteuning op afstand voor administratie- en accountantskantoren.', 'home: og:description');
    check(meta('twitter:card') === 'summary_large_image', 'home: twitter:card summary_large_image');

    // Unieke titels en beschrijvingen over alle indexeerbare pagina's
    const titles = [], descs = [];
    for (const p of indexable) { const h = await htmlOf(p); titles.push(attr(h, /<title>([^<]*)<\/title>/g)[0]); descs.push(attr(h, /name="description" content="([^"]*)"/g)[0]); }
    check(new Set(titles).size === titles.length && new Set(descs).size === descs.length, 'unieke titles en descriptions op alle indexeerbare pagina\'s');

    // Sitemap en robots.txt
    const sm = await readFile('dist/sitemap.xml', 'utf8');
    const locs = attr(sm, /<loc>([^<]+)<\/loc>/g);
    check(JSON.stringify(locs.sort()) === JSON.stringify(indexable.map((p) => WWW + p).sort()), `sitemap bevat precies de ${indexable.length} indexeerbare pagina's op www`);
    const robots = await readFile('dist/robots.txt', 'utf8');
    check(/^User-agent: \*$/m.test(robots) && /^Allow: \/$/m.test(robots) && robots.includes(`Sitemap: ${WWW}/sitemap.xml`) && !/^Disallow: \/$/m.test(robots), 'robots.txt staat indexeren toe en verwijst naar de sitemap op www');

    // Deelafbeelding bestaat en is 1200×630
    const png = await readFile('dist/assets/img/og-yukify.png');
    check(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, 'og-yukify.png is 1200×630');

    // Gestructureerde gegevens: alleen bevestigde velden
    const ld = attr(home, /<script type="application\/ld\+json">(.*?)<\/script>/g).map((j) => JSON.parse(j));
    const org = ld.find((d) => d['@type'] === 'Organization');
    const web = ld.find((d) => d['@type'] === 'WebSite');
    check(org && web && org.url === `${WWW}/` && web.url === `${WWW}/`, 'JSON-LD: Organization en WebSite op www');
    check(org.email === 'info@yukifyadministratie.nl' && org.telephone === '+31614856469' && org.contactPoint.telephone === '+31614856469', 'JSON-LD: e-mail en telefoon kloppen');
    const forbidden = ['openingHours', 'openingHoursSpecification', 'aggregateRating', 'review', 'priceRange', 'vatID', 'taxID', 'leiCode', 'foundingDate', 'award'];
    check(forbidden.every((k) => !(k in org)) && !('streetAddress' in org.address) && !('postalCode' in org.address) && !('sameAs' in org), 'JSON-LD: geen verzonnen adres, registratie, openingstijden, reviews, prijzen of sociale profielen');
    check(home.includes('info@yukifyadministratie.nl') && home.includes('+31 6 14856469') && home.includes('Paramaribo'), 'JSON-LD-gegevens staan ook zichtbaar op de site');

    // vercel.json: noindex-header alleen voor *.vercel.app
    const vercelCfg = JSON.parse(await readFile('vercel.json', 'utf8'));
    const vh = vercelCfg.headers.find((h) => h.has && h.has.some((x) => x.type === 'host'));
    check(vh && vh.headers.some((x) => x.key === 'X-Robots-Tag' && x.value === 'noindex') && new RegExp(`^${vh.has[0].value}$`).test('yukify.vercel.app') && !new RegExp(`^${vh.has[0].value}$`).test('www.yukifyadministratie.nl'), 'X-Robots-Tag noindex alleen op *.vercel.app');
  }

  /* ---------- Softwarekennis (homepage) ---------- */
  {
    const NAMES = ['AFAS Profit', 'AFAS SB', 'Exact Online', 'e-Boekhouden.nl', 'Moneybird', 'Online Boekhouden', 'Yuki', 'Zenvoices', 'Basecone', 'AFAS InSite', 'monday.com', 'ChatGPT', 'Claude', 'Gemini'];
    const ctx = await browser.newContext({ viewport: viewports.desktop });
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    const info = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('main > section')].map((sec) => sec.id || sec.getAttribute('aria-labelledby') || sec.className);
      const sw = document.getElementById('softwarekennis');
      return {
        order: ids,
        heading: sw?.querySelector('h2')?.textContent.trim(),
        names: [...(sw?.querySelectorAll('.software-card h4') || [])].map((h) => h.textContent.trim()),
        imgs: sw ? sw.querySelectorAll('img').length : -1,
        text: sw?.textContent || '',
      };
    });
    const iDienst = info.order.indexOf('diensten-titel'), iSoft = info.order.indexOf('softwarekennis'), iCta = info.order.findIndex((x) => /cta|Contact/i.test(x));
    check(iSoft > iDienst && iSoft < info.order.indexOf('proces-titel') && (iCta === -1 || iSoft < iCta), `softwaresectie direct na diensten en vóór de contactoproep (${info.order.join(' > ')})`);
    check(info.heading === 'Ervaring met financiële software en tools', 'softwaresectie: juiste titel');
    check(JSON.stringify(info.names) === JSON.stringify(NAMES), `softwaresectie: alle ${NAMES.length} pakketten (${info.names.join(', ')})`);
    check(info.imgs === 0, 'softwaresectie: geen (nagemaakte) logo-afbeeldingen');
    const claimText = info.text.replace(/Yukify is geen officiële partner van deze leveranciers/, '');
    check(!/certific|gecertificeerd|partner|expert|specialist/i.test(claimText) && info.text.includes('geen officiële partner'), 'softwaresectie: geen claims over certificering of partnerschap');
    for (const [w, cols] of [[1440, 3], [820, 2], [390, 1], [320, 1]]) {
      await page.setViewportSize({ width: w, height: 900 });
      const n = await page.evaluate(() => { const ys = [...document.querySelectorAll('#software-financieel + .software-grid .software-card')].map((c) => Math.round(c.getBoundingClientRect().top)); return ys.filter((y) => y === ys[0]).length; });
      check(n === cols, `softwaresectie ${w}px: ${cols} kolom(men) (${n})`);
      if (SHOTS && (w === 1440 || w === 390)) {
        await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible')));
        await page.waitForTimeout(700);
        await page.locator('#softwarekennis').screenshot({ path: `test-results/screenshots/software-${w}.png` });
      }
    }
    await ctx.close();
  }

  /* ---------- Interne links en ankers ---------- */
  for (const target of linkTargets) {
    const [p, hash] = target.split('#');
    const r = await fetch(BASE + p.split('?')[0]);
    check(r.ok, `link ${target}: ${r.status}`);
    if (hash) {
      const html = await r.text();
      check(html.includes(`id="${hash}"`), `anker #${hash} bestaat op ${p}`);
    }
  }
  for (const f of ['/robots.txt', '/sitemap.xml', '/favicon.svg', '/favicon-32.png', '/apple-touch-icon.png', '/site.webmanifest', '/assets/img/og-yukify.png', '/assets/img/yukify-logo.png']) {
    const r = await fetch(BASE + f);
    check(r.ok, `bestand ${f}: ${r.status}`);
  }
  const sitemap = await (await fetch(BASE + '/sitemap.xml')).text();
  check(!sitemap.includes('bedankt') && !sitemap.includes('niet-verzonden'), 'sitemap bevat geen bevestigingspagina\'s');
  const r404 = await fetch(BASE + '/bestaat-niet/');
  check(r404.status === 404 && (await r404.text()).includes('niet vinden'), '404-pagina');
  const trav = await fetch(BASE + '/..%2f..%2fpackage.json');
  check(trav.status === 403 || trav.status === 404, `path traversal geblokkeerd (${trav.status})`);
  const hdr = (await fetch(BASE + '/')).headers;
  check(hdr.get('content-security-policy')?.includes("default-src 'self'"), 'Content-Security-Policy header');
  check(hdr.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options header');
  const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
  const vCsp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy')?.value;
  check(vCsp === securityHeaders['Content-Security-Policy'], 'vercel.json bevat dezelfde CSP als de server');

  /* ---------- Mobiel menu & toetsenbord ---------- */
  {
    for (const width of [320, 360, 390, 430, 768]) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 400 ? 640 : 900 }, hasTouch: true });
      const page = await ctx.newPage();
      await page.goto(BASE + '/diensten/');
      const tag = `menu ${width}px`;
      check(!(await page.isVisible('.header-cta')), `${tag}: geen grote CTA in de mobiele header`);
      const tb = await page.locator('.nav-toggle').boundingBox();
      check(tb && tb.width >= 44 && tb.height >= 44 && tb.x + tb.width <= width, `${tag}: hamburgerknop ≥ 44×44 en binnen beeld`);
      check((await page.getAttribute('.nav-toggle', 'aria-label')) === 'Menu openen', `${tag}: aria-label "Menu openen"`);
      check(!(await page.isVisible('#main-nav a[href="/diensten/"]')), `${tag}: menu standaard dicht`);
      check(!(await page.isVisible('.nav-toggle .icon-close')), `${tag}: geen sluiticoon zichtbaar bij gesloten menu`);
      await page.click('.nav-toggle');
      check((await page.getAttribute('.nav-toggle', 'aria-expanded')) === 'true' && (await page.getAttribute('.nav-toggle', 'aria-label')) === 'Menu sluiten', `${tag}: aria-expanded=true en label "Menu sluiten"`);
      check(await page.isVisible('.nav-toggle .icon-close'), `${tag}: sluitknop zichtbaar bij open menu`);
      const navBox = await page.locator('#main-nav').boundingBox();
      const vh = page.viewportSize().height;
      check(navBox && navBox.x >= 0 && navBox.x + navBox.width <= width && navBox.y + navBox.height >= vh - 1, `${tag}: menu vult het scherm onder de header (${Math.round(navBox?.height)}px)`);
      check(await page.evaluate(() => document.activeElement.closest('#main-nav') !== null), `${tag}: focus gaat naar het menu`);
      // Alle pagina's bereikbaar, zichtbaar, niet bedekt en groot genoeg
      for (const href of NAV_PAGES) {
        const link = page.locator(`#main-nav .nav-list a[href="${href}"]`);
        await link.scrollIntoViewIfNeeded();
        const box = await link.boundingBox();
        const onTop = await link.evaluate((a) => {
          const r = a.getBoundingClientRect();
          const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return a.contains(el);
        });
        check(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= width && onTop, `${tag}: menu-item ${href} zichtbaar, niet bedekt, ≥ 44px hoog`);
      }
      for (const sel of [`#main-nav a[href="${TEL}"]`, `#main-nav a[href="${WA}"]`, `#main-nav a[href="${MAILTO}"]`, '#main-nav a[href="/contact/"].btn']) {
        const l = page.locator(sel);
        await l.scrollIntoViewIfNeeded();
        const box = await l.boundingBox();
        check(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= width + 0.5, `${tag}: ${sel.slice(0, 50)} in menu, ≥ 44px`);
      }
      const ovf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(ovf <= 0, `${tag}: geen horizontale scroll met open menu`);
      const menuAxe = await new AxeBuilder({ page }).include('#main-nav').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      check(menuAxe.violations.length === 0, `${tag}: open menu voldoet aan WCAG AA (contrast e.d.)${menuAxe.violations.length ? ' — ' + menuAxe.violations.map((v) => `${v.id}: ${v.nodes[0].target}`).join('; ') : ''}`);
      const radius = await page.locator('#main-nav .mobile-nav-contact .btn').first().evaluate((el) => getComputedStyle(el).borderRadius);
      check(parseFloat(radius) > 20, `${tag}: knoppen in menu behouden knopstijl`);
      if (SHOTS && width === 390) { await page.evaluate(() => (document.getElementById('main-nav').scrollTop = 0)); await page.screenshot({ path: 'test-results/screenshots/menu-open-390.png' }); }
      // Tab blijft binnen het menu
      for (let i = 0; i < 20; i++) await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => (document.activeElement.closest('#main-nav, .nav-toggle') ? 'ok' : document.activeElement.outerHTML.slice(0, 80)));
      check(focused === 'ok', `${tag}: Tab-focus blijft in het menu${focused === 'ok' ? '' : ' — ' + focused}`);
      await page.keyboard.press('Escape');
      check(!(await page.isVisible('#main-nav a[href="/diensten/"]')), `${tag}: Escape sluit menu`);
      check(await page.evaluate(() => document.activeElement.classList.contains('nav-toggle')), `${tag}: focus terug op de menuknop`);
      await page.click('.nav-toggle');
      await page.click('#main-nav .nav-list a[href="/over-yukify/"]');
      await page.waitForURL('**/over-yukify/');
      check(!(await page.isVisible('#main-nav a[href="/diensten/"]')), `${tag}: menu dicht na navigeren`);
      await ctx.close();
    }
    // Desktopheader blijft intact
    {
      const ctx = await browser.newContext({ viewport: viewports.desktop });
      const page = await ctx.newPage();
      await page.goto(BASE + '/');
      check(await page.isVisible('.header-cta') && !(await page.isVisible('.nav-toggle')), 'desktop: CTA zichtbaar, geen hamburger');
      let all = true;
      for (const href of NAV_PAGES.slice(1)) all = all && (await page.isVisible(`#main-nav a[href="${href}"]`));
      check(all, 'desktop: alle navigatielinks zichtbaar');
      const heights = await page.evaluate(() => [...document.querySelectorAll('.main-nav .nav-list > li:not(.nav-mobile-only) a')].map((a) => a.getBoundingClientRect().height));
      check(heights.every((h) => h < 50), 'desktop: navigatielinks op één regel');
      await ctx.close();
    }

    const ctx2 = await browser.newContext({ viewport: viewports.desktop });
    const p2 = await ctx2.newPage();
    await p2.goto(BASE + '/');
    await p2.keyboard.press('Tab');
    check((await p2.evaluate(() => document.activeElement.className)) === 'skip-link', 'toetsenbord: eerste Tab = skiplink');
    await p2.keyboard.press('Enter');
    check((await p2.evaluate(() => document.activeElement.id)) === 'main', 'toetsenbord: skiplink springt naar inhoud');
    const focusOutline = await p2.evaluate(() => {
      const a = document.querySelector('.main-nav .nav-list > li:not(.nav-mobile-only) a');
      a.focus();
      return getComputedStyle(a).outlineStyle;
    });
    check(focusOutline !== 'none', `toetsenbord: zichtbare focusstijl (${focusOutline})`);
    // FAQ met toetsenbord
    await p2.goto(BASE + '/veelgestelde-vragen/');
    await p2.focus('details summary');
    await p2.keyboard.press('Enter');
    check(await p2.evaluate(() => document.querySelector('details').open), 'toetsenbord: FAQ opent met Enter');
    await ctx2.close();
  }

  /* ---------- Contactformulier ---------- */
  async function fillFull(page, overrides = {}) {
    const v = { naam: 'Test Persoon', bedrijf: 'Testkantoor B.V.', email: 'test@voorbeeld.nl', telefoon: '+31 20 123 4567', bericht: 'Wij zoeken ondersteuning bij de verwerking van inkoopfacturen.', ...overrides };
    await page.fill('#contact-naam', v.naam);
    await page.fill('#contact-bedrijf', v.bedrijf);
    await page.fill('#contact-email', v.email);
    await page.fill('#contact-telefoon', v.telefoon);
    await page.selectOption('#contact-organisatie', 'accountantskantoor');
    await page.selectOption('#contact-ondersteuning', 'btw');
    await page.selectOption('#contact-uren', '20-40');
    await page.fill('#contact-bericht', v.bericht);
  }
  {
    const ctx = await browser.newContext({ viewport: viewports.desktop });
    const page = await ctx.newPage();
    let posted = 0;
    page.on('request', (r) => r.url().includes('/api/contact') && posted++);

    // 1. Leeg verzenden → foutmeldingen, geen verzoek
    await page.goto(BASE + '/contact/');
    await page.click('#contact-formulier button[type=submit]');
    const errs = await page.$$eval('#contact-formulier .field-error.is-visible', (els) => els.map((e) => e.textContent));
    check(errs.length >= 6, `formulier: foutmeldingen bij leeg verzenden (${errs.length})`);
    check(posted === 0, 'formulier: geen verzending bij ongeldige invoer');
    check(await page.evaluate(() => document.activeElement.id === 'contact-naam'), 'formulier: focus naar eerste fout');

    // 2. Ongeldig e-mailadres
    await fillFull(page, { email: 'geen-email' });
    await page.click('#contact-formulier button[type=submit]');
    check((await page.textContent('#contact-email-error')).includes('geldig e-mailadres'), 'formulier: melding ongeldig e-mailadres');

    // 3. Voorinvullen via queryparameter
    await page.goto(BASE + '/contact/?dienst=achterstanden');
    check((await page.inputValue('#contact-ondersteuning')) === 'achterstanden', 'formulier: dienst voorgeselecteerd via ?dienst=');

    // 4. Geldige verzending → echte e-mail op test-SMTP
    await page.goto(BASE + '/contact/');
    await page.waitForTimeout(3200); // spamfilter: minimaal 3 seconden invultijd
    await fillFull(page);
    const before = mails.length;
    await page.click('#contact-formulier button[type=submit]');
    await page.waitForSelector('#contact-formulier .form-status--success', { timeout: 10000 });
    check((await page.textContent('#contact-formulier .form-status')).includes('je bericht is verzonden'), 'formulier: bevestiging na echte verzending');
    check(mails.length === before + 1, 'formulier: e-mail daadwerkelijk ontvangen door SMTP-server');
    const mail = mails.at(-1) || '';
    check(/To: info@yukifyadministratie\.nl/i.test(mail) && /From: "?Yukify website"? <info@yukifyadministratie\.nl>/i.test(mail) && /Reply-To: .*test@voorbeeld\.nl/i.test(mail) && mail.includes('Testkantoor B.V.') && mail.includes('Ondersteuning bij btw-processen'), 'formulier: e-mail bevat juiste ontvanger, reply-to en velden');
    if (SHOTS) await page.screenshot({ path: 'test-results/screenshots/form-success.png' });

    // 5. Compact formulier op kantorenpagina
    await page.goto(BASE + '/administratiekantoren/');
    await page.waitForTimeout(3200);
    await page.fill('#aanvraag-naam', 'Kantoor Tester');
    await page.fill('#aanvraag-bedrijf', 'Admin Kantoor');
    await page.fill('#aanvraag-email', 'kantoor@voorbeeld.nl');
    await page.fill('#aanvraag-bericht', 'Wij hebben extra capaciteit nodig in het btw-kwartaal.');
    await page.click('#aanvraag-formulier button[type=submit]');
    await page.waitForSelector('#aanvraag-formulier .form-status--success', { timeout: 10000 });
    check(mails.at(-1).includes('Admin Kantoor'), 'formulier (kantoren): e-mail daadwerkelijk ontvangen');
    await ctx.close();

    // 6. Server zonder SMTP-configuratie → eerlijke foutmelding, geen succes
    const ctx2 = await browser.newContext({ viewport: viewports.mobile });
    const p2 = await ctx2.newPage();
    await p2.goto('http://127.0.0.1:4101/contact/');
    await p2.waitForTimeout(3200);
    await fillFull(p2);
    await p2.click('#contact-formulier button[type=submit]');
    await p2.waitForSelector('#contact-formulier .form-status--error', { timeout: 10000 });
    const t = await p2.textContent('#contact-formulier .form-status');
    check(t.includes('niet verzonden') && !t.includes('Bedankt'), 'formulier zonder SMTP: duidelijke foutmelding, geen schijnsucces');
    if (SHOTS) await p2.screenshot({ path: 'test-results/screenshots/form-unconfigured-mobile.png', fullPage: false });
    await ctx2.close();
  }

  /* ---------- API direct (zonder JavaScript) ---------- */
  const form = (o) => new URLSearchParams({ formulier: 'full', naam: 'Zonder JS', bedrijf: 'Bedrijf', email: 'nojs@voorbeeld.nl', organisatie: 'mkb', ondersteuning: 'anders', bericht: 'Bericht verstuurd zonder JavaScript.', ...o }).toString();
  const post = (body, accept = 'text/html', port = 4100) =>
    fetch(`http://127.0.0.1:${port}/api/contact`, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: accept }, body });
  let r = await post(form({}));
  check(r.status === 303 && r.headers.get('location') === '/contact/bedankt/', 'zonder JS: redirect naar bedankpagina na verzending');
  r = await post(form({ email: 'fout' }));
  check(r.status === 303 && r.headers.get('location') === '/contact/niet-verzonden/', 'zonder JS: ongeldige invoer → niet-verzonden-pagina');
  r = await post(form({ website: 'spam' }), 'application/json');
  check(r.status === 400, 'honeypot blokkeert spam');
  r = await post(form({ naam: 'X'.repeat(30000) }), 'application/json');
  check(r.status === 413, `te grote invoer geweigerd (${r.status})`);
  r = await post(form({}), 'application/json', 4101);
  check(r.status === 503 && (await r.json()).ok === false, 'zonder SMTP: API meldt 503');
  r = await fetch(BASE + '/api/contact');
  check(r.status === 405, 'GET op API geweigerd');
  // Header-injectie in naam
  const beforeInj = mails.length;
  r = await post(form({ naam: 'Aanval\r\nBcc: slachtoffer@voorbeeld.nl', email: 'inj@voorbeeld.nl' }), 'application/json', 4100);
  const injMail = mails.length > beforeInj ? mails.at(-1) : '';
  check(!/^Bcc:/im.test(injMail), 'geen header-injectie via formuliervelden');
  /* ---------- E-mailconfiguratie ---------- */
  {
    const h1 = await (await fetch('http://127.0.0.1:4101/healthz')).json();
    check(h1.mail === false && h1.provider === 'none' && h1.missing.join() === 'RESEND_API_KEY', `healthz zonder configuratie: mail=false, ontbrekende naam getoond (${h1.missing})`);
    const h2 = await (await fetch('http://127.0.0.1:4102/healthz')).json();
    check(h2.mail === false && h2.missing.join() === 'SMTP_USER,SMTP_PASS', `gedeeltelijke configuratie herkend (${h2.missing})`);
    const rp = await post(form({}), 'application/json', 4102);
    check(rp.status === 503 && (await rp.json()).ok === false, 'gedeeltelijke configuratie: 503, geen succes');
    const h3 = await (await fetch(BASE + '/healthz')).json();
    check(h3.mail === true && h3.missing.length === 0, 'healthz met volledige configuratie: mail=true');
    check(JSON.stringify(h3).indexOf('abcd') === -1, 'healthz toont geen geheimen');
    const before = mails.length;
    const rw = await post(form({ email: 'fout-ww@voorbeeld.nl' }), 'application/json', 4103);
    const jw = await rw.json();
    check(rw.status === 502 && jw.ok === false && mails.length === before, 'fout app-wachtwoord: 502, geen succes, niets verzonden');
    await new Promise((r) => setTimeout(r, 200));
    check(/EAUTH.*app-wachtwoord/.test(logs[4103]), 'log noemt de oorzaak (authenticatie)');
    check(!logs[4103].includes('fout-wachtwoord-123') && !logs[4100].includes('abcd') && !logs[4100].includes(TEST_PASS), 'geen wachtwoorden in de logs');
    // Controlescript
    const runCheck = (args, env) => new Promise((resolve) => {
      const c = spawn(process.execPath, ['scripts/check-mail.mjs', ...args], { env: { ...process.env, ...CLEAN_ENV, ...env } });
      let out = '';
      c.stdout.on('data', (d) => (out += d));
      c.stderr.on('data', (d) => (out += d));
      c.on('close', (code) => resolve({ code, out }));
    });
    let c = await runCheck([], { ...SMTP_TEST_ENV, SMTP_PASS: 'abcd efgh ijkl mnop' });
    check(c.code === 0 && c.out.includes('OK — stap: login'), 'check-mail: inloggen lukt');
    const n = mails.length;
    c = await runCheck(['--send'], { ...SMTP_TEST_ENV, SMTP_PASS: 'abcd efgh ijkl mnop' });
    check(c.code === 0 && mails.length === n + 1 && mails.at(-1).includes('Testbericht contactformulier'), 'check-mail --send: testbericht afgeleverd');
    c = await runCheck([], { ...SMTP_TEST_ENV, SMTP_PASS: 'verkeerd' });
    check(c.code === 1 && c.out.includes('EAUTH') && !c.out.includes('verkeerd'), 'check-mail: fout wachtwoord gemeld zonder het wachtwoord te tonen');
    c = await runCheck([], {});
    check(c.code === 1 && c.out.includes('RESEND_API_KEY'), 'check-mail: ontbrekende variabelen gemeld');

    /* Resend */
    const hr = await (await fetch('http://127.0.0.1:4104/healthz')).json();
    check(hr.mail === true && hr.provider === 'resend' && hr.missing.length === 0 && !JSON.stringify(hr).includes(RESEND_KEY), 'healthz met Resend: mail=true, provider=resend, geen sleutel zichtbaar');
    const rr = await post(form({ naam: 'Resend Tester', bedrijf: 'Kantoor Resend', email: 'bezoeker@voorbeeld.nl' }), 'application/json', 4104);
    const rj = await rr.json();
    const call = resendCalls.at(-1) || {};
    check(rr.status === 200 && rj.ok === true && resendCalls.length >= 1, 'Resend: formulier verzonden na acceptatie door Resend');
    check(JSON.stringify(call.to) === '["info@yukifyadministratie.nl"]' && call.from === 'Yukify website <website@yukifyadministratie.nl>' && call.reply_to === 'bezoeker@voorbeeld.nl', `Resend: ontvanger, afzender op eigen domein en Reply-To kloppen (${call.from} / ${call.reply_to})`);
    check(call.subject.includes('Kantoor Resend') && call.text.includes('Resend Tester') && call.html.includes('Kantoor Resend'), 'Resend: onderwerp en inhoud bevatten de formuliergegevens');
    const beforeWrong = resendCalls.length;
    const rw2 = await post(form({ email: 'sleutel@voorbeeld.nl' }), 'application/json', 4105);
    check(rw2.status === 502 && (await rw2.json()).ok === false && resendCalls.length === beforeWrong, 'Resend met foute sleutel: 502, geen succes');
    await new Promise((r) => setTimeout(r, 200));
    check(/RESEND_401.*API-sleutel/.test(logs[4105]) && !logs[4105].includes('re_verkeerde_sleutel_999') && !logs[4104].includes(RESEND_KEY), 'Resend: oorzaak gelogd zonder sleutel');
    c = await runCheck(['--send'], { ...RESEND_TEST_ENV, RESEND_API_KEY: RESEND_KEY });
    check(c.code === 0 && c.out.includes('Provider: resend') && c.out.includes('geaccepteerd voor info@yukifyadministratie.nl') && !c.out.includes(RESEND_KEY), 'check-mail --send via Resend: testbericht geaccepteerd');
  }
  // Rate limiting (al meerdere verzoeken gedaan vanaf dit IP)
  let limited = false;
  for (let i = 0; i < 8; i++) if ((await post(form({}), 'application/json')).status === 429) limited = true;
  check(limited, 'rate limiting actief');
} finally {
  await browser.close();
  live.kill();
  unconfigured.kill();
  partial.kill();
  viaResend.kill();
  resendWrongKey.kill();
  resendApi.close();
  wrongPass.kill();
  smtp.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) if (!r.ok || process.env.VERBOSE) console.log(`${r.ok ? '✔' : '✘'} ${r.msg}`);
console.log(`\n${results.length - failed.length}/${results.length} controles geslaagd.`);
process.exit(failed.length ? 1 : 0);
