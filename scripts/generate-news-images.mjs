// Genereert per nieuwscategorie een illustratie (SVG voor de pagina, PNG 1200×630 voor Open Graph).
// Opnieuw draaien na wijzigingen: npm run images:nieuws
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { categories } from '../lib/news.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/static/assets/img/nieuws');

const iconPaths = {
  'financiele-administratie': '<rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="3.5" rx=".8"/><path d="M8.5 12.5h.01M12 12.5h.01M15.5 12.5h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01M8.5 18.5h.01M12 18.5h3.5" stroke-width="2.2"/>',
  'btw-en-belastingen': '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m8.5 15.5 7-7"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/>',
  'accountancy-en-regelgeving': '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3" rx="1"/><path d="m9 13 2.2 2.2L15.5 11"/>',
  'ai-en-automatisering': '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M6.5 10v3.5a2 2 0 0 0 2 2H14"/><path d="m11.5 13 2.5 2.5-2.5 2.5"/>',
  boekhoudsoftware: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  'ondernemen-en-cashflow': '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  jaarafsluiting: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
};

function svg(catId, i) {
  const icon = iconPaths[catId];
  const shift = (i % 3) * 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#F7F3E8"/>
  <circle cx="${980 - shift}" cy="120" r="210" fill="none" stroke="#C69A5B" stroke-opacity=".35" stroke-width="2"/>
  <circle cx="${980 - shift}" cy="120" r="130" fill="none" stroke="#C69A5B" stroke-opacity=".25" stroke-width="2"/>
  <path d="M0 520C300 440 720 640 1200 470V630H0z" fill="#183F35"/>
  <path d="M0 520C300 440 720 640 1200 470" fill="none" stroke="#C69A5B" stroke-width="5"/>
  <rect x="${150 + shift}" y="130" width="360" height="300" rx="36" fill="#FFFFFF" stroke="#E2DCCB" stroke-width="2"/>
  <rect x="${190 + shift}" y="175" width="120" height="14" rx="7" fill="#E3EBE7"/>
  <rect x="${190 + shift}" y="210" width="280" height="12" rx="6" fill="#EFE8D6"/>
  <rect x="${190 + shift}" y="240" width="240" height="12" rx="6" fill="#EFE8D6"/>
  <rect x="${190 + shift}" y="270" width="260" height="12" rx="6" fill="#EFE8D6"/>
  <rect x="${190 + shift}" y="320" width="180" height="16" rx="8" fill="#183F35"/>
  <rect x="${190 + shift}" y="360" width="120" height="16" rx="8" fill="#C69A5B"/>
  <g transform="translate(${620 + shift / 2} 150)">
    <rect width="260" height="260" rx="56" fill="#183F35"/>
    <g transform="translate(40 40) scale(7.5)" fill="none" stroke="#C69A5B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
  </g>
</svg>
`;
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [i, c] of categories.entries()) {
  const s = svg(c.id, i);
  await writeFile(join(outDir, `${c.id}.svg`), s);
  await page.setContent(`<style>html,body{margin:0}</style>${s}`);
  await page.screenshot({ path: join(outDir, `${c.id}.png`), clip: { x: 0, y: 0, width: 1200, height: 630 } });
}
await browser.close();
console.log(`Nieuwsafbeeldingen gegenereerd: ${categories.length} categorieën`);
