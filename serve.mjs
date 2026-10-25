// Yukify webserver voor eigen hosting (VPS/Node): serveert de gebouwde site (dist/) en verwerkt /api/contact.
// Op Vercel is deze server niet nodig: daar komen de pagina's uit dist/ en draait api/contact.mjs als functie.
// Configuratie via omgevingsvariabelen — zie .env.example. Er staan geen geheimen in client-side code.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { securityHeaders, send, sendJson } from './lib/security.mjs';
import { handleContact, mailConfigured, mailProvider, missingMailSettings } from './lib/contact.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};


/* ---------- Statische bestanden ---------- */
async function serveStatic(req, res, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }
  if (rel.includes('\0')) return send(res, 400, 'Bad request');
  let file = normalize(join(root, rel));
  if (file !== root && !file.startsWith(root + sep)) return send(res, 403, 'Forbidden');

  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    if (!pathname.endsWith('/')) return send(res, 301, '', { Location: `${pathname}/` });
    file = join(file, 'index.html');
    info = await stat(file).catch(() => null);
  }
  if (!info?.isFile()) {
    const body = await readFile(join(root, '404.html')).catch(() => 'Pagina niet gevonden');
    return send(res, 404, req.method === 'HEAD' ? '' : body, { 'Content-Type': 'text/html; charset=utf-8' });
  }
  const ext = extname(file);
  const immutable = ext === '.woff2' || (/\/assets\//.test(pathname) && /[?&]v=/.test(req.url));
  res.writeHead(200, {
    ...securityHeaders,
    'Content-Type': types[ext] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

/* ---------- Server ---------- */
export const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/contact') {
      if (req.method !== 'POST') return send(res, 405, 'Method not allowed', { Allow: 'POST' });
      return await handleContact(req, res);
    }
    if (pathname === '/healthz') return sendJson(res, 200, { ok: true, mail: mailConfigured, provider: mailProvider, missing: missingMailSettings });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    return await serveStatic(req, res, pathname);
  } catch (err) {
    console.error('[yukify] Onverwachte fout:', err);
    if (!res.headersSent) send(res, 500, 'Er ging iets mis.');
    else res.end();
  }
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => console.log(`[yukify] Server actief op http://localhost:${PORT}`));
}
