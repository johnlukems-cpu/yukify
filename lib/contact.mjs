// Verwerking van het contactformulier: validatie, spamfilters, rate limiting en verzending via SMTP.
// Wordt gebruikt door de Node-server (serve.mjs) en door de serverless functie op Vercel (api/contact.mjs).
import nodemailer from 'nodemailer';
import { send, sendJson } from './security.mjs';

const env = process.env;
// Op Vercel zet het platform zelf x-forwarded-for; daar is het IP-adres uit die header betrouwbaar.
const TRUST_PROXY = env.TRUST_PROXY === 'true' || Boolean(env.VERCEL);
const MAIL_TO = env.MAIL_TO || 'info@yukifyadministratie.nl';
const MAIL_FROM = env.MAIL_FROM || '';
const RATE_LIMIT_MAX = Number(env.RATE_LIMIT_MAX || 5);

/* ---------- E-mailtransport ---------- */
export const smtpConfigured = Boolean(env.SMTP_HOST && MAIL_FROM);
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
  const text = `Nieuwe aanvraag via yukifyadministratie.nl\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nBericht:\n${d.bericht}\n`;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = `<h2 style="font-family:sans-serif;color:#183F35">Nieuwe aanvraag via yukifyadministratie.nl</h2>
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
  // Vercel kan de body al hebben ingelezen; gebruik die dan en pas dezelfde limiet toe.
  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
    const text = req.body.toString('utf8');
    if (Buffer.byteLength(text) > limit) return Promise.reject(Object.assign(new Error('too large'), { status: 413 }));
    return Promise.resolve(text);
  }
  if (req.body && typeof req.body === 'object') {
    const text = new URLSearchParams(req.body).toString();
    if (Buffer.byteLength(text) > limit) return Promise.reject(Object.assign(new Error('too large'), { status: 413 }));
    return Promise.resolve(text);
  }
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

export async function handleContact(req, res) {
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
