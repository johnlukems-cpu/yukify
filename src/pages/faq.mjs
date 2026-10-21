import { routes, breadcrumbs, icon, ctaBand, site } from '../lib/components.mjs';

const path = '/veelgestelde-vragen/';
const crumb = [{ name: 'Veelgestelde vragen', path }];

const tariefAntwoord = site.pricing.confirmed
  ? `<p>Administratieve ondersteuning is beschikbaar vanaf € ${site.pricing.hourlyFrom} per uur. Het definitieve tarief hangt af van de aard, complexiteit en omvang van de werkzaamheden.</p>`
  : '<p>Tarieven stemmen we af op de aard, complexiteit en omvang van de werkzaamheden en op de benodigde capaciteit.</p>';

const groups = [
  {
    title: 'Over de dienstverlening',
    items: [
      {
        q: 'Voor welke organisaties werkt Yukify?',
        a: `<p>Yukify richt zich in de eerste plaats op Nederlandse administratie- en accountantskantoren die extra verwerkingscapaciteit zoeken. Daarnaast ondersteunen we Nederlandse mkb-ondernemingen bij het verwerken en organiseren van hun financiële administratie.</p><p>Lees meer op de pagina's <a href="${routes.kantoren}">voor kantoren</a> en <a href="${routes.mkb}">voor mkb-bedrijven</a>.</p>`,
      },
      {
        q: 'Welke administratieve werkzaamheden kan ik uitbesteden?',
        a: `<p>Denk aan het verwerken van inkoop- en verkoopfacturen en bankmutaties, het ordenen van administratieve documenten, het voorbereiden van aansluitingen en btw-overzichten en het wegwerken van achterstanden. Welke werkzaamheden precies passen, bespreken we in een kennismaking.</p><p>Bekijk het volledige overzicht op de <a href="${routes.diensten}">dienstenpagina</a>.</p>`,
      },
      {
        q: 'Is tijdelijke ondersteuning mogelijk?',
        a: '<p>Ja, dat kan. Bijvoorbeeld om een piek rond btw- of afsluitperioden op te vangen, een achterstand weg te werken of een tijdelijk capaciteitstekort te overbruggen. Of tijdelijke ondersteuning op het gewenste moment beschikbaar is, hangt af van de planning; dat stemmen we vooraf met je af.</p>',
      },
    ],
  },
  {
    title: 'Samenwerking en afspraken',
    items: [
      {
        q: 'Hoe werkt remote samenwerking vanuit Suriname?',
        a: '<p>Yukify werkt vanuit Paramaribo volledig digitaal. Je levert documenten aan via een afgesproken, beveiligde route en we werken, waar mogelijk, in de systemen die jouw kantoor of onderneming al gebruikt. Communicatie verloopt in het Nederlands, per e-mail, telefoon of videogesprek.</p><p>Houd bij de planning rekening met het tijdsverschil met Nederland. Over bereikbaarheid, overlegmomenten en deadlines maken we vooraf concrete afspraken.</p>',
      },
      {
        q: 'Hoe worden uren en tarieven afgesproken?',
        a: `${tariefAntwoord}<p>Vóór de start leggen we vast welke werkzaamheden we uitvoeren, om hoeveel uren het ongeveer gaat en hoe we rapporteren. Zo weet je vooraf waar je aan toe bent.</p>`,
      },
      {
        q: 'Kan Yukify werken met de software die ons kantoor gebruikt?',
        a: '<p>Dat bespreken we graag per situatie. In de kennismaking inventariseren we welke boekhoud- en documentsoftware je gebruikt. Daarna laten we je eerlijk weten of en hoe we daarmee kunnen werken, en wat er nodig is om veilig toegang te krijgen.</p>',
      },
      {
        q: 'Hoe start ik een samenwerking?',
        a: `<p>Neem contact op via het <a href="${routes.contact}">contactformulier</a> of per e-mail. We plannen een kennismaking om je werkvoorraad en wensen te bespreken. Daarna maken we afspraken over werkzaamheden, verantwoordelijkheden, uren en deadlines, regelen we de toegang en gaan we van start. Na een eerste periode evalueren we samen.</p>`,
      },
    ],
  },
  {
    title: 'Gegevens en verantwoordelijkheden',
    items: [
      {
        q: 'Hoe wordt vertrouwelijk omgegaan met financiële gegevens?',
        a: '<p>Vertrouwelijkheid is een uitgangspunt van onze werkwijze. We werken alleen met de toegang die nodig is voor de afgesproken werkzaamheden, gebruiken persoonlijke accounts en spreken met je af hoe documenten veilig worden overgedragen en hoe lang gegevens worden bewaard.</p><p>Omdat Yukify bij het verwerken van administraties persoonsgegevens kan verwerken, leggen we de afspraken daarover vóór de start schriftelijk vast, onder meer in een verwerkersovereenkomst.</p>',
      },
      {
        q: 'Hoe worden ontbrekende documenten en afwijkingen gemeld?',
        a: '<p>Ontbrekende stukken, vragen en opvallende afwijkingen houden we bij en koppelen we terug op de manier en met de frequentie die we samen afspreken, bijvoorbeeld via een vast overzicht per administratie of in een periodiek overleg. Zo houd je zicht op openstaande punten.</p>',
      },
      {
        q: 'Welke verantwoordelijkheden blijven bij mijn kantoor?',
        a: '<p>Yukify voert administratieve verwerkingswerkzaamheden uit. De inhoudelijke beoordeling, fiscaal en juridisch advies, de goedkeuring en indiening van aangiften en de eindverantwoordelijkheid richting jouw klanten blijven in principe bij jouw kantoor. Hoe de taken en controles precies zijn verdeeld, leggen we vóór de start samen vast.</p>',
      },
    ],
  },
];

const allItems = groups.flatMap((g) => g.items);
const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export default {
  path,
  title: 'Veelgestelde vragen over administratie uitbesteden | Yukify',
  description:
    'Veelgestelde vragen over administratie uitbesteden: werkzaamheden, samenwerking vanuit Suriname, tarieven, software, vertrouwelijkheid en verantwoordelijkheden.',
  breadcrumbs: crumb,
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allItems.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: strip(i.a) } })),
    },
  ],
  render: () => `
<section class="page-hero" aria-labelledby="pagina-titel">
  <div class="container container--narrow">
    ${breadcrumbs(crumb)}
    <p class="eyebrow">Veelgestelde vragen</p>
    <h1 id="pagina-titel">Veelgestelde vragen</h1>
    <p class="lead">Antwoorden op de vragen die we het vaakst horen over het uitbesteden van administratieve werkzaamheden. Staat jouw vraag er niet tussen? <a href="${routes.contact}">Neem gerust contact op</a>.</p>
  </div>
</section>

<section class="section">
  <div class="container container--narrow">
    ${groups
      .map(
        (g, gi) => `<div class="faq-group">
      <h2 id="faq-groep-${gi + 1}">${g.title}</h2>
      <div class="faq">
        ${g.items
          .map(
            (i) => `<details>
          <summary>${i.q}<span class="faq-icon" aria-hidden="true">${icon('plus')}</span></summary>
          <div class="faq-answer">${i.a}</div>
        </details>`,
          )
          .join('')}
      </div>
    </div>`,
      )
      .join('')}
  </div>
</section>

${ctaBand({
  title: 'Nog een vraag?',
  text: 'We beantwoorden je vraag graag persoonlijk, of bespreken in een kennismaking wat Yukify voor je kan betekenen.',
  label: 'Neem contact op',
})}
`,
};
