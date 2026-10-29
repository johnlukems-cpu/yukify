// Centrale bedrijfsgegevens en publicatieschakelaars voor yukifyadministratie.nl.
// Zet een schakelaar pas op `true` nadat de eigenaar het gegeven heeft bevestigd.

export default {
  name: 'Yukify',
  fullName: 'Yukify — Administratie & Support',
  descriptor: 'Administratie & Support',
  slogan: 'Uw betrouwbare partner voor financiële backoffice',
  // Voorkeursdomein (met www). Alle canonical URL's, sitemap, Open Graph en JSON-LD gebruiken dit.
  // Het domein zonder www moet in Vercel doorverwijzen naar deze variant.
  url: 'https://www.yukifyadministratie.nl',
  domain: 'yukifyadministratie.nl',
  email: 'info@yukifyadministratie.nl',
  location: { city: 'Paramaribo', country: 'Suriname', countryCode: 'SR' },

  // Bevestigd door de eigenaar: +31 6 14856469 (telefoon en WhatsApp).
  phone: {
    confirmed: true,
    display: '+31 6 14856469',
    e164: '+31614856469',
  },
  whatsapp: {
    // Volgt het telefoonnummer; apart uit te zetten als WhatsApp op een ander nummer draait.
    enabled: true,
    message: 'Hallo Yukify, ik wil graag meer informatie over jullie administratieve ondersteuning.',
  },

  // Sociale profielen. Vul de volledige https-URL in zodra het officiële profiel bekend is;
  // knoppen verschijnen dan automatisch in de footer en het mobiele menu. Leeg = niet tonen.
  social: {
    linkedin: '',
    instagram: '',
  },

  // Starttarief, bevestigd door de eigenaar: vanaf € 12 per uur.
  pricing: {
    confirmed: true,
    hourlyFrom: 12,
  },

  // Dienst 5 (procesverbetering en automatisering) alleen tonen als die echt wordt aangeboden.
  offersProcessImprovement: false,

  // Persoonlijke introductie oprichter. Vul in als tekst en foto beschikbaar zijn,
  // bijv. { name: '...', role: 'Oprichter', intro: ['alinea 1', 'alinea 2'], photo: '/assets/img/oprichter.jpg' }
  founder: null,

  // Juridische gegevens die nog ontbreken (worden als zichtbare placeholder getoond op juridische pagina's).
  legal: {
    entityName: '[Juridische naam en rechtsvorm]',
    registration: '[Inschrijvingsnummer handelsregister (KKF Suriname of KvK)]',
    address: '[Correspondentieadres]',
    vat: '[Btw-/belastingnummer, indien van toepassing]',
    lastUpdated: '[datum vaststelling]',
    // Zet op true zodra privacyverklaring en algemene voorwaarden juridisch zijn gecontroleerd en ingevuld.
    // Tot die tijd krijgen deze pagina's noindex en een conceptmelding.
    final: false,
  },
};
