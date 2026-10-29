// Nieuws & Inzichten: overzicht, categoriepagina's, paginering en artikelpagina's.
import { routes, button, icon, breadcrumbs, esc, site } from '../lib/components.mjs';
import {
  categories,
  categoryById,
  statusLabel,
  publicationDate,
  formatDateNl,
  readingMinutes,
  renderMarkdown,
  relatedArticles,
  articleImage,
} from '../../lib/news.mjs';

export const PER_PAGE = 9;
export const NEWS_TITLE = 'Nieuws & Inzichten';
const NEWS_INTRO =
  'Blijf op de hoogte van ontwikkelingen in financiële administratie, btw, accountancy en automatisering. Yukify deelt praktische inzichten en actuele informatie waarmee ondernemers en financiële professionals hun administratie beter kunnen organiseren.';

export const articlePath = (slug) => `${routes.nieuws}${slug}/`;
const categoryPath = (id) => `${routes.nieuws}categorie/${id}/`;
const pagePath = (base, n) => (n === 1 ? base : `${base}pagina/${n}/`);

/* ---------- Bouwstenen ---------- */
function meta(a) {
  const cat = categoryById[a.category];
  const date = publicationDate(a);
  return `<p class="news-meta">
    <a class="news-chip" href="${categoryPath(a.category)}">${esc(cat.label)}</a>
    ${date ? `<time datetime="${date}">${formatDateNl(date)}</time>` : ''}
    <span>${readingMinutes(a.body)} min lezen</span>
  </p>`;
}

function card(a, { headingLevel = 3 } = {}) {
  const img = articleImage(a);
  const h = `h${headingLevel}`;
  return `<article class="news-card">
    <a class="news-card-media" href="${articlePath(a.slug)}" tabindex="-1" aria-hidden="true"><img src="${img.src}" alt="" width="1200" height="630" loading="lazy" decoding="async"></a>
    <div class="news-card-body">
      ${meta(a)}
      <${h} class="news-card-title"><a href="${articlePath(a.slug)}">${esc(a.title)}</a></${h}>
      <p class="news-card-intro">${esc(a.intro)}</p>
      <a class="link-arrow" href="${articlePath(a.slug)}">Lees artikel<span class="visually-hidden">: ${esc(a.title)}</span>${icon('arrowRight')}</a>
    </div>
  </article>`;
}

function featured(a) {
  const img = articleImage(a);
  return `<section class="news-featured" aria-labelledby="uitgelicht-titel">
    <a class="news-featured-media" href="${articlePath(a.slug)}" tabindex="-1" aria-hidden="true"><img src="${img.src}" alt="" width="1200" height="630" decoding="async"></a>
    <div class="news-featured-body">
      <p class="eyebrow">Uitgelicht</p>
      ${meta(a)}
      <h2 id="uitgelicht-titel"><a href="${articlePath(a.slug)}">${esc(a.title)}</a></h2>
      <p>${esc(a.intro)}</p>
      ${button('Lees artikel', articlePath(a.slug), { variant: 'primary', arrow: true, attrs: `aria-label="Lees artikel: ${esc(a.title)}"` })}
    </div>
  </section>`;
}

function filters(pub, activeId) {
  const count = (id) => pub.filter((a) => a.category === id).length;
  const chip = (href, label, n, active) =>
    `<li><a class="news-filter${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${esc(label)} <span class="news-filter-count">${n}</span></a></li>`;
  return `<nav class="news-filters" aria-label="Filter op onderwerp">
    <ul>
      ${chip(routes.nieuws, 'Alle onderwerpen', pub.length, !activeId)}
      ${categories.map((c) => chip(categoryPath(c.id), c.label, count(c.id), activeId === c.id)).join('')}
    </ul>
  </nav>`;
}

function searchForm() {
  // Zonder JavaScript blijft het formulier verborgen; de filters werken dan gewoon als links.
  return `<form class="news-search" role="search" hidden data-news-search>
    <label for="nieuws-zoeken">Zoek in artikelen</label>
    <div class="news-search-row">
      <input id="nieuws-zoeken" type="search" name="q" autocomplete="off" placeholder="Bijvoorbeeld: btw, jaarafsluiting, factuur" maxlength="80">
    </div>
  </form>
  <div class="news-search-results" data-news-results hidden>
    <p class="news-search-status" role="status" aria-live="polite"></p>
    <div class="news-grid" data-news-results-list></div>
  </div>`;
}

function pagination(base, current, total) {
  if (total <= 1) return '';
  return `<nav class="news-pagination" aria-label="Paginering">
    ${current > 1 ? `<a class="btn btn--outline btn--sm" href="${pagePath(base, current - 1)}" rel="prev">${icon('arrowRight', { cls: 'flip' })}<span>Vorige</span></a>` : '<span></span>'}
    <span class="news-pagination-label">Pagina ${current} van ${total}</span>
    ${current < total ? `<a class="btn btn--outline btn--sm" href="${pagePath(base, current + 1)}" rel="next"><span>Volgende</span>${icon('arrowRight')}</a>` : '<span></span>'}
  </nav>`;
}

function emptyState(text) {
  return `<div class="news-empty">
    <div class="icon-badge icon-badge--soft">${icon('fileText')}</div>
    <h3>${text}</h3>
    <p>Heeft u nu al een vraag over uw financiële administratie? Neem gerust contact met ons op.</p>
    ${button('Neem contact op', routes.contact, { variant: 'outline', arrow: true })}
  </div>`;
}

/* ---------- Overzicht en categorieën ---------- */
function listingPage({ pub, list, base, n, total, category }) {
  const isHome = !category && n === 1;
  const feature = isHome && list.length ? list.find((a) => a.featured) || list[0] : null;
  const gridItems = feature ? list.filter((a) => a !== feature) : list;
  const crumb = category
    ? [{ name: NEWS_TITLE, path: routes.nieuws }, { name: category.label, path: categoryPath(category.id) }]
    : [{ name: NEWS_TITLE, path: routes.nieuws }];
  const heading = category ? category.label : NEWS_TITLE;
  const titleSuffix = n > 1 ? ` – pagina ${n}` : '';
  const empty = list.length === 0;
  return {
    path: pagePath(base, n),
    title: category ? `${category.label}${titleSuffix} | Nieuws & Inzichten | Yukify` : `Nieuws & Inzichten${titleSuffix} | Yukify`,
    description: category
      ? `Artikelen en praktische inzichten over ${category.label.toLowerCase()} voor administratiekantoren, accountantskantoren en ondernemers. Pagina ${n} van ${total}.`.replace(' Pagina 1 van 1.', '')
      : `Praktische inzichten over financiële administratie, btw, accountancy, boekhoudsoftware en automatisering voor kantoren en ondernemers.${n > 1 ? ` Pagina ${n} van ${total}.` : ''}`,
    breadcrumbs: crumb,
    noindex: Boolean(category) && empty,
    inSitemap: !(Boolean(category) && empty),
    scripts: ['/assets/js/news.js'],
    extraHead: [n > 1 ? `<link rel="prev" href="${site.url}${pagePath(base, n - 1)}">` : '', n < total ? `<link rel="next" href="${site.url}${pagePath(base, n + 1)}">` : '']
      .filter(Boolean)
      .join('\n'),
    render: () => `
<section class="page-hero news-hero" aria-labelledby="pagina-titel">
  <div class="container">
    ${breadcrumbs(crumb)}
    <p class="eyebrow">${category ? NEWS_TITLE : 'Kennisbank'}</p>
    <h1 id="pagina-titel">${esc(heading)}</h1>
    <p class="lead">${category ? `Artikelen over ${esc(category.label.toLowerCase())}. ${esc(NEWS_INTRO.split('. ')[1] || '')}` : esc(NEWS_INTRO)}</p>
    ${searchForm()}
  </div>
</section>

<section class="section news-section" aria-labelledby="overzicht-titel">
  <div class="container">
    ${filters(pub, category?.id)}
    <div data-news-default>
      ${feature ? featured(feature) : ''}
      <h2 id="overzicht-titel" class="news-list-title">${feature ? 'Meer artikelen' : category ? `Alle artikelen over ${esc(category.label.toLowerCase())}` : 'Alle artikelen'}</h2>
      ${
        empty
          ? emptyState(category ? 'Er zijn nog geen artikelen in deze categorie.' : 'Binnenkort verschijnen hier de eerste artikelen.')
          : gridItems.length
            ? `<div class="news-grid">${gridItems.map((a) => card(a)).join('')}</div>`
            : '<p class="text-muted">Meer artikelen volgen binnenkort.</p>'
      }
      ${pagination(base, n, total)}
    </div>
  </div>
</section>
`,
  };
}

/** Alle overzichts-, categorie- en paginapagina's voor de openbare artikelen. */
export function listingPages(pub) {
  const pages = [];
  const paginate = (list, base, category) => {
    const total = Math.max(1, Math.ceil(list.length / PER_PAGE));
    for (let n = 1; n <= total; n++) {
      pages.push(listingPage({ pub, list: list.slice((n - 1) * PER_PAGE, n * PER_PAGE), base, n, total, category }));
    }
  };
  // Op pagina 1 van het overzicht staat het uitgelichte artikel extra; de rest volgt in de lijst.
  paginate(pub, routes.nieuws, null);
  for (const c of categories) paginate(pub.filter((a) => a.category === c.id), categoryPath(c.id), c);
  return pages;
}

/* ---------- Artikel ---------- */
export function articleJsonLd(a) {
  const img = articleImage(a);
  const date = publicationDate(a);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.title,
    description: a.description,
    image: `${site.url}${img.og}`,
    datePublished: date,
    dateModified: a.updated || date,
    inLanguage: 'nl-NL',
    articleSection: categoryById[a.category].label,
    mainEntityOfPage: `${site.url}${articlePath(a.slug)}`,
    author: { '@type': 'Organization', name: site.fullName, url: `${site.url}/` },
    publisher: { '@type': 'Organization', name: site.fullName, logo: { '@type': 'ImageObject', url: `${site.url}/assets/img/yukify-logo.png` } },
  };
}

/** Artikelpagina. Met `preview` wordt een niet-openbare versie voor het beheer gemaakt (noindex, met statusbalk). */
export function articlePage(a, pub, { preview = false } = {}) {
  const cat = categoryById[a.category];
  const img = articleImage(a);
  const date = publicationDate(a);
  const related = relatedArticles(a, pub);
  const crumb = [{ name: NEWS_TITLE, path: routes.nieuws }, { name: a.title, path: articlePath(a.slug) }];
  return {
    path: articlePath(a.slug),
    title: `${a.title} | Yukify`.length <= 65 ? `${a.title} | Yukify` : a.title,
    description: a.description,
    ogType: 'article',
    ogImage: img.og,
    ogImageAlt: img.alt,
    breadcrumbs: crumb,
    noindex: preview,
    jsonLd: preview ? [] : [articleJsonLd(a)],
    extraHead: [
      date ? `<meta property="article:published_time" content="${date}">` : '',
      a.updated ? `<meta property="article:modified_time" content="${a.updated}">` : '',
      `<meta property="article:section" content="${esc(cat.label)}">`,
    ]
      .filter(Boolean)
      .join('\n'),
    render: () => `
${preview ? `<div class="preview-banner" role="note">${icon('info')}<span><strong>Voorbeeld.</strong> Status: ${esc(statusLabel[a.status] || a.status)}. ${a.status === 'gepubliceerd' ? 'Dit is de inhoud zoals die is opgeslagen.' : 'Dit artikel is niet openbaar.'}</span></div>` : ''}
<article class="news-article" aria-labelledby="artikel-titel">
  <header class="page-hero news-article-hero">
    <div class="container container--narrow">
      ${breadcrumbs(crumb)}
      ${meta(a)}
      <h1 id="artikel-titel">${esc(a.title)}</h1>
      <p class="lead">${esc(a.intro)}</p>
    </div>
  </header>
  <div class="container container--narrow news-article-body">
    <figure class="news-figure">
      <img src="${img.src}" alt="${esc(img.alt)}" width="1200" height="630" decoding="async">
    </figure>
    <div class="prose news-prose">
      ${renderMarkdown(a.body)}
    </div>
    <aside class="news-cta" aria-labelledby="artikel-cta-titel">
      <h2 id="artikel-cta-titel" class="visually-hidden">Ondersteuning van Yukify</h2>
      <p>Op zoek naar ondersteuning bij uw financiële administratie? Yukify Administratie &amp; Support denkt graag met u mee.</p>
      <div class="btn-row">
        ${button('Plan een vrijblijvend kennismakingsgesprek', routes.contact, { variant: 'gold', arrow: true })}
        <a class="link-arrow link-arrow--light" href="${cat.service}">Bekijk onze ondersteuning${icon('arrowRight')}</a>
      </div>
    </aside>
    <p class="news-back"><a class="link-arrow" href="${routes.nieuws}">${icon('arrowRight', { cls: 'flip' })}Terug naar Nieuws &amp; Inzichten</a></p>
  </div>
</article>
${
  related.length
    ? `<section class="section section--white" aria-labelledby="gerelateerd-titel">
  <div class="container">
    <h2 id="gerelateerd-titel">Gerelateerde artikelen</h2>
    <div class="news-grid">${related.map((r) => card(r)).join('')}</div>
  </div>
</section>`
    : ''
}
`,
  };
}

/** Zoekindex voor de zoekfunctie (alleen openbare artikelen). */
export function searchIndex(pub, plainText) {
  return pub.map((a) => ({
    url: articlePath(a.slug),
    title: a.title,
    intro: a.intro,
    category: categoryById[a.category].label,
    categoryUrl: categoryPath(a.category),
    date: publicationDate(a),
    dateLabel: formatDateNl(publicationDate(a)),
    minutes: readingMinutes(a.body),
    image: articleImage(a).src,
    text: plainText(a.body).slice(0, 6000),
  }));
}
