import { routes, button, icon, sectionHead, serviceCard, processSteps, feature, ctaBand, pricingSection, site } from '../lib/components.mjs';
import { heroVisual } from '../lib/visuals.mjs';

export const collaborationSteps = [
  { title: 'Kennismaken', text: 'We bespreken je huidige werkvoorraad, de werkzaamheden en jouw ondersteuningsbehoefte.' },
  { title: 'Afspraken maken', text: 'We leggen werkzaamheden, verantwoordelijkheden, uren en deadlines helder vast.' },
  { title: 'Samenwerken', text: 'We regelen de veilige overdracht van gegevens en starten met de uitvoering van het werk.' },
  { title: 'Evalueren', text: 'We bespreken regelmatig de voortgang, openstaande vragen en verbeterpunten.' },
];

export const services = [
  {
    iconName: 'calculator',
    title: 'Financiële administratie',
    text: 'Verwerking van inkoop- en verkoopfacturen, bankmutaties en administratieve documenten, volgens jouw werkwijze.',
    href: `${routes.diensten}#financiele-administratie`,
  },
  {
    iconName: 'percent',
    title: 'Ondersteuning bij btw-processen',
    text: 'Administratieve voorbereiding van btw-aangiften en overzichten, klaar voor beoordeling door jouw kantoor.',
    href: `${routes.diensten}#btw-processen`,
  },
  {
    iconName: 'clock',
    title: 'Administratieve achterstanden',
    text: 'Achterstallige boekingen inhalen en documenten ordenen, volgens de prioriteiten die we samen afspreken.',
    href: `${routes.diensten}#achterstanden`,
  },
  {
    iconName: 'users',
    title: 'Remote ondersteuning voor kantoren',
    text: 'Structurele of tijdelijke extra verwerkingscapaciteit op basis van afgesproken uren en werkzaamheden.',
    href: `${routes.diensten}#remote-ondersteuning`,
  },
  ...(site.offersProcessImprovement
    ? [
        {
          iconName: 'workflow',
          title: 'Procesverbetering',
          text: 'Terugkerende werkzaamheden structureren en onnodige handmatige stappen verminderen.',
          href: `${routes.diensten}#procesverbetering`,
        },
      ]
    : []),
];

export const whyItems = [
  { iconName: 'briefcase', title: 'Ervaring in financiële administratie', text: 'Meer dan 10 jaar ervaring met het verwerken van financiële administraties.' },
  { iconName: 'target', title: 'Bekend met Nederlandse werkwijzen', text: 'Meer dan 3 jaar ervaring met Nederlandse btw-processen en administratieve werkwijzen.' },
  { iconName: 'globe', title: 'Remote samenwerking', text: 'Ondersteuning op afstand, afgestemd op jouw systemen, processen en planning.' },
  { iconName: 'clipboardCheck', title: 'Duidelijke afspraken', text: 'Vooraf heldere afspraken over uren, werkzaamheden, verantwoordelijkheden en deadlines.' },
  { iconName: 'messageCheck', title: 'Zorgvuldig en met terugkoppeling', text: 'Nauwkeurige verwerking, en vragen of ontbrekende stukken worden tijdig gemeld.' },
  { iconName: 'lock', title: 'Vertrouwelijkheid en toegangsbeheer', text: 'Zorgvuldige omgang met financiële gegevens en alleen de toegang die nodig is.' },
];

export default {
  path: '/',
  title: 'Yukify | Administratieve ondersteuning voor kantoren',
  ogTitle: 'Yukify — Administratie & Support',
  ogDescription:
    'Meer capaciteit. Minder administratieve druk. Administratieve ondersteuning op afstand voor administratie- en accountantskantoren.',
  description:
    'Yukify biedt administratieve ondersteuning op afstand voor administratie- en accountantskantoren. Meer capaciteit, minder administratieve druk. Ontdek onze ondersteuning.',
  render: () => `
<section class="hero" aria-labelledby="hero-titel">
  <div class="container hero-grid">
    <div>
      <p class="eyebrow">Administratie &amp; Support</p>
      <h1 id="hero-titel"><span class="hero-line">Meer capaciteit.</span> <span class="hero-line">Minder administratieve druk.</span></h1>
      <p class="lead">Yukify ondersteunt Nederlandse administratie- en accountantskantoren bij het verwerken van financiële administraties. Zo creëer je extra capaciteit, houd je grip op je werkvoorraad en kun je je richten op je klanten.</p>
      <div class="btn-row">
        ${button('Plan een kennismaking', routes.contact, { variant: 'primary', arrow: true })}
        ${button('Ontdek onze diensten', routes.diensten, { variant: 'outline' })}
      </div>
      <p class="hero-note">${icon('shield')}<span>Remote ondersteuning met heldere afspraken en vertrouwelijke omgang met gegevens.</span></p>
    </div>
    <div class="hero-visual">${heroVisual()}</div>
  </div>
</section>

<section class="trust-bar" aria-label="Ervaring en werkwijze">
  <div class="container">
    <ul class="trust-list">
      <li class="trust-item"><span class="trust-figure">10+</span><p class="trust-text"><strong>jaar ervaring</strong>in financiële administratie</p></li>
      <li class="trust-item"><span class="trust-figure">3+</span><p class="trust-text"><strong>jaar ervaring</strong>met Nederlandse btw en administratieve werkwijzen</p></li>
      <li class="trust-item">${icon('globe', { cls: 'trust-icon' })}<p class="trust-text"><strong>Remote ondersteuning</strong>bij terugkerende administratieve werkzaamheden</p></li>
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="probleem-titel">
  <div class="container split">
    <div>
      <p class="eyebrow">Herkenbaar?</p>
      <h2 id="probleem-titel">Meer werk hoeft niet automatisch meer druk te betekenen.</h2>
      <p class="lead">Als kantoor wil je groeien en je klanten goed bedienen. Maar de verwerking van administraties loopt niet altijd in hetzelfde tempo mee.</p>
      <p>Yukify neemt afgesproken administratieve werkzaamheden op afstand van je over. Jij bepaalt welke taken we uitvoeren, binnen welke planning en volgens welke werkwijze. Zo komt er ruimte vrij in je team, zonder dat je direct extra personeel hoeft aan te nemen.</p>
      ${button('Bekijk hoe we kantoren ondersteunen', routes.kantoren, { variant: 'outline', arrow: true })}
    </div>
    <ul class="problem-list" aria-label="Uitdagingen waar kantoren mee te maken kunnen krijgen">
      <li class="reveal">${icon('trendingUp')}<span><strong>Een groeiende werkvoorraad</strong><br><span class="text-muted">Meer klanten en meer administraties, met hetzelfde team.</span></span></li>
      <li class="reveal">${icon('refresh')}<span><strong>Terugkerende verwerkingswerkzaamheden</strong><br><span class="text-muted">Boekingen en verwerking die elke periode opnieuw tijd vragen.</span></span></li>
      <li class="reveal">${icon('calendar')}<span><strong>Druk tijdens btw- en afsluitperioden</strong><br><span class="text-muted">Pieken rond deadlines die je planning onder druk zetten.</span></span></li>
      <li class="reveal">${icon('clock')}<span><strong>Te weinig tijd binnen de planning</strong><br><span class="text-muted">Niet alle taken zijn binnen de gewenste termijn af te ronden.</span></span></li>
    </ul>
  </div>
</section>

<section class="section section--white" aria-labelledby="diensten-titel">
  <div class="container">
    ${sectionHead({ eyebrow: 'Diensten', title: 'Waar Yukify je mee kan ondersteunen', intro: 'Praktische, afgebakende ondersteuning bij terugkerende administratieve werkzaamheden.', id: 'diensten-titel' })}
    <div class="grid ${services.length === 5 ? 'grid-3' : 'grid-4'}">
      ${services.map(serviceCard).join('')}
    </div>
    <p class="mt-6">${button('Bekijk alle diensten', routes.diensten, { variant: 'outline', arrow: true })}</p>
  </div>
</section>

<section class="section section--green" aria-labelledby="proces-titel">
  <div class="container">
    ${sectionHead({ eyebrow: 'Samenwerken', title: 'Zo werkt de samenwerking', intro: 'Een gestructureerde start en heldere afspraken, zodat je precies weet wat je kunt verwachten.', id: 'proces-titel' })}
    ${processSteps(collaborationSteps)}
    <div class="btn-row mt-7">${button('Plan een kennismaking', routes.contact, { variant: 'gold', arrow: true })}</div>
  </div>
</section>

<section class="section" aria-labelledby="waarom-titel">
  <div class="container">
    ${sectionHead({ eyebrow: 'Waarom Yukify?', title: 'Een betrouwbare partner op afstand', intro: 'Geen anoniem callcenter, maar een vaste partner die zich verdiept in jouw werkwijze en zorgvuldig werkt.', id: 'waarom-titel' })}
    <div class="grid grid-3">
      ${whyItems.map(feature).join('')}
    </div>
  </div>
</section>

${pricingSection()}

${ctaBand({
  title: 'Geef je team meer ruimte om vooruit te komen.',
  text: 'Ontdek hoe Yukify jouw kantoor kan ondersteunen bij terugkerende administratieve werkzaamheden.',
  label: 'Bespreek jouw capaciteitsvraagstuk',
  phone: true,
})}
`,
};
