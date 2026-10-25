// Verwerking van het contactformulier: validatie, spamfilters, rate limiting en verzending via Resend of SMTP.
// Wordt gebruikt door de Node-server (serve.mjs) en door de serverless functie op Vercel (api/contact.mjs).
import nodemailer from 'nodemailer';
import { send, sendJson } from './security.mjs';

const env = process.env;
// Op Vercel zet het platform zelf x-forwarded-for; daar is het IP-adres uit die header betrouwbaar.
const TRUST_PROXY = env.TRUST_PROXY === 'true' || Boolean(env.VERCEL);
const MAIL_TO = (env.MAIL_TO || 'info@yukifyadministratie.nl').trim();
const RATE_LIMIT_MAX = Number(env.RATE_LIMIT_MAX || 5);

/* ---------- E-mailtransport ----------
   Twee mogelijkheden; Resend heeft voorrang als RESEND_API_KEY is ingesteld.
   1. Resend (HTTP-API): RESEND_API_KEY verplicht. MAIL_FROM moet een adres op het in Resend
      geverifieerde domein zijn; standaard "Yukify website <website@yukifyadministratie.nl>".
   2. SMTP (bijv. Google Workspace): SMTP_HOST, SMTP_USER, SMTP_PASS verplicht; optioneel SMTP_PORT (465)
      en SMTP_SECURE (true bij 465). MAIL_FROM standaard het SMTP-account zelf.
   MAIL_TO standaard info@yukifyadministratie.nl. Antwoorden gaan via Reply-To naar de bezoeker.
   Waarden van geheimen worden nooit gelogd; bij ontbrekende instellingen loggen we alleen de namen. */
const RESEND_API_KEY = (env.RESEND_API_KEY || '').trim();
const RESEND_API_URL = (env.RESEND_API_URL || 'https://api.resend.com').replace(/\/+$/, '');
const SMTP_USER = (env.SMTP_USER || '').trim();
// App-wachtwoorden van Google worden met spaties getoond ("abcd efgh ijkl mnop"); spaties horen er niet bij.
const SMTP_PASS = (env.SMTP_PASS || '').replace(/\s+/g, '');
const SMTP_PORT = Number(env.SMTP_PORT || 465);
const SMTP_SECURE = env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : SMTP_PORT === 465;

export const mailProvider = RESEND_API_KEY ? 'resend' : (env.SMTP_HOST || SMTP_USER || SMTP_PASS) ? 'smtp' : 'none';
const MAIL_FROM =
  (env.MAIL_FROM || '').trim() ||
  (mailProvider === 'resend' ? 'Yukify website <website@yukifyadministratie.nl>' : SMTP_USER ? `Yukify website <${SMTP_USER}>` : '');

export const missingMailSettings =
  mailProvider === 'resend'
    ? []
    : mailProvider === 'smtp'
      ? ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !(k === 'SMTP_PASS' ? SMTP_PASS : (env[k] || '').trim()))
      : ['RESEND_API_KEY'];
export const mailConfigured = missingMailSettings.length === 0;
const transporter =
  mailConfigured && mailProvider === 'smtp'
    ? nodemailer.createTransport({
        host: env.SMTP_HOST.trim(),
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        requireTLS: !SMTP_SECURE && env.SMTP_REQUIRE_TLS !== 'false',
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        // Kort houden zodat de serverless functie een nette foutmelding geeft in plaats van een time-out.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      })
    : null;
if (!mailConfigured) {
  console.warn(`[yukify] LET OP: e-mail is niet geconfigureerd; ontbrekende variabelen: ${missingMailSettings.join(', ')}. Het contactformulier geeft een foutmelding totdat dit is ingesteld.`);
}

/** Verstuurt een bericht via Resend; gooit een fout met `code` (en `status`) als Resend het niet accepteert. */
async function sendViaResend(msg) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  let res;
  try {
    res = await fetch(`${RESEND_API_URL}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: msg.from,
        to: [msg.to],
        // Alleen het gevalideerde adres; de naam laten we weg zodat speciale tekens het adres niet kunnen verstoren.
        ...(msg.replyTo ? { reply_to: typeof msg.replyTo === 'string' ? msg.replyTo : msg.replyTo.address } : {}),
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
      }),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw Object.assign(new Error('Resend onbereikbaar'), { code: err.name === 'AbortError' ? 'ETIMEDOUT' : 'ECONNECTION' });
  } finally {
    clearTimeout(timer);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id) {
    throw Object.assign(new Error('Resend weigerde het bericht'), { code: `RESEND_${res.status}`, status: res.status, resendName: body.name });
  }
  return { id: body.id };
}

/** Verstuurt een bericht via de ingestelde provider. */
async function deliver(msg) {
  if (mailProvider === 'resend') return sendViaResend(msg);
  const info = await transporter.sendMail({ ...msg, replyTo: msg.replyTo || undefined });
  if (!info.accepted || info.accepted.length === 0) throw Object.assign(new Error('Niet geaccepteerd'), { code: 'EENVELOPE' });
  return { id: info.messageId };
}

/** Controleert de e-mailinstelling en kan een testbericht sturen (gebruikt door scripts/check-mail.mjs). */
export async function checkMail({ sendTest = false } = {}) {
  if (!mailConfigured) return { ok: false, step: 'config', detail: `ontbrekende variabelen: ${missingMailSettings.join(', ')}` };
  if (mailProvider === 'smtp') {
    try {
      await transporter.verify();
    } catch (err) {
      return { ok: false, step: 'login', detail: describeMailError(err) };
    }
  }
  if (!sendTest) return { ok: true, step: mailProvider === 'smtp' ? 'login' : 'config', detail: mailProvider === 'resend' ? 'API-sleutel aanwezig; gebruik --send om echt te testen' : '' };
  try {
    const r = await deliver({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject: 'Testbericht contactformulier yukifyadministratie.nl',
      text: 'Dit is een testbericht van scripts/check-mail.mjs. Ontvang je dit, dan werkt de e-mailinstelling van het contactformulier.',
    });
    return { ok: true, step: 'send', detail: `geaccepteerd voor ${MAIL_TO} (id ${r.id})` };
  } catch (err) {
    return { ok: false, step: 'send', detail: describeMailError(err) };
  }
}

export const mailSummary = { provider: mailProvider, to: MAIL_TO, from: MAIL_FROM, port: SMTP_PORT, secure: SMTP_SECURE };

// Veilige samenvatting van een verzendfout (geen wachtwoorden, geen berichtinhoud).
function describeMailError(err) {
  const code = (err && (err.code || err.name)) || 'ONBEKEND';
  const hint =
    code === 'EAUTH' ? 'authenticatie geweigerd: controleer SMTP_USER en het app-wachtwoord in SMTP_PASS'
    : code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' || code === 'EDNS' ? 'geen verbinding met de mailserver of Resend'
    : code === 'EENVELOPE' ? 'afzender of ontvanger geweigerd: controleer MAIL_FROM en MAIL_TO'
    : code === 'RESEND_401' || code === 'RESEND_403' ? 'API-sleutel ongeldig of zonder verzendrecht, of MAIL_FROM staat niet op een geverifieerd domein in Resend'
    : code === 'RESEND_422' ? 'ongeldige gegevens: controleer MAIL_FROM (adres op het geverifieerde domein) en MAIL_TO'
    : code === 'RESEND_429' ? 'verzendlimiet van Resend bereikt'
    : 'onbekende fout';
  const extra = err && err.responseCode ? ' ' + err.responseCode : err && err.resendName ? ' ' + err.resendName : '';
  return `${code}${extra} (${hint})`;
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

  if (!mailConfigured) {
    console.error(`[yukify] Contactformulier ontvangen maar e-mail is niet geconfigureerd (ontbreekt: ${missingMailSettings.join(', ')}); bericht NIET verzonden.`);
    return fail(503, 'Het contactformulier is op dit moment niet beschikbaar.');
  }
  try {
    await deliver(buildMail(data));
  } catch (err) {
    console.error(`[yukify] Verzenden mislukt: ${describeMailError(err)}`);
    return fail(502, 'Het verzenden is mislukt door een technische storing.');
  }
  return wantsJson ? sendJson(res, 200, { ok: true }) : send(res, 303, '', { Location: '/contact/bedankt/' });
}
