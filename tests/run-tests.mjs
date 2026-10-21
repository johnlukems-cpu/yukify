// End-to-end tests: pagina's, links, SEO, toegankelijkheid, responsiviteit en het contactformulier.
// Gebruik: npm test   (bouwt eerst de site)
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { SMTPServer } from 'smtp-server';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { securityHeaders } from '../lib/security.mjs';

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
  const child = spawn(process.execPath, ['serve.mjs'], {
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
      if (l.startsWith('tel:')) check(l === TEL, `${path}: telefoonlink ${l}`);
      if (l.includes('wa.me')) check(l === WA, `${path}: WhatsApp-link correct`);
      if (/linkedin|instagram/i.test(l)) fail(`${path}: sociale link zonder ingestelde URL: ${l}`);
    }

    // Toegankelijkheid (axe, WCAG 2.1 A/AA)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    check(axe.violations.length === 0, `${path}: axe WCAG 2.1 AA${axe.violations.length ? ' — ' + axe.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0].target}`).join('; ') : ''}`);

    // Contactmogelijkheden in footer
    const footer = await page.evaluate(() => [...document.querySelectorAll('.site-footer a')].map((a) => a.getAttribute('href')));
    check(['mailto:info@yukify.nl', 'tel:+31614856469', '/privacyverklaring/', '/algemene-voorwaarden/'].every((h) => footer.includes(h)) && footer.some((h) => h.includes('wa.me/31614856469')), `${path}: footer bevat e-mail, telefoon, WhatsApp en juridische links`);
    check((await page.textContent('.site-footer')).includes('Paramaribo, Suriname'), `${path}: footer toont locatie`);

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
      for (const sel of [`#main-nav a[href="${TEL}"]`, `#main-nav a[href="${WA}"]`, '#main-nav a[href="mailto:info@yukify.nl"]', '#main-nav a[href="/contact/"].btn']) {
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
