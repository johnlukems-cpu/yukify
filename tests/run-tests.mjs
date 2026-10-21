// End-to-end tests: pagina's, links, SEO, toegankelijkheid, responsiviteit en het contactformulier.
// Gebruik: npm test   (bouwt eerst de site)
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { SMTPServer } from 'smtp-server';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const SHOTS = process.env.SHOTS !== 'false';
const results = [];
const fail = (msg) => results.push({ ok: false, msg });
const pass = (msg) => results.push({ ok: true, msg });
const check = (cond, msg) => (cond ? pass(msg) : fail(msg));

/* ---------- Test-SMTP-server ---------- */
const mails = [];
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS', 'AUTH'],
  logger: false,
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

function startServer(port, extraEnv) {
  const child = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', SMTP_HOST: '', MAIL_FROM: '', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve) => {
    child.stdout.on('data', (d) => d.toString().includes('Server actief') && resolve(child));
    child.stderr.on('data', () => {});
  });
}
const live = await startServer(4100, { RATE_LIMIT_MAX: '10', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_SECURE: 'false', MAIL_FROM: 'Yukify website <website@yukify.nl>', MAIL_TO: 'info@yukify.nl' });
const unconfigured = await startServer(4101, {});
const BASE = 'http://127.0.0.1:4100';

const pages = ['/', '/diensten/', '/administratiekantoren/', '/mkb/', '/over-yukify/', '/veelgestelde-vragen/', '/contact/', '/privacyverklaring/', '/algemene-voorwaarden/', '/contact/bedankt/', '/contact/niet-verzonden/'];
const viewports = { desktop: { width: 1440, height: 900 }, tablet: { width: 820, height: 1180 }, mobile: { width: 390, height: 844 } };

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
    check(meta.title && meta.title.length <= 70, `${path}: title aanwezig (${meta.title.length} tekens)`);
    if (!meta.robots.includes('noindex')) check(meta.desc && meta.desc.length >= 70 && meta.desc.length <= 160, `${path}: meta description (${meta.desc?.length} tekens)`);
    if (!path.startsWith('/contact/')) {
      check(!titles.has(meta.title), `${path}: unieke title`);
      check(!descriptions.has(meta.desc), `${path}: unieke description`);
    }
    titles.add(meta.title);
    descriptions.add(meta.desc);
    check(meta.canonical === `https://www.yukify.nl${path}`, `${path}: canonical`);
    check(meta.ogTitle && meta.ogImage, `${path}: Open Graph`);
    check(meta.h1 === 1, `${path}: precies één H1 (${meta.h1})`);
    check(meta.lang === 'nl', `${path}: lang="nl"`);
    check(meta.imgsNoAlt === 0 && meta.svgRoleImgNoName === 0, `${path}: alle afbeeldingen hebben een alt/naam`);
    check(meta.headingSkips === 0, `${path}: logische koppenstructuur`);
    check(meta.jsonLd.every(Boolean), `${path}: geldige JSON-LD (${meta.jsonLd.length})`);
    for (const l of meta.links) {
      if (l.startsWith('/') || l.startsWith('#')) linkTargets.add(l.startsWith('#') ? path + l : l);
      if (l.startsWith('mailto:')) check(l === 'mailto:info@yukify.nl', `${path}: mailto-link ${l}`);
      if (l.startsWith('tel:') || l.includes('wa.me')) fail(`${path}: onbevestigd telefoon-/WhatsApp-nummer gelinkt: ${l}`);
    }

    // Toegankelijkheid (axe, WCAG 2.1 A/AA)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    check(axe.violations.length === 0, `${path}: axe WCAG 2.1 AA${axe.violations.length ? ' — ' + axe.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0].target}`).join('; ') : ''}`);

    // Responsiviteit
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

  /* ---------- Mobiel menu & toetsenbord ---------- */
  {
    const ctx = await browser.newContext({ viewport: viewports.mobile });
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    check(await page.isVisible('.header-cta'), 'mobiel: CTA-knop zichtbaar in header');
    check(!(await page.isVisible('#main-nav a[href="/diensten/"]')), 'mobiel: menu standaard dicht');
    await page.click('.nav-toggle');
    check(await page.isVisible('#main-nav a[href="/diensten/"]'), 'mobiel: menu opent');
    check((await page.getAttribute('.nav-toggle', 'aria-expanded')) === 'true', 'mobiel: aria-expanded=true');
    await page.keyboard.press('Escape');
    check(!(await page.isVisible('#main-nav a[href="/diensten/"]')), 'mobiel: Escape sluit menu');
    await page.click('.nav-toggle');
    await page.click('#main-nav a[href="/contact/"]');
    await page.waitForURL('**/contact/');
    pass('mobiel: navigeren via menu werkt');
    await ctx.close();

    const ctx2 = await browser.newContext({ viewport: viewports.desktop });
    const p2 = await ctx2.newPage();
    await p2.goto(BASE + '/');
    await p2.keyboard.press('Tab');
    check((await p2.evaluate(() => document.activeElement.className)) === 'skip-link', 'toetsenbord: eerste Tab = skiplink');
    await p2.keyboard.press('Enter');
    check((await p2.evaluate(() => document.activeElement.id)) === 'main', 'toetsenbord: skiplink springt naar inhoud');
    const focusOutline = await p2.evaluate(() => {
      const a = document.querySelector('.main-nav a');
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
    check(/To: info@yukify\.nl/i.test(mail) && /Reply-To: .*test@voorbeeld\.nl/i.test(mail) && mail.includes('Testkantoor B.V.') && mail.includes('Ondersteuning bij btw-processen'), 'formulier: e-mail bevat juiste ontvanger, reply-to en velden');
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
  // Rate limiting (al meerdere verzoeken gedaan vanaf dit IP)
  let limited = false;
  for (let i = 0; i < 8; i++) if ((await post(form({}), 'application/json')).status === 429) limited = true;
  check(limited, 'rate limiting actief');
} finally {
  await browser.close();
  live.kill();
  unconfigured.kill();
  smtp.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) if (!r.ok || process.env.VERBOSE) console.log(`${r.ok ? '✔' : '✘'} ${r.msg}`);
console.log(`\n${results.length - failed.length}/${results.length} controles geslaagd.`);
process.exit(failed.length ? 1 : 0);
