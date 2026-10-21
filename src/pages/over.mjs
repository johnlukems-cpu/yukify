import { routes, button, breadcrumbs, sectionHead, feature, ctaBand, esc, site } from '../lib/components.mjs';

const path = '/over-yukify/';
const crumb = [{ name: 'Over Yukify', path }];

const values = [
  { iconName: 'layers', title: 'Structuur', text: 'Een vaste, overzichtelijke werkwijze, zodat je weet wat er gebeurt en wanneer.' },
  { iconName: 'target', title: 'Nauwkeurigheid', text: 'Zorgvuldig verwerken en afwijkingen of ontbrekende stukken tijdig signaleren.' },
  { iconName: 'messageCheck', title: 'Samenwerking', text: 'Korte lijnen, duidelijke afspraken en open communicatie over voortgang en vragen.' },
  { iconName: 'lock', title: 'Vertrouwelijkheid', text: 'Financiële gegevens behandelen we met de zorg die ze verdienen.' },
];

function founderSection() {
  const f = site.founder;
  if (!f) return '';
  return `<section class="section section--white" aria-labelledby="oprichter-titel">
  <div class="container founder">
    ${f.photo ? `<img src="${f.photo}" alt="${esc(`Portretfoto van ${f.name}, ${f.role} van Yukify`)}" width="560" height="700" loading="lazy">` : '<div></div>'}
    <div>
      <p class="eyebrow">Maak kennis</p>
      <h2 id="oprichter-titel">${esc(f.name)}</h2>
      <p class="text-muted"><strong>${esc(f.role)}</strong></p>
      ${f.intro.map((p) => `<p>${esc(p)}</p>`).join('')}
    </div>
  </div>
</section>`;
}

export default {
  path,
  title: 'Over Yukify — remote administratieve ondersteuning | Yukify',
  description:
    'Yukify ondersteunt Nederlandse organisaties vanuit Paramaribo bij financiële administratieve verwerking. Meer dan 10 jaar ervaring in financiële administratie.',
  breadcrumbs: crumb,
  render: () => `
<section class="page-hero" aria-labelledby="pagina-titel">
  <div class="container">
    ${breadcrumbs(crumb)}
    <p class="eyebrow">Over Yukify</p>
    <h1 id="pagina-titel">Een betrouwbare partner voor je administratieve verwerking</h1>
    <p class="lead">Yukify ondersteunt Nederlandse organisaties bij financiële administratieve verwerking en remote ondersteuning. Met als doel: minder administratieve druk en meer ruimte voor wat er echt toe doet.</p>
  </div>
</section>

<section class="section" aria-labelledby="verhaal-titel">
  <div class="container split">
    <div>
      <p class="eyebrow">Wie we zijn</p>
      <h2 id="verhaal-titel">Ervaring in financiële administratie, gericht op Nederland</h2>
      <p>Yukify — Administratie &amp; Support is gevestigd in Paramaribo, Suriname, en richt zich op Nederlandse administratie- en accountantskantoren en mkb-ondernemingen. We nemen afgesproken administratieve werkzaamheden op afstand over, zodat onze klanten hun capaciteit kunnen vergroten zonder in te leveren op kwaliteit en planning.</p>
      <p>Achter Yukify staat meer dan 10 jaar ervaring in financiële administratie, waarvan meer dan 3 jaar met Nederlandse btw-processen en administratieve werkwijzen. Die ervaring zetten we in voor een zorgvuldige, gestructureerde verwerking en een prettige samenwerking.</p>
      <p>Omdat we in het Nederlands communiceren en vertrouwd zijn met Nederlandse administratieve werkwijzen, verloopt het contact direct en helder.</p>
    </div>
    <div class="stat-cards">
      <div class="stat-card"><p class="num">10+</p><p>jaar ervaring in financiële administratie</p></div>
      <div class="stat-card"><p class="num">3+</p><p>jaar ervaring met Nederlandse btw-processen en administratieve werkwijzen</p></div>
      <div class="stat-card stat-card--wide"><p class="mb-0"><strong>Ons doel:</strong> klanten helpen administratieve druk te verminderen, zodat zij meer ruimte krijgen voor hun klanten en hun groei.</p></div>
    </div>
  </div>
</section>

${founderSection()}

<section class="section section--white" aria-labelledby="waarden-titel">
  <div class="container">
    ${sectionHead({ eyebrow: 'Waar we voor staan', title: 'Structuur, nauwkeurigheid en samenwerking', id: 'waarden-titel' })}
    <div class="grid grid-4">${values.map(feature).join('')}</div>
  </div>
</section>

<section class="section section--tight" aria-labelledby="verder-titel">
  <div class="container">
    <h2 id="verder-titel" class="visually-hidden">Verder lezen</h2>
    <div class="grid grid-2">
      <div class="card"><h3>Voor administratie- en accountantskantoren</h3><p>Extra verwerkingscapaciteit bij piekbelasting en terugkerende werkzaamheden.</p>${button('Meer voor kantoren', routes.kantoren, { variant: 'outline', size: 'sm', arrow: true })}</div>
      <div class="card"><h3>Voor mkb-bedrijven</h3><p>Je financiële administratie verwerkt, geordend en bijgewerkt.</p>${button('Meer voor het mkb', routes.mkb, { variant: 'outline', size: 'sm', arrow: true })}</div>
    </div>
  </div>
</section>

${ctaBand({
  title: 'Benieuwd of Yukify bij je past?',
  text: 'In een vrijblijvende kennismaking bespreken we je situatie en kijken we samen of en hoe we je kunnen ondersteunen.',
})}
`,
};
