import site from '../../site.config.mjs';
import { icon } from './icons.mjs';

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const phoneEnabled = site.phone.confirmed;
export const whatsappEnabled = site.phone.confirmed && site.whatsapp.enabled;
export const whatsappUrl = `https://wa.me/${site.phone.e164.replace(/\D/g, '')}?text=${encodeURIComponent(site.whatsapp.message)}`;
export const telUrl = `tel:${site.phone.e164}`;

export const routes = {
  home: '/',
  diensten: '/diensten/',
  kantoren: '/administratiekantoren/',
  mkb: '/mkb/',
  over: '/over-yukify/',
  faq: '/veelgestelde-vragen/',
  contact: '/contact/',
  privacy: '/privacyverklaring/',
  voorwaarden: '/algemene-voorwaarden/',
};

const nav = [
  { href: routes.diensten, label: 'Diensten' },
  { href: routes.kantoren, label: 'Voor kantoren' },
  { href: routes.mkb, label: 'Voor mkb' },
  { href: routes.over, label: 'Over Yukify' },
  { href: routes.faq, label: 'Veelgestelde vragen' },
  { href: routes.contact, label: 'Contact' },
];

/* ---------- Logo (vectorversie van het aangeleverde Yukify-logo) ---------- */
// variant 'light' = voor lichte achtergronden, 'dark' = voor donkergroene achtergronden.
export function logoMark({ variant = 'light', title = false } = {}) {
  const arm = variant === 'dark' ? '#F7F3E8' : '#183F35';
  const bar = variant === 'dark' ? '#F7F3E8' : '#183F35';
  const gid = `ygold-${variant}`;
  return `<svg class="logo-mark" viewBox="0 0 120 100" ${title ? 'role="img" aria-label="Yukify"' : 'aria-hidden="true" focusable="false"'}>
    <defs><linearGradient id="${gid}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#B07F3E"/><stop offset=".6" stop-color="#C69A5B"/><stop offset="1" stop-color="#D9B27A"/></linearGradient></defs>
    <path d="M4 16h27l26 41-8 17z" fill="${arm}"/>
    <path d="M28 98h18C62 60 84 28 116 4 72 12 46 50 28 98z" fill="url(#${gid})"/>
    <path d="M54 44C66 24 84 10 108 3 88 6 68 16 56 32z" fill="url(#${gid})" opacity=".9"/>
    <path d="M5 84l9-3v17H5z" fill="#C69A5B"/>
    <path d="M17 79l9-3v22h-9z" fill="${bar}"/>
    <path d="M29 73l7-2.5-6.5 27.5H29z" fill="${bar}"/>
  </svg>`;
}

const leaf = '<svg class="logo-leaf" viewBox="0 0 20 28" aria-hidden="true" focusable="false"><path d="M4 27C1 18 6 6 18 1c2 10-3 21-14 26z" fill="#C69A5B"/></svg>';

export function brand({ href = '/', variant = 'light' } = {}) {
  return `<a class="brand brand--${variant}" href="${href}">
    ${logoMark({ variant })}
    <span class="brand-text"><span class="brand-name">Yuk<span class="logo-i" aria-hidden="true">ı${leaf}</span><span class="visually-hidden">i</span>fy</span><span class="brand-desc">Administratie &amp; Support</span></span>
  </a>`;
}

/* ---------- Knoppen ---------- */
export function button(label, href, { variant = 'primary', size = '', arrow = false, iconName = '', attrs = '' } = {}) {
  const cls = ['btn', `btn--${variant}`, size ? `btn--${size}` : ''].filter(Boolean).join(' ');
  return `<a class="${cls}" href="${href}" ${attrs}>${iconName ? icon(iconName) : ''}<span>${label}</span>${arrow ? icon('arrowRight') : ''}</a>`;
}

export function whatsappButton({ variant = 'whatsapp', label = 'Stuur een WhatsApp-bericht' } = {}) {
  if (!whatsappEnabled) return '';
  return button(label, whatsappUrl, { variant, iconName: 'whatsapp', attrs: 'target="_blank" rel="noopener"' });
}

/* ---------- Header & footer ---------- */
function header(currentPath) {
  const links = nav
    .map((n) => `<li><a href="${n.href}"${currentPath === n.href ? ' aria-current="page"' : ''}>${n.label}</a></li>`)
    .join('');
  return `<header class="site-header" id="top">
  <div class="container header-inner">
    ${brand()}
    <nav class="main-nav" id="main-nav" aria-label="Hoofdmenu">
      <ul>${links}</ul>
      <div class="mobile-nav-contact">
        ${button('Plan een kennismaking', routes.contact, { variant: 'primary', arrow: true })}
        ${button(site.email, `mailto:${site.email}`, { variant: 'outline', iconName: 'mail' })}
        ${whatsappButton({ label: 'WhatsApp' })}
      </div>
    </nav>
    <a class="btn btn--primary btn--sm header-cta" href="${routes.contact}"><span class="cta-long">Plan een kennismaking</span><span class="cta-short">Contact</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav">
      <span class="visually-hidden">Menu</span>${icon('menu', { cls: 'icon-open' })}${icon('close', { cls: 'icon-close' })}
    </button>
  </div>
</header>`;
}

function footer() {
  const year = new Date().getFullYear();
  return `<div class="footer-wave" aria-hidden="true"><svg viewBox="0 0 1440 80" preserveAspectRatio="none" focusable="false"><path d="M0 56C320 6 860 104 1440 22V80H0z" fill="#102C25"/><path d="M0 56C320 6 860 104 1440 22" fill="none" stroke="#C69A5B" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg></div>
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        ${brand({ variant: 'dark' })}
        <p class="footer-slogan">${esc(site.slogan)}</p>
        <p>Remote administratieve ondersteuning voor Nederlandse administratie- en accountantskantoren en mkb-ondernemingen.</p>
      </div>
      <nav aria-labelledby="footer-nav-diensten">
        <h2 id="footer-nav-diensten">Diensten</h2>
        <ul>
          <li><a href="${routes.diensten}#financiele-administratie">Financiële administratie</a></li>
          <li><a href="${routes.diensten}#btw-processen">Ondersteuning btw-processen</a></li>
          <li><a href="${routes.diensten}#achterstanden">Administratieve achterstanden</a></li>
          <li><a href="${routes.diensten}#remote-ondersteuning">Remote ondersteuning</a></li>
          ${site.offersProcessImprovement ? `<li><a href="${routes.diensten}#procesverbetering">Procesverbetering</a></li>` : ''}
        </ul>
      </nav>
      <nav aria-labelledby="footer-nav-yukify">
        <h2 id="footer-nav-yukify">Yukify</h2>
        <ul>
          <li><a href="${routes.kantoren}">Voor administratie- en accountantskantoren</a></li>
          <li><a href="${routes.mkb}">Voor mkb-bedrijven</a></li>
          <li><a href="${routes.over}">Over Yukify</a></li>
          <li><a href="${routes.faq}">Veelgestelde vragen</a></li>
          <li><a href="${routes.contact}">Contact</a></li>
        </ul>
      </nav>
      <div>
        <h2>Contact</h2>
        <ul class="footer-contact">
          <li>${icon('mail')}<a href="mailto:${site.email}">${site.email}</a></li>
          ${phoneEnabled ? `<li>${icon('phone')}<a href="${telUrl}">${site.phone.display}</a></li>` : ''}
          ${whatsappEnabled ? `<li>${icon('whatsapp')}<a href="${whatsappUrl}" target="_blank" rel="noopener">WhatsApp</a></li>` : ''}
          <li>${icon('mapPin')}<span>${site.location.city}, ${site.location.country}<br>Ondersteuning op afstand</span></li>
          <li>${icon('globe')}<a href="${site.url}">www.yukify.nl</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="mb-0">© ${year} ${esc(site.fullName)}</p>
      <ul>
        <li><a href="${routes.privacy}">Privacyverklaring</a></li>
        <li><a href="${routes.voorwaarden}">Algemene voorwaarden</a></li>
      </ul>
    </div>
  </div>
</footer>`;
}

/* ---------- Gestructureerde gegevens ---------- */
export function organizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${site.url}/#organisatie`,
    name: site.fullName,
    alternateName: site.name,
    slogan: site.slogan,
    url: `${site.url}/`,
    logo: `${site.url}/assets/img/yukify-logo.png`,
    image: `${site.url}/assets/img/og-yukify.png`,
    email: site.email,
    description:
      'Remote administratieve ondersteuning voor Nederlandse administratie- en accountantskantoren en mkb-ondernemingen: verwerking van financiële administraties, ondersteuning bij btw-processen en het wegwerken van achterstanden.',
    address: { '@type': 'PostalAddress', addressLocality: site.location.city, addressCountry: site.location.countryCode },
    areaServed: { '@type': 'Country', name: 'Nederland' },
    knowsLanguage: 'nl',
  };
  if (site.phone.confirmed) data.telephone = site.phone.e164;
  return data;
}

/* ---------- Pagina-layout ---------- */
export function layout(page, body) {
  const canonical = `${site.url}${page.path}`;
  const title = page.title;
  const ogImage = `${site.url}/assets/img/og-yukify.png`;
  const crumbs = page.breadcrumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [{ name: 'Home', path: '/' }, ...page.breadcrumbs].map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: `${site.url}${c.path}`,
        })),
      }
    : null;
  const jsonLd = [page.path === '/' ? organizationJsonLd() : null, crumbs, ...(page.jsonLd || [])].filter(Boolean);

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
${page.noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow">'}
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#183F35">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:locale" content="nl_NL">
<meta property="og:site_name" content="${esc(site.fullName)}">
<meta property="og:title" content="${esc(page.ogTitle || title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Yukify — Meer capaciteit. Minder administratieve druk.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/styles.css?v=${page.assetVersion}">
${jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n')}
<script>document.documentElement.classList.add('js')</script>
<script src="/assets/js/main.js?v=${page.assetVersion}" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Direct naar de inhoud</a>
${header(page.path)}
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
</body>
</html>
`;
}

/* ---------- Herbruikbare secties ---------- */
export function breadcrumbs(items) {
  const all = [{ name: 'Home', path: '/' }, ...items];
  return `<nav class="breadcrumbs" aria-label="Kruimelpad"><ol>${all
    .map((c, i) =>
      i === all.length - 1 ? `<li><span aria-current="page">${esc(c.name)}</span></li>` : `<li><a href="${c.path}">${esc(c.name)}</a></li>`,
    )
    .join('')}</ol></nav>`;
}

export function sectionHead({ eyebrow, title, intro, center = false, id }) {
  return `<div class="section-head${center ? ' section-head--center' : ''}">
    ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
    <h2${id ? ` id="${id}"` : ''}>${title}</h2>
    ${intro ? `<p>${intro}</p>` : ''}
  </div>`;
}

export function checkList(items, { variant = '', compact = false } = {}) {
  const cls = ['check-list', variant ? `check-list--${variant}` : '', compact ? 'check-list--compact' : ''].filter(Boolean).join(' ');
  return `<ul class="${cls}">${items.map((i) => `<li>${icon('checkCircle')}<span>${i}</span></li>`).join('')}</ul>`;
}

export function serviceCard({ iconName, title, text, href, linkLabel = 'Meer over deze dienst' }) {
  return `<article class="card service-card reveal">
    <div class="icon-badge">${icon(iconName)}</div>
    <h3>${title}</h3>
    <p>${text}</p>
    <a class="link-arrow" href="${href}">${linkLabel}<span class="visually-hidden">: ${title}</span>${icon('arrowRight')}</a>
  </article>`;
}

export function feature({ iconName, title, text }) {
  return `<div class="feature reveal"><div class="icon-badge">${icon(iconName)}</div><div><h3>${title}</h3><p>${text}</p></div></div>`;
}

export function processSteps(steps, { headingLevel = 3 } = {}) {
  const h = `h${headingLevel}`;
  return `<ol class="steps">${steps
    .map((s, i) => `<li class="step reveal"><span class="step-num" aria-hidden="true">${i + 1}</span><div><${h}>${s.title}</${h}><p>${s.text}</p></div></li>`)
    .join('')}</ol>`;
}

export function ctaBand({ title, text, label = 'Plan een kennismaking', href = routes.contact, secondary = true }) {
  return `<section class="section section--tight" aria-label="Contact opnemen">
  <div class="container">
    <div class="cta-band reveal">
      <div>
        <h2>${title}</h2>
        <p>${text}</p>
      </div>
      <div class="btn-row">
        ${button(label, href, { variant: 'gold', arrow: true })}
        ${secondary ? (whatsappEnabled ? whatsappButton({ variant: 'outline-light', label: 'WhatsApp' }) : button('Mail ons', `mailto:${site.email}`, { variant: 'outline-light', iconName: 'mail' })) : ''}
      </div>
    </div>
  </div>
</section>`;
}

export function pricingSection() {
  const confirmed = site.pricing.confirmed;
  return `<section class="section" aria-labelledby="tarieven-titel">
  <div class="container">
    <div class="pricing-box reveal">
      <div>
        <p class="eyebrow">Tarieven</p>
        <h2 id="tarieven-titel">${confirmed ? `Administratieve ondersteuning vanaf € ${site.pricing.hourlyFrom} per uur` : 'Transparante tarieven, afgestemd op jouw werkzaamheden en benodigde capaciteit.'}</h2>
        <p class="text-muted mb-0">${
          confirmed
            ? 'Het definitieve tarief hangt af van de aard, complexiteit en omvang van de werkzaamheden en van de afspraken die we samen maken. Je ontvangt vooraf een duidelijk voorstel.'
            : 'Na een kennismaking ontvang je een helder voorstel op basis van de aard, complexiteit en omvang van de werkzaamheden. Zo weet je vooraf waar je aan toe bent.'
        }</p>
      </div>
      <div>
        ${confirmed ? `<p class="price-tag"><span class="unit">vanaf</span> <span class="amount">€ ${site.pricing.hourlyFrom}</span> <span class="unit">per uur</span></p>` : ''}
        ${checkList(['Afspraken over uren en werkzaamheden vooraf vastgelegd', 'Geen verrassingen achteraf'], { compact: true })}
        ${button('Vraag een voorstel aan', `${routes.contact}?onderwerp=offerte`, { variant: 'primary', arrow: true })}
      </div>
    </div>
  </div>
</section>`;
}

/* ---------- Contactformulier ---------- */
export const serviceOptions = [
  { value: 'financiele-administratie', label: 'Financiële administratie' },
  { value: 'btw', label: 'Ondersteuning bij btw-processen' },
  { value: 'achterstanden', label: 'Administratieve achterstanden' },
  { value: 'remote-ondersteuning', label: 'Remote ondersteuning voor mijn kantoor' },
  ...(site.offersProcessImprovement ? [{ value: 'procesverbetering', label: 'Procesverbetering en automatisering' }] : []),
  { value: 'anders', label: 'Weet ik nog niet / combinatie' },
];
export const orgOptions = [
  { value: 'administratiekantoor', label: 'Administratiekantoor' },
  { value: 'accountantskantoor', label: 'Accountantskantoor' },
  { value: 'mkb', label: 'Mkb-onderneming' },
  { value: 'anders', label: 'Anders' },
];
export const hoursOptions = [
  { value: 'onbekend', label: 'Nog niet bekend' },
  { value: 'tot-20', label: 'Tot 20 uur per maand' },
  { value: '20-40', label: '20 – 40 uur per maand' },
  { value: '40-80', label: '40 – 80 uur per maand' },
  { value: '80-plus', label: 'Meer dan 80 uur per maand' },
  { value: 'eenmalig', label: 'Eenmalig project (bijv. achterstand)' },
];

const options = (list, placeholder) =>
  `${placeholder ? `<option value="">${placeholder}</option>` : ''}${list.map((o) => `<option value="${o.value}">${o.label}</option>`).join('')}`;

function field({ id, name, label, type = 'text', required = false, autocomplete = '', hint = '', full = false, control }) {
  const describedby = [hint ? `${id}-hint` : '', `${id}-error`].filter(Boolean).join(' ');
  const req = required ? ' required aria-required="true"' : '';
  const ctrl =
    control ||
    `<input id="${id}" name="${name}" type="${type}"${autocomplete ? ` autocomplete="${autocomplete}"` : ''}${req} aria-describedby="${describedby}"${type === 'email' ? ' inputmode="email"' : ''}${type === 'tel' ? ' inputmode="tel"' : ''} maxlength="${name === 'bericht' ? 4000 : 200}">`;
  return `<div class="field${full ? ' full' : ''}">
    <label for="${id}">${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="optional">(optioneel)</span>'}</label>
    ${ctrl}
    ${hint ? `<span class="field-hint" id="${id}-hint">${hint}</span>` : ''}
    <span class="field-error" id="${id}-error" aria-live="polite"></span>
  </div>`;
}

export function contactForm({ id = 'contact', variant = 'full', heading = 'Stuur ons een bericht', headingLevel = 2, intro = '', submitLabel = 'Verstuur aanvraag', presetOrg = '' } = {}) {
  const f = (name) => `${id}-${name}`;
  const h = `h${headingLevel}`;
  const fields = [
    field({ id: f('naam'), name: 'naam', label: 'Naam', required: true, autocomplete: 'name' }),
    field({ id: f('bedrijf'), name: 'bedrijf', label: variant === 'compact' ? 'Naam kantoor' : 'Bedrijfsnaam', required: true, autocomplete: 'organization' }),
    field({ id: f('email'), name: 'email', label: 'E-mailadres', type: 'email', required: true, autocomplete: 'email' }),
    field({ id: f('telefoon'), name: 'telefoon', label: 'Telefoonnummer', type: 'tel', autocomplete: 'tel' }),
  ];
  if (variant === 'full') {
    fields.push(
      field({
        id: f('organisatie'),
        name: 'organisatie',
        label: 'Type organisatie',
        required: true,
        control: `<select id="${f('organisatie')}" name="organisatie" required aria-required="true" aria-describedby="${f('organisatie')}-error">${options(orgOptions, 'Maak een keuze')}</select>`,
      }),
      field({
        id: f('ondersteuning'),
        name: 'ondersteuning',
        label: 'Gewenste ondersteuning',
        required: true,
        control: `<select id="${f('ondersteuning')}" name="ondersteuning" required aria-required="true" aria-describedby="${f('ondersteuning')}-error">${options(serviceOptions, 'Maak een keuze')}</select>`,
      }),
      field({
        id: f('uren'),
        name: 'uren',
        label: 'Geschatte benodigde uren',
        full: true,
        control: `<select id="${f('uren')}" name="uren" aria-describedby="${f('uren')}-error">${options(hoursOptions, 'Maak een keuze')}</select>`,
      }),
    );
  }
  fields.push(
    field({
      id: f('bericht'),
      name: 'bericht',
      label: variant === 'compact' ? 'Waar zoek je ondersteuning bij?' : 'Bericht',
      required: true,
      full: true,
      hint: 'Bijvoorbeeld: het soort werkzaamheden, de gebruikte software en de gewenste startdatum. Stuur hier nog geen financiële documenten of klantgegevens mee.',
      control: `<textarea id="${f('bericht')}" name="bericht" required aria-required="true" aria-describedby="${f('bericht')}-hint ${f('bericht')}-error" maxlength="4000" rows="5"></textarea>`,
    }),
  );

  return `<div class="form-card" id="${id}-formulier">
  <${h} id="${id}-titel">${heading}</${h}>
  ${intro ? `<p class="form-intro">${intro}</p>` : ''}
  <form class="contact-form" action="/api/contact" method="post" novalidate aria-labelledby="${id}-titel" data-form>
    <input type="hidden" name="formulier" value="${variant}">
    ${presetOrg ? `<input type="hidden" name="organisatie" value="${presetOrg}">` : ''}
    <input type="hidden" name="pagina" value="">
    <input type="hidden" name="t" value="">
    <div class="hp-field" aria-hidden="true">
      <label for="${f('website')}">Laat dit veld leeg</label>
      <input id="${f('website')}" name="website" type="text" tabindex="-1" autocomplete="off">
    </div>
    <p class="field-hint" style="margin-bottom:var(--s-4)">Velden met <span class="req" aria-hidden="true">*</span><span class="visually-hidden">een sterretje</span> zijn verplicht.</p>
    <div class="form-grid">${fields.join('')}</div>
    <p class="form-consent">We gebruiken je gegevens alleen om op je aanvraag te reageren. Lees hoe we met je gegevens omgaan in onze <a href="${routes.privacy}">privacyverklaring</a>.</p>
    <div class="form-actions">
      <button class="btn btn--primary" type="submit"><span class="spinner" aria-hidden="true"></span><span class="btn-label">${submitLabel}</span>${icon('arrowRight')}</button>
    </div>
    <div class="form-status" role="status" aria-live="polite" tabindex="-1"></div>
  </form>
</div>`;
}

export function contactItems({ includeLocation = true } = {}) {
  const items = [
    `<li><a class="contact-item" href="mailto:${site.email}"><span class="icon-badge">${icon('mail')}</span><div><small>E-mail</small><span>${site.email}</span></div></a></li>`,
  ];
  if (phoneEnabled)
    items.push(`<li><a class="contact-item" href="${telUrl}"><span class="icon-badge">${icon('phone')}</span><div><small>Telefoon</small><span>${site.phone.display}</span></div></a></li>`);
  if (whatsappEnabled)
    items.push(
      `<li><a class="contact-item" href="${whatsappUrl}" target="_blank" rel="noopener"><span class="icon-badge">${icon('whatsapp')}</span><div><small>WhatsApp</small><span>Stuur een bericht</span></div></a></li>`,
    );
  if (includeLocation)
    items.push(
      `<li><div class="contact-item"><span class="icon-badge">${icon('mapPin')}</span><div><small>Vestiging</small><span>${site.location.city}, ${site.location.country}</span></div></div></li>`,
    );
  return `<ul class="contact-list">${items.join('')}</ul>`;
}

export { icon, site };
