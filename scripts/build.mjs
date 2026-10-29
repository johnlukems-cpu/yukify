// Bouwt de statische website naar dist/.
import { mkdir, rm, writeFile, readFile, cp, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import site from '../site.config.mjs';
import { layout } from '../src/lib/components.mjs';
import home from '../src/pages/home.mjs';
import diensten from '../src/pages/diensten.mjs';
import kantoren from '../src/pages/kantoren.mjs';
import mkb from '../src/pages/mkb.mjs';
import over from '../src/pages/over.mjs';
import faq from '../src/pages/faq.mjs';
import contact, { thanksPage, failedPage, notFoundPage } from '../src/pages/contact.mjs';
import { privacyPage, termsPage } from '../src/pages/legal.mjs';
import { listingPages, articlePage, searchIndex } from '../src/pages/news.mjs';
import { loadArticles, publicArticles, plainText, publicationDate, isPublic } from '../lib/news.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// BUILD_OUT_DIR, NEWS_CONTENT_DIR en BUILD_NOW zijn alleen voor tests en controles.
const dist = join(root, process.env.BUILD_OUT_DIR || 'dist');
const now = process.env.BUILD_NOW ? new Date(process.env.BUILD_NOW) : new Date();

// Nieuws: alleen goedgekeurde en vrijgegeven artikelen worden gebouwd (zie lib/news.mjs → isPublic).
const allArticles = await loadArticles(join(root, process.env.NEWS_CONTENT_DIR || 'content/nieuws'));
const pub = publicArticles(allArticles, now);
const articlePages = pub.map((a) => ({ ...articlePage(a, pub), lastmod: a.updated || publicationDate(a) }));

const pages = [home, diensten, kantoren, mkb, over, faq, ...listingPages(pub), ...articlePages, contact, privacyPage, termsPage, thanksPage, failedPage, notFoundPage];

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'assets/fonts'), { recursive: true });

// Assets
await cp(join(root, 'src/assets'), join(dist, 'assets'), { recursive: true });
await cp(join(root, 'src/static'), dist, { recursive: true });
for (const [pkg, file] of [
  ['manrope', 'manrope-latin-wght-normal.woff2'],
  ['inter', 'inter-latin-wght-normal.woff2'],
]) {
  await copyFile(join(root, `node_modules/@fontsource-variable/${pkg}/files/${file}`), join(dist, 'assets/fonts', file));
}

const hash = createHash('sha256');
hash.update(await readFile(join(root, 'src/assets/css/styles.css')));
hash.update(await readFile(join(root, 'src/assets/js/main.js')));
hash.update(await readFile(join(root, 'src/assets/js/news.js')));
const assetVersion = hash.digest('hex').slice(0, 10);

// Pagina's
const seen = new Set();
for (const page of pages) {
  for (const key of ['title', 'description']) {
    if (seen.has(page[key])) throw new Error(`Dubbele ${key}: ${page[key]}`);
    seen.add(page[key]);
  }
  const html = layout({ ...page, assetVersion }, page.render());
  const out = page.path.endsWith('.html') ? join(dist, page.path) : join(dist, page.path, 'index.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html);
}

// Sitemap & robots
const today = new Date().toISOString().slice(0, 10);
const indexable = pages.filter((p) => !p.noindex && p.inSitemap !== false);
await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${site.url}${p.path}</loc><lastmod>${p.lastmod || today}</lastmod></url>`).join('\n')}
</urlset>
`,
);
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /beheer\n\nSitemap: ${site.url}/sitemap.xml\n`);

// Zoekindex voor Nieuws & Inzichten (alleen openbare artikelen)
await writeFile(join(dist, 'nieuws/zoekindex.json'), JSON.stringify(searchIndex(pub, plainText)));

const hidden = allArticles.filter((a) => !isPublic(a, now)).length;
console.log(`Build gereed: ${pages.length} pagina's, ${indexable.length} in sitemap, ${pub.length} openbare artikelen (${hidden} niet openbaar) (assets v${assetVersion}).`);
