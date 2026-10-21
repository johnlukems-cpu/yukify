// Centrale bedrijfsgegevens en publicatieschakelaars voor yukify.nl.
// Zet een schakelaar pas op `true` nadat de eigenaar het gegeven heeft bevestigd.

export default {
  name: 'Yukify',
  fullName: 'Yukify — Administratie & Support',
  descriptor: 'Administratie & Support',
  slogan: 'Meer capaciteit. Minder administratieve druk.',
  url: 'https://www.yukify.nl',
  email: 'info@yukify.nl',
  location: { city: 'Paramaribo', country: 'Suriname', countryCode: 'SR' },

  // Opgegeven als "+3106 14856469". Waarschijnlijk bedoeld: Nederlands mobiel nummer
  // 06 14856469 = +31 6 14856469. Pas na bevestiging `confirmed: true` zetten;
  // tot die tijd worden er geen tel:- en WhatsApp-links gepubliceerd.
  phone: {
    confirmed: false,
    display: '+31 6 1485 6469',
    e164: '+31614856469',
  },
  whatsapp: {
    // Volgt het telefoonnummer; apart uit te zetten als WhatsApp op een ander nummer draait.
    enabled: true,
    message: 'Hallo Yukify, ik wil graag meer informatie over jullie administratieve ondersteuning.',
  },

  // Voorgesteld starttarief. Alleen publiceren na definitieve bevestiging.
  pricing: {
    confirmed: false,
    hourlyFrom: 15,
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
