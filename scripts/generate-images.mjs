// Genereert PNG-afbeeldingen (OG-afbeelding, iconen, logo) en favicon.svg met Chromium.
// Opnieuw draaien na wijzigingen aan het logo: npm run images
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logoMark } from '../src/lib/components.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => join(root, 'src/static', p);
const font = async (pkg, file) => (await readFile(join(root, `node_modules/@fontsource-variable/${pkg}/files/${file}`))).toString('base64');
const manrope = await font('manrope', 'manrope-latin-wght-normal.woff2');
const inter = await font('inter', 'inter-latin-wght-normal.woff2');
const css = (await readFile(join(root, 'src/assets/css/styles.css'), 'utf8')).replace(/@font-face\s*{[^}]*}/g, '');
const base = `<style>
@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${manrope}) format('woff2');font-weight:200 800}
@font-face{font-family:Inter;src:url(data:font/woff2;base64,${inter}) format('woff2');font-weight:100 900}
${css}
*{margin:0}html,body{background:transparent}.og .logo-mark{width:170px;height:142px}</style>`;
const leaf = '<svg class="logo-leaf" viewBox="0 0 20 28"><path d="M4 27C1 18 6 6 18 1c2 10-3 21-14 26z" fill="#C69A5B"/></svg>';

// Icoon: lichte merkvariant op donkergroen
const iconSvg = (rounded) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="${rounded}" fill="#183F35"/><g transform="translate(14 18) scale(.78)">${logoMark({ variant: 'dark' })
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')}</g></svg>`;
await writeFile(out('favicon.svg'), iconSvg(26) + '\n');

const browser = await chromium.launch();
const page = await browser.newPage();
async function shot(html, w, h, file) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(base + html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out(file), clip: { x: 0, y: 0, width: w, height: h } });
}

// OG-afbeelding 1200×630 in de stijl van de aangeleverde banner
await shot(`<div class="og" style="width:1200px;height:630px;background:#F7F3E8;position:relative;overflow:hidden;font-family:Inter;padding:0 80px">
  <svg style="position:absolute;left:0;bottom:0;width:1200px;height:210px" viewBox="0 0 1200 210" preserveAspectRatio="none"><path d="M0 120C300 40 720 210 1200 70V210H0z" fill="#183F35"/><path d="M0 120C300 40 720 210 1200 70" fill="none" stroke="#C69A5B" stroke-width="4"/></svg>
  <svg style="position:absolute;left:0;top:0;width:420px;height:160px" viewBox="0 0 420 160" preserveAspectRatio="none"><path d="M0 0H420C300 30 120 70 0 150z" fill="#183F35"/><path d="M420 0C300 30 120 70 0 150" fill="none" stroke="#C69A5B" stroke-width="4"/></svg>
  <div style="position:relative;display:flex;align-items:center;gap:36px;height:440px">
    <div class="brand" style="font-size:16px">${logoMark()}
      <span class="brand-text"><span class="brand-name" style="font-size:84px">Yuk<span class="logo-i">ı${leaf}</span>fy</span><span class="brand-desc" style="font-size:24px;margin-top:6px">Administratie &amp; Support</span></span></div>
    <div style="width:2px;height:170px;background:#C69A5B"></div>
    <div style="font-family:Manrope;font-weight:800;font-size:36px;line-height:1.25;letter-spacing:-1px;color:#183F35;white-space:nowrap">Meer capaciteit.<br><span style="color:#9A7038">Minder administratieve<br>druk.</span></div>
  </div>
  <div style="position:absolute;left:90px;bottom:40px;font-size:24px;color:#F7F3E8;font-weight:500">Remote administratieve ondersteuning voor Nederlandse kantoren en mkb &nbsp;·&nbsp; www.yukify.nl</div>
</div>`, 1200, 630, 'assets/img/og-yukify.png');

// Logo voor gestructureerde gegevens, 512×512
await shot(`<div style="width:512px;height:512px;display:grid;place-items:center;background:#FFFFFF"><span class="og" style="display:block"><style>.og .logo-mark{width:420px;height:350px}</style>${logoMark()}</span></div>`, 512, 512, 'assets/img/yukify-logo.png');
for (const [s, f, r] of [[180, 'apple-touch-icon.png', 0], [192, 'icon-192.png', 0], [512, 'icon-512.png', 0], [32, 'favicon-32.png', 26]]) {
  await shot(`<div style="width:${s}px;height:${s}px">${iconSvg(r).replace('<svg ', `<svg width="${s}" height="${s}" `)}</div>`, s, s, f);
}
await browser.close();
console.log('Afbeeldingen gegenereerd in src/static/');
