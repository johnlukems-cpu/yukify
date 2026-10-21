// Yukify webserver: serveert de gebouwde site (dist/) en verwerkt het contactformulier via SMTP.
// Configuratie via omgevingsvariabelen — zie .env.example. Er staan geen geheimen in client-side code.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const env = process.env;
const PORT = Number(env.PORT || 3000);
const HOST = env.HOST || '0.0.0.0';
const TRUST_PROXY = env.TRUST_PROXY === 'true';
const MAIL_TO = env.MAIL_TO || 'info@yukify.nl';
const MAIL_FROM = env.MAIL_FROM || '';
const RATE_LIMIT_MAX = Number(env.RATE_LIMIT_MAX || 5);

/* ---------- E-mailtransport ---------- */
const smtpConfigured = Boolean(env.SMTP_HOST && MAIL_FROM);
const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;
if (!smtpConfigured) {
  console.warn('[yukify] LET OP: SMTP is niet geconfigureerd (SMTP_HOST en MAIL_FROM ontbreken). Het contactformulier geeft een foutmelding totdat dit is ingesteld.');
}

/* ---------- Beveiligingsheaders ---------- */
const INLINE_SCRIPT = "document.documentElement.classList.add('js')";
const inlineHash = createHash('sha256').update(INLINE_SCRIPT).digest('base64');
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    `script-src 'self' 'sha256-${inlineHash}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  ...(env.HSTS === 'true' ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
};

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

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...securityHeaders, ...headers });
  res.end(body);
}
function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
}

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

/* ---------- Contactformulier ---------- */
const ORG = new Set(['administratiekantoor', 'accountantskantoor', 'mkb', 'anders', 'kantoor']);
const SUPPORT = new Set(['financiele-administratie', 'btw', 'achterstanden', 'remote-ondersteuning', 'procesverbetering', 'anders']);
const HOURS = new Set(['onbekend', 'tot-20', '20-40', '40-80', '80-plus', 'eenmalig']);
const LABELS = {
  organisatie: { administratiekantoor: 'Administratiekantoor', accountantskantoor: 'Accountantskantoor', mkb: 'Mkb-onderneming', anders: 'Anders', kantoor: 'Administratie- of accountantskantoor' },
  ondersteuning: { 'financiele-administratie': 'Financiële administratie', btw: 'Ondersteuning bij btw-processen', achterstanden: 'Administratieve achterstanden', 'remote-ondersteuning': 'Remote ondersteuning voor kantoor', procesverbetering: 'Procesverbetering en automatisering', anders: 'Weet ik nog niet / combinatie' },
  uren: { onbekend: 'Nog niet bekend', 'tot-20': 'Tot 20 uur per maand', '20-40': '20 – 40 uur per maand', '40-80': '40 – 80 uur per maand', '80-plus': 'Meer dan 80 uur per maand', eenmalig: 'Eenmalig project' },
};
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[+()0-9\s.-]{6,25}$/;
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
const oneLine = (v) => v.replace(/[\r\n]+/g, ' ');

export function validate(raw) {
  const d = {
    naam: oneLine(clean(raw.naam, 120)),
    bedrijf: oneLine(clean(raw.bedrijf, 160)),
    email: oneLine(clean(raw.email, 200)),
    telefoon: oneLine(clean(raw.telefoon, 40)),
    organisatie: clean(raw.organisatie, 40),
    ondersteuning: clean(raw.ondersteuning, 40),
    uren: clean(raw.uren, 40),
    bericht: clean(raw.bericht, 4000),
    pagina: oneLine(clean(raw.pagina, 120)),
    formulier: clean(raw.formulier, 20) === 'compact' ? 'compact' : 'full',
  };
  const errors = {};
  if (d.naam.length < 2) errors.naam = 'Vul je naam in.';
  if (d.bedrijf.length < 2) errors.bedrijf = 'Vul de naam van je bedrijf of kantoor in.';
  if (!EMAIL_RE.test(d.email)) errors.email = 'Vul een geldig e-mailadres in.';
  if (d.telefoon && !PHONE_RE.test(d.telefoon)) errors.telefoon = 'Vul een geldig telefoonnummer in, of laat dit veld leeg.';
  if (d.formulier === 'full') {
    if (!ORG.has(d.organisatie)) errors.organisatie = 'Kies het type organisatie.';
    if (!SUPPORT.has(d.ondersteuning)) errors.ondersteuning = 'Kies de gewenste ondersteuning.';
  } else {
    if (d.organisatie && !ORG.has(d.organisatie)) errors.organisatie = 'Ongeldige keuze.';
    if (d.ondersteuning && !SUPPORT.has(d.ondersteuning)) errors.ondersteuning = 'Ongeldige keuze.';
  }
  if (d.uren && !HOURS.has(d.uren)) errors.uren = 'Ongeldige keuze.';
  if (d.bericht.length < 10) errors.bericht = 'Vertel kort waar je ondersteuning bij zoekt (minimaal 10 tekens).';
  return { data: d, errors };
}

function buildMail(d) {
  const rows = [
    ['Naam', d.naam],
    ['Bedrijf / kantoor', d.bedrijf],
    ['E-mail', d.email],
    ['Telefoon', d.telefoon || '—'],
    ['Type organisatie', LABELS.organisatie[d.organisatie] || '—'],
    ['Gewenste ondersteuning', LABELS.ondersteuning[d.ondersteuning] || '—'],
    ['Geschatte uren', LABELS.uren[d.uren] || '—'],
    ['Verstuurd vanaf', d.pagina || '—'],
  ];
  const text = `Nieuwe aanvraag via yukify.nl\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nBericht:\n${d.bericht}\n`;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = `<h2 style="font-family:sans-serif;color:#183F35">Nieuwe aanvraag via yukify.nl</h2>
<table style="font-family:sans-serif;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5A605C">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`)
    .join('')}</table>
<h3 style="font-family:sans-serif;color:#183F35">Bericht</h3><p style="font-family:sans-serif;white-space:pre-wrap">${esc(d.bericht)}</p>`;
  return {
    from: MAIL_FROM,
    to: MAIL_TO,
    replyTo: { name: d.naam, address: d.email },
    subject: `Nieuwe aanvraag: ${d.bedrijf} (${d.naam})`.slice(0, 180),
    text,
    html,
  };
}

// Eenvoudige rate limiting per IP (in geheugen): standaard max 5 verzendingen per 10 minuten.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > 10 * 60 * 1000) hits.delete(k);
  return list.length > RATE_LIMIT_MAX;
}

function readBody(req, limit = 20 * 1024) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        // Stop met lezen; het antwoord wordt met 'Connection: close' verstuurd en daarna wordt de verbinding gesloten.
        req.pause();
        reject(Object.assign(new Error('too large'), { status: 413 }));
      } else chunks.push(c);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleContact(req, res) {
  const wantsJson = (req.headers.accept || '').includes('application/json');
  const fail = (status, message, errors) =>
    wantsJson ? sendJson(res, status, { ok: false, message, ...(errors ? { errors } : {}) }) : send(res, 303, '', { Location: '/contact/niet-verzonden/' });

  const ctype = (req.headers['content-type'] || '').split(';')[0].trim();
  if (ctype !== 'application/x-www-form-urlencoded') return fail(415, 'Ongeldig verzoek.');

  const ip = (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'onbekend';
  if (rateLimited(ip)) return fail(429, 'Je hebt kort achter elkaar meerdere berichten verstuurd. Probeer het over enkele minuten opnieuw.');

  let raw;
  try {
    raw = Object.fromEntries(new URLSearchParams(await readBody(req)));
  } catch (e) {
    res.setHeader('Connection', 'close');
    res.on('finish', () => req.destroy());
    return fail(e.status || 400, 'Het bericht is te groot of ongeldig.');
  }

  // Spamfilters: honeypot-veld en een onrealistisch snelle invulling (alleen gemeten met JavaScript).
  const seconds = Number(raw.t);
  if (raw.website || (raw.t && Number.isFinite(seconds) && seconds < 3)) {
    return fail(400, 'Je bericht kon niet worden verwerkt. Mail ons direct als dit blijft gebeuren.');
  }

  const { data, errors } = validate(raw);
  if (Object.keys(errors).length) return fail(422, 'Niet alle velden zijn juist ingevuld.', errors);

  if (!transporter) {
    console.error('[yukify] Contactformulier ontvangen maar SMTP is niet geconfigureerd; bericht NIET verzonden.');
    return fail(503, 'Het contactformulier is op dit moment niet beschikbaar.');
  }
  try {
    await transporter.sendMail(buildMail(data));
  } catch (err) {
    console.error('[yukify] Verzenden mislukt:', err.code || err.message);
    return fail(502, 'Het verzenden is mislukt door een technische storing.');
  }
  return wantsJson ? sendJson(res, 200, { ok: true }) : send(res, 303, '', { Location: '/contact/bedankt/' });
}

/* ---------- Server ---------- */
export const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/contact') {
      if (req.method !== 'POST') return send(res, 405, 'Method not allowed', { Allow: 'POST' });
      return await handleContact(req, res);
    }
    if (pathname === '/healthz') return sendJson(res, 200, { ok: true, mail: smtpConfigured });
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
