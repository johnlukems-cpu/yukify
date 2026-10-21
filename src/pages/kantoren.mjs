import { routes, button, icon, breadcrumbs, sectionHead, checkList, feature, processSteps, contactForm, contactItems, whatsappButton } from '../lib/components.mjs';

const path = '/administratiekantoren/';
const crumb = [{ name: 'Voor administratie- en accountantskantoren', path }];

const helpAreas = [
  { iconName: 'calendar', title: 'Piekbelasting', text: 'Extra handen rond btw-deadlines, kwartaal- en jaarafsluitingen.' },
  { iconName: 'trendingUp', title: 'Groeiende werkvoorraden', text: 'Meer klanten aannemen zonder dat de verwerking achterloopt.' },
  { iconName: 'refresh', title: 'Terugkerende boekingswerkzaamheden', text: 'Periodieke verwerking structureel uitbesteden volgens jouw werkwijze.' },
  { iconName: 'clock', title: 'Tijdelijke capaciteitsproblemen', text: 'Overbruggen bij verloop, ziekte, verlof of een openstaande vacature.' },
  { iconName: 'users', title: 'Tijd voor klanten', text: 'Je team krijgt ruimte voor advies, klantcontact en andere werkzaamheden.' },
  { iconName: 'lock', title: 'Vertrouwelijk', text: 'Zorgvuldige omgang met klantgegevens en toegang alleen waar nodig.' },
];

const startSteps = [
  { title: 'Inventarisatie', text: 'We brengen samen de werkvoorraad, de gebruikte software en de gewenste ondersteuning in kaart.' },
  { title: 'Taakafbakening', text: 'We leggen vast welke werkzaamheden Yukify uitvoert, wie controleert en wie verantwoordelijk blijft.' },
  { title: 'Veilige toegang', text: 'We regelen persoonlijke toegang tot de benodigde systemen, met alleen de rechten die nodig zijn.' },
  { title: 'Evaluatie', text: 'Na een eerste periode bespreken we de samenwerking, de planning en eventuele verbeterpunten.' },
];

export default {
  path,
  title: 'Extra capaciteit voor administratie- en accountantskantoren | Yukify',
  description:
    'Extra capaciteit voor je administratie- of accountantskantoor. Yukify vangt piekbelasting en terugkerend boekingswerk op afstand op, volgens jouw werkwijze.',
  breadcrumbs: crumb,
  render: () => `
<section class="page-hero page-hero--split" aria-labelledby="pagina-titel">
  <div class="container hero-grid">
    <div>
      ${breadcrumbs(crumb)}
      <p class="eyebrow">Voor administratie- en accountantskantoren</p>
      <h1 id="pagina-titel">Extra verwerkingscapaciteit voor jouw administratie- of accountantskantoor.</h1>
      <p class="lead">Yukify helpt administratie- en accountantskantoren hun verwerkingscapaciteit te vergroten, zodat zij meer ruimte krijgen voor hun klanten en hun groei.</p>
      <div class="btn-row">
        ${button('Bespreek jouw capaciteitsvraagstuk', '#aanvraag-formulier', { variant: 'primary', arrow: true })}
        ${button('Bekijk de diensten', routes.diensten, { variant: 'outline' })}
      </div>
    </div>
    <div class="stat-cards">
      <div class="stat-card"><p class="num">10+</p><p>jaar ervaring in financiële administratie</p></div>
      <div class="stat-card"><p class="num">3+</p><p>jaar ervaring met Nederlandse btw-processen en werkwijzen</p></div>
      <div class="stat-card stat-card--wide"><p class="mb-0"><strong>Remote ondersteuning</strong> volgens de werkprocessen, software en planning van jouw kantoor.</p></div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="hulp-titel">
  <div class="container">
    ${sectionHead({ eyebrow: 'Waar we bij helpen', title: 'Ondersteuning die meebeweegt met je kantoor', intro: 'Of het nu gaat om een tijdelijke piek of om structurele extra capaciteit: we stemmen de ondersteuning af op wat jouw kantoor nodig heeft.', id: 'hulp-titel' })}
    <div class="grid grid-3">${helpAreas.map(feature).join('')}</div>
  </div>
</section>

<section class="section section--white" aria-labelledby="werkwijze-titel">
  <div class="container split">
    <div>
      <p class="eyebrow">Werkwijze</p>
      <h2 id="werkwijze-titel">Gestructureerd samenwerken op afstand</h2>
      <p class="text-muted">Yukify werkt als verlengstuk van je team, vanuit Paramaribo. Dat vraagt om duidelijke afspraken en een vaste werkwijze. Daarom besteden we aandacht aan:</p>
      ${checkList([
        '<strong>Heldere afspraken</strong> over werkzaamheden, uren, deadlines en verantwoordelijkheden',
        '<strong>Vaste terugkoppeling</strong> over voortgang, vragen, afwijkingen en ontbrekende stukken',
        '<strong>Werken in jouw processen</strong> en, na afstemming, in de software die jouw kantoor gebruikt',
        '<strong>Vertrouwelijke omgang met gegevens</strong>, met persoonlijke toegang en alleen de rechten die nodig zijn',
      ])}
    </div>
    <div class="card">
      <div class="icon-badge icon-badge--soft">${icon('shield')}</div>
      <h3>Afspraken over gegevensverwerking</h3>
      <p>Omdat we met financiële gegevens van jouw klanten werken, maken we vóór de start afspraken over de verwerking van persoonsgegevens, onder meer in een verwerkersovereenkomst. Ook spreken we af hoe documenten veilig worden overgedragen en hoe lang gegevens worden bewaard.</p>
      <p>De eindverantwoordelijkheid voor de dienstverlening aan jouw klanten blijft bij jouw kantoor.</p>
    </div>
  </div>
</section>

<section class="section section--green" aria-labelledby="start-titel">
  <div class="container">
    ${sectionHead({ eyebrow: 'Starten', title: 'Zo start je een samenwerking', intro: 'Een zorgvuldige start zorgt voor een soepele samenwerking. In vier stappen ben je op weg.', id: 'start-titel' })}
    ${processSteps(startSteps)}
  </div>
</section>

<section class="section" id="aanvraag" aria-labelledby="aanvraag-cta-titel">
  <div class="container split">
    <div>
      <p class="eyebrow">Contact</p>
      <h2 id="aanvraag-cta-titel">Bespreek jouw capaciteitsvraagstuk</h2>
      <p class="text-muted">Laat in een paar regels weten waar je kantoor tegenaan loopt. We nemen contact met je op om een vrijblijvende kennismaking in te plannen.</p>
      <ol class="next-steps" aria-label="Wat er na je aanvraag gebeurt">
        <li><div><strong>Je verstuurt je aanvraag</strong>Een paar gegevens zijn genoeg om te starten.</div></li>
        <li><div><strong>We nemen contact op</strong>Per e-mail of telefoon, om een kennismaking te plannen.</div></li>
        <li><div><strong>Kennismaking</strong>We bespreken je werkvoorraad en wat Yukify voor je kantoor kan betekenen.</div></li>
      </ol>
      <div class="mt-6">${contactItems({ includeLocation: false })}</div>
      ${whatsappButton() ? `<div class="mt-6">${whatsappButton()}</div>` : ''}
    </div>
    ${contactForm({ id: 'aanvraag', variant: 'compact', heading: 'Vraag een kennismaking aan', headingLevel: 3, intro: 'Het invullen duurt ongeveer een minuut.', submitLabel: 'Bespreek jouw capaciteitsvraagstuk', presetOrg: 'kantoor' })}
  </div>
</section>
`,
};
