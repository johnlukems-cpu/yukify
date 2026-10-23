// Maakt een statische voorvertoning van dist/ met relatieve links (voor hosting zonder server).
// Gebruik: node scripts/preview.mjs <uitvoermap>
import { cp, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join, relative, dirname, posix } from 'node:path';

const src = 'dist';
const out = process.argv[2];
if (!out) throw new Error('Geef een uitvoermap op');
await rm(out, { recursive: true, force: true });
await cp(src, out, { recursive: true });

const files = [];
async function walk(d) {
  for (const e of await readdir(d)) {
    const p = join(d, e);
    if ((await stat(p)).isDirectory()) await walk(p);
    else files.push(p);
  }
}
await walk(out);

const banner = '<div style="background:#C69A5B;color:#102C25;font:600 14px/1.4 Inter,sans-serif;text-align:center;padding:8px 16px">Voorvertoning van yukifyadministratie.nl — het contactformulier verstuurt in deze voorvertoning geen berichten.</div>';

for (const f of files.filter((f) => f.endsWith('.html'))) {
  const relDir = posix.dirname(relative(out, f).split('\\').join('/'));
  const toRel = (abs) => {
    const [pathPart, rest = ''] = abs.split(/(?=[?#])/);
    let target = pathPart.replace(/^\//, '');
    if (target === '' || target.endsWith('/')) target += 'index.html';
    let r = posix.relative(relDir === '.' ? '' : relDir, target) || 'index.html';
    return r + rest;
  };
  let html = await readFile(f, 'utf8');
  html = html.replace(/(href|src|action)="(\/(?!\/)[^"]*)"/g, (_, a, v) => `${a}="${toRel(v)}"`);
  html = html.replace(/url\('\/assets\//g, `url('${toRel('/assets/')}`.replace('index.html', ''));
  html = html.replace('<body>', '<body>' + banner);
  if (relDir === '.' && f.endsWith('index.html')) {
    // De hoofdpagina wordt door de host in een eigen documentskelet geplaatst.
    html = html.replace(/<!doctype html>\s*<html[^>]*>\s*<head>/i, '').replace('</head>', '').replace(/<body>/, '').replace(/<\/body>\s*<\/html>\s*$/, '');
  }
  await writeFile(f, html);
}
// Fonts in CSS relatief maken
const cssFile = join(out, 'assets/css/styles.css');
await writeFile(cssFile, (await readFile(cssFile, 'utf8')).replace(/url\('\/assets\/fonts\//g, "url('../fonts/"));
console.log(files.length);
