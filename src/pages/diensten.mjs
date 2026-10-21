import { routes, button, icon, breadcrumbs, checkList, ctaBand, pricingSection, site } from '../lib/components.mjs';

const services = [
  {
    id: 'financiele-administratie',
    iconName: 'calculator',
    title: 'Financiële administratie',
    intro: 'De dagelijkse en periodieke verwerking van financiële administraties, uitgevoerd volgens de werkwijze en richtlijnen van jouw kantoor of onderneming.',
    tasks: [
      'Verwerken van inkoop- en verkoopfacturen',
      'Verwerken en categoriseren van administratieve documenten',
      'Verwerken van bankmutaties',
      'Voorbereiden van administratieve aansluitingen',
      'Bijwerken van financiële administraties',
      'Signaleren van ontbrekende documenten',
      'Ondersteunen bij periodieke afsluitingen',
    ],
    forWho: 'Administratie- en accountantskantoren die verwerkingswerk willen uitbesteden, en mkb-bedrijven die hun administratie actueel willen houden.',
    how: 'We stemmen vooraf af welke administraties, documentstromen en systemen het betreft. Daarna verwerken we het werk binnen de afgesproken uren en planning, en koppelen we vragen tijdig terug.',
  },
  {
    id: 'btw-processen',
    iconName: 'percent',
    title: 'Ondersteuning bij Nederlandse btw-processen',
    intro: 'Administratieve ondersteuning bij het voorbereiden van btw-aangiften, zodat jouw kantoor de beoordeling en indiening efficiënt kan afronden.',
    tasks: [
      'Administratieve voorbereiding van btw-aangiften',
      'Controleren van de volledigheid van administratieve gegevens',
      'Signaleren van afwijkingen en ontbrekende informatie',
      'Voorbereiden van overzichten voor beoordeling door het verantwoordelijke kantoor',
    ],
    forWho: 'Kantoren die in btw-perioden extra handen nodig hebben bij de voorbereidende werkzaamheden.',
    how: 'Yukify verzorgt het voorbereidende administratieve werk. Je ontvangt overzichten en signaleringen die klaarstaan voor jouw beoordeling.',
    note: 'De inhoudelijke beoordeling, goedkeuring en indiening van aangiften, en de formele verantwoordelijkheid daarvoor, worden vooraf per samenwerking afgesproken en blijven in principe bij het verantwoordelijke kantoor of de ondernemer. Yukify geeft geen fiscaal advies.',
  },
  {
    id: 'achterstanden',
    iconName: 'clock',
    title: 'Administratieve achterstanden',
    intro: 'Een achterstand in de administratie kost tijd en geeft onrust. We helpen om die stap voor stap weg te werken, volgens heldere prioriteiten.',
    tasks: [
      'Inhalen van achterstallige boekingen',
      'Ordenen en verwerken van administratieve documenten',
      'Bijwerken van administraties volgens overeengekomen prioriteiten',
      'Inventariseren van ontbrekende stukken',
      'Terugkoppelen van vragen en openstaande punten',
    ],
    forWho: 'Kantoren met een achterstand in de verwerking van klantadministraties, en ondernemers van wie de administratie niet meer actueel is.',
    how: 'We starten met een inventarisatie van de achterstand. Daarna spreken we prioriteiten en een planning af en houden we je op de hoogte van de voortgang.',
  },
  {
    id: 'remote-ondersteuning',
    iconName: 'users',
    title: 'Remote ondersteuning voor administratiekantoren',
    intro: 'Extra verwerkingscapaciteit voor jouw kantoor, structureel of tijdelijk. Yukify werkt mee binnen jouw bestaande processen en planning.',
    tasks: [
      'Terugkerende administratieve verwerking',
      'Tijdelijke ondersteuning bij piekbelasting',
      'Ondersteuning op basis van overeengekomen uren',
      'Samenwerking volgens de bestaande werkprocessen van het kantoor',
      'Afstemming over deadlines, prioriteiten en werkverdeling',
    ],
    forWho: 'Administratie- en accountantskantoren die hun capaciteit flexibel willen uitbreiden, bijvoorbeeld bij groei of tijdens drukke perioden.',
    how: 'We maken afspraken over het aantal uren, de werkzaamheden, de communicatie en de toegang tot systemen. Daarna werken we als verlengstuk van jouw team.',
    linkKantoren: true,
  },
  ...(site.offersProcessImprovement
    ? [
        {
          id: 'procesverbetering',
          iconName: 'workflow',
          title: 'Procesverbetering en automatisering',
          intro: 'Ondersteuning bij het structureren van terugkerende administratieve werkzaamheden en het verminderen van onnodige handmatige stappen.',
          tasks: [
            'In kaart brengen van terugkerende administratieve stappen',
            'Voorstellen voor een duidelijkere werkverdeling en vaste werkwijze',
            'Signaleren van handmatige stappen die eenvoudiger kunnen',
          ],
          forWho: 'Kantoren en ondernemers die hun administratieve processen efficiënter willen organiseren.',
          how: 'We bekijken samen de huidige werkwijze en bespreken welke verbeteringen haalbaar en wenselijk zijn.',
        },
      ]
    : []),
];

function serviceBlock(s) {
  return `<article class="service-detail reveal" id="${s.id}" aria-labelledby="${s.id}-titel">
    <div>
      <div class="icon-badge">${icon(s.iconName)}</div>
      <h2 id="${s.id}-titel">${s.title}</h2>
      <p class="text-muted">${s.intro}</p>
      <div class="meta">
        <div><h3>Voor wie</h3><p>${s.forWho}</p></div>
        <div><h3>Hoe de samenwerking verloopt</h3><p>${s.how}</p></div>
      </div>
      <div class="btn-row mt-6">
        ${button('Bespreek deze dienst', `${routes.contact}?dienst=${s.id === 'btw-processen' ? 'btw' : s.id}`, { variant: 'primary', arrow: true })}
        ${s.linkKantoren ? `<a class="link-arrow" href="${routes.kantoren}">Meer voor kantoren${icon('arrowRight')}</a>` : ''}
      </div>
    </div>
    <div class="tasks-box">
      <h3>Mogelijke werkzaamheden</h3>
      ${checkList(s.tasks)}
      ${s.note ? `<p class="service-note">${icon('info')}<span>${s.note}</span></p>` : ''}
    </div>
  </article>`;
}

export default {
  path: '/diensten/',
  title: 'Diensten: financiële administratie en btw-ondersteuning | Yukify',
  description:
    'Financiële administratie laten verwerken, hulp bij btw-processen, achterstanden wegwerken of extra capaciteit op afstand. Bekijk de diensten van Yukify.',
  breadcrumbs: [{ name: 'Diensten', path: '/diensten/' }],
  render: () => `
<section class="page-hero" aria-labelledby="pagina-titel">
  <div class="container">
    ${breadcrumbs([{ name: 'Diensten', path: '/diensten/' }])}
    <p class="eyebrow">Diensten</p>
    <h1 id="pagina-titel">Administratieve ondersteuning die je werkvoorraad lichter maakt</h1>
    <p class="lead">Boekhoudkundige verwerking uitbesteden zonder de regie kwijt te raken. Per dienst lees je welke werkzaamheden Yukify kan uitvoeren, voor wie de dienst geschikt is en hoe de samenwerking verloopt.</p>
    <nav aria-label="Diensten op deze pagina">
      <ul class="service-index">${services.map((s) => `<li><a href="#${s.id}">${s.title}</a></li>`).join('')}</ul>
    </nav>
  </div>
</section>

<section class="section" aria-label="Overzicht van diensten">
  <div class="container">
    ${services.map(serviceBlock).join('')}
  </div>
</section>

<section class="section section--white section--tight" aria-labelledby="afbakening-titel">
  <div class="container split split--center">
    <div>
      <p class="eyebrow">Heldere afbakening</p>
      <h2 id="afbakening-titel">Duidelijk wie waarvoor verantwoordelijk is</h2>
      <p class="text-muted">Yukify voert administratieve verwerkingswerkzaamheden uit. Welke taken we oppakken, wie het werk controleert en wie eindverantwoordelijk blijft, leggen we vóór de start samen vast.</p>
    </div>
    <div class="grid">
      <div class="boundary"><h3>Wat Yukify doet</h3><p>Administratieve verwerking, voorbereiding en signalering, binnen de afgesproken werkzaamheden en uren.</p></div>
      <div class="boundary"><h3>Wat bij jouw kantoor of onderneming blijft</h3><p>Inhoudelijke beoordeling, fiscaal en juridisch advies, goedkeuring en formele indiening, tenzij uitdrukkelijk anders afgesproken.</p></div>
    </div>
  </div>
</section>

${pricingSection()}

${ctaBand({
  title: 'Welke werkzaamheden wil jij uitbesteden?',
  text: 'Vertel ons over je werkvoorraad en je wensen. We denken graag mee over een passende invulling.',
  label: 'Plan een kennismaking',
})}
`,
};
