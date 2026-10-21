import { routes, button, icon, breadcrumbs, sectionHead, checkList, feature, processSteps, ctaBand, pricingSection } from '../lib/components.mjs';
import { mkbVisual } from '../lib/visuals.mjs';

const path = '/mkb/';
const crumb = [{ name: 'Voor mkb-bedrijven', path }];

const benefits = [
  { iconName: 'layers', title: 'Structuur', text: 'Documenten geordend en verwerkt, zodat je administratie overzichtelijk blijft.' },
  { iconName: 'search', title: 'Duidelijkheid', text: 'Je weet wat er is verwerkt en welke stukken nog ontbreken.' },
  { iconName: 'clipboardCheck', title: 'Afgesproken werkzaamheden', text: 'Vooraf helder welke taken Yukify oppakt en binnen welke planning.' },
  { iconName: 'globe', title: 'Ondersteuning op afstand', text: 'Je levert stukken digitaal aan; wij verwerken ze en houden je op de hoogte.' },
];

const steps = [
  { title: 'Kennismaken', text: 'We bespreken je administratie, je huidige werkwijze en waar je hulp bij zoekt.' },
  { title: 'Afspraken maken', text: 'We leggen vast welke werkzaamheden we uitvoeren, hoe vaak en tegen welk tarief.' },
  { title: 'Aanleveren en verwerken', text: 'Je levert documenten veilig aan en wij verwerken ze volgens de afspraken.' },
  { title: 'Terugkoppelen', text: 'Je krijgt bericht over de voortgang, vragen en eventueel ontbrekende stukken.' },
];

export default {
  path,
  title: 'Administratieve ondersteuning voor het mkb | Yukify',
  description:
    'Je administratie bijgewerkt en overzichtelijk. Yukify ondersteunt mkb-bedrijven op afstand bij het verwerken en organiseren van de financiële administratie.',
  breadcrumbs: crumb,
  render: () => `
<section class="page-hero page-hero--split" aria-labelledby="pagina-titel">
  <div class="container hero-grid">
    <div>
      ${breadcrumbs(crumb)}
      <p class="eyebrow">Voor mkb-bedrijven</p>
      <h1 id="pagina-titel">Je administratie bijgewerkt. Meer tijd om te ondernemen.</h1>
      <p class="lead">Facturen, bonnetjes en bankmutaties die blijven liggen? Yukify helpt mkb-ondernemers op afstand bij het verwerken en organiseren van hun financiële administratie, zodat jij je kunt richten op je bedrijf.</p>
      <div class="btn-row">
        ${button('Bespreek je administratie', `${routes.contact}?organisatie=mkb`, { variant: 'primary', arrow: true })}
        ${button('Bekijk de diensten', routes.diensten, { variant: 'outline' })}
      </div>
    </div>
    <div class="hero-visual">${mkbVisual()}</div>
  </div>
</section>

<section class="section" aria-labelledby="voordelen-titel">
  <div class="container">
    ${sectionHead({ eyebrow: 'Wat je kunt verwachten', title: 'Een administratie waar je op kunt bouwen', id: 'voordelen-titel' })}
    <div class="grid grid-4">${benefits.map(feature).join('')}</div>
  </div>
</section>

<section class="section section--white" aria-labelledby="werk-titel">
  <div class="container split">
    <div>
      <p class="eyebrow">Werkzaamheden</p>
      <h2 id="werk-titel">Waar Yukify je mee kan helpen</h2>
      <p class="text-muted">De exacte invulling stemmen we af op jouw onderneming. Denk bijvoorbeeld aan:</p>
      ${checkList([
        'Verwerken van inkoop- en verkoopfacturen',
        'Verwerken van bankmutaties',
        'Ordenen en categoriseren van administratieve documenten',
        'Bijwerken van een achterstallige administratie',
        'Signaleren van ontbrekende documenten',
        'Administratieve voorbereiding van gegevens voor je boekhouder of accountant',
      ])}
      <a class="link-arrow" href="${routes.diensten}">Bekijk alle diensten${icon('arrowRight')}</a>
    </div>
    <div class="card">
      <h3>Verwerking, geen advies</h3>
      <p>Yukify richt zich op de administratieve verwerking en organisatie van je financiële administratie. We geven geen fiscaal, juridisch of financieel advies en dienen geen aangiften namens je in.</p>
      <p>Voor advies, het opstellen van jaarrekeningen en het indienen van aangiften blijf je werken met je eigen boekhouder, administratiekantoor of accountant. Yukify kan daarbij de verwerking van de onderliggende administratie ondersteunen.</p>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="proces-titel">
  <div class="container">
    ${sectionHead({ eyebrow: 'Werkwijze', title: 'Zo gaat het in zijn werk', id: 'proces-titel' })}
    ${processSteps(steps)}
  </div>
</section>

${pricingSection()}

${ctaBand({
  title: 'Weer overzicht in je administratie?',
  text: 'Vertel ons hoe je administratie er nu voor staat. We bespreken vrijblijvend wat Yukify voor je kan doen.',
  label: 'Bespreek je administratie',
  href: `${routes.contact}?organisatie=mkb`,
})}
`,
};
