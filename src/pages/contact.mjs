import { routes, button, breadcrumbs, contactForm, contactItems, whatsappButton, phoneButton, icon, site } from '../lib/components.mjs';

const path = '/contact/';
const crumb = [{ name: 'Contact', path }];

export default {
  path,
  title: 'Contact — plan een kennismaking | Yukify',
  description:
    'Neem contact op met Yukify voor administratieve ondersteuning op afstand. Plan een kennismaking via het formulier of mail naar info@yukifyadministratie.nl.',
  breadcrumbs: crumb,
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact met Yukify',
      url: `${site.url}${path}`,
      about: { '@id': `${site.url}/#organisatie` },
    },
  ],
  render: () => `
<section class="page-hero" aria-labelledby="pagina-titel">
  <div class="container">
    ${breadcrumbs(crumb)}
    <p class="eyebrow">Contact</p>
    <h1 id="pagina-titel">Plan een kennismaking</h1>
    <p class="lead">Vertel ons waar je ondersteuning bij zoekt. We reageren zo snel mogelijk om een vrijblijvende kennismaking in te plannen of je vraag te beantwoorden.</p>
  </div>
</section>

<section class="section">
  <div class="container split">
    ${contactForm({ id: 'contact', variant: 'full', heading: 'Stuur ons een bericht', intro: 'Vul het formulier in en we nemen contact met je op. Liever direct mailen? Dat kan via <a href="mailto:' + site.email + '">' + site.email + '</a>.' })}
    <aside aria-labelledby="direct-titel">
      <h2 id="direct-titel" style="font-size:var(--fs-h3)">Direct contact</h2>
      ${contactItems()}
      <div class="btn-row mt-6">${whatsappButton()}${phoneButton()}</div>
      <p class="field-hint mt-6">Yukify werkt vanuit Paramaribo, Suriname. Houd rekening met het tijdsverschil met Nederland; we plannen overleg op een moment dat voor jou goed uitkomt.</p>

      <div class="card mt-6">
        <h2 style="font-size:var(--fs-h4)">Wat gebeurt er na je aanvraag?</h2>
        <ol class="next-steps">
          <li><div><strong>Ontvangst</strong>We lezen je bericht en nemen contact met je op.</div></li>
          <li><div><strong>Kennismaking</strong>We bespreken je werkvoorraad, je wensen en de mogelijkheden.</div></li>
          <li><div><strong>Voorstel</strong>Je ontvangt een helder voorstel met werkzaamheden, uren en tarief.</div></li>
        </ol>
      </div>
    </aside>
  </div>
</section>
`,
};

export const thanksPage = {
  path: '/contact/bedankt/',
  title: 'Bedankt voor je bericht | Yukify',
  description: 'Je bericht aan Yukify is verzonden.',
  noindex: true,
  render: () => `
<section class="section">
  <div class="container container--narrow">
    <div class="icon-badge" style="background:var(--success);color:#fff">${icon('check')}</div>
    <h1>Bedankt, je bericht is verzonden</h1>
    <p class="lead">We hebben je aanvraag ontvangen en nemen zo snel mogelijk contact met je op.</p>
    <div class="btn-row mt-6">${button('Terug naar de homepage', routes.home, { variant: 'primary' })}${button('Bekijk de diensten', routes.diensten, { variant: 'outline' })}</div>
  </div>
</section>`,
};

export const failedPage = {
  path: '/contact/niet-verzonden/',
  title: 'Bericht niet verzonden | Yukify',
  description: 'Je bericht kon niet worden verzonden.',
  noindex: true,
  render: () => `
<section class="section">
  <div class="container container--narrow">
    <div class="icon-badge" style="background:var(--error);color:#fff">${icon('alert')}</div>
    <h1>Je bericht is niet verzonden</h1>
    <p class="lead">Er ging iets mis bij het verzenden, of niet alle verplichte velden waren correct ingevuld. Je bericht is <strong>niet</strong> bij ons aangekomen.</p>
    <p>Probeer het opnieuw via het contactformulier of stuur je bericht rechtstreeks naar <a href="mailto:${site.email}">${site.email}</a>.</p>
    <div class="btn-row mt-6">${button('Terug naar het formulier', routes.contact, { variant: 'primary' })}${button('Mail ons', `mailto:${site.email}`, { variant: 'outline', iconName: 'mail' })}</div>
  </div>
</section>`,
};

export const notFoundPage = {
  path: '/404.html',
  title: 'Pagina niet gevonden | Yukify',
  description: 'Deze pagina bestaat niet (meer).',
  noindex: true,
  render: () => `
<section class="section">
  <div class="container container--narrow">
    <p class="eyebrow">Foutcode 404</p>
    <h1>Deze pagina kunnen we niet vinden</h1>
    <p class="lead">Misschien is de pagina verplaatst of is de link niet juist. Via onderstaande links kom je weer op weg.</p>
    <div class="btn-row mt-6">${button('Naar de homepage', routes.home, { variant: 'primary' })}${button('Bekijk de diensten', routes.diensten, { variant: 'outline' })}${button('Contact', routes.contact, { variant: 'outline' })}</div>
  </div>
</section>`,
};
