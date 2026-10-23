import { routes, breadcrumbs, icon, site } from '../lib/components.mjs';

const L = site.legal;
const ph = (t) => `<span class="placeholder">${t}</span>`;
const draftNote = L.final
  ? ''
  : `<div class="legal-note" role="note">${icon('alert')}<div><strong>Concepttekst.</strong> Deze tekst is een voorlopige opzet en moet vóór publicatie worden aangevuld (gemarkeerde velden) en gecontroleerd door een jurist of privacyspecialist.</div></div>`;

const identity = `<p>${ph(L.entityName)}, handelend onder de naam <strong>Yukify — Administratie &amp; Support</strong><br>
${ph(L.address)}<br>
${site.location.city}, ${site.location.country}<br>
Inschrijving handelsregister: ${ph(L.registration)}<br>
E-mail: <a href="mailto:${site.email}">${site.email}</a><br>
Website: <a href="${site.url}/">${site.domain}</a></p>`;

export const privacyPage = {
  path: '/privacyverklaring/',
  title: 'Privacyverklaring | Yukify',
  description: 'Lees hoe Yukify — Administratie & Support omgaat met persoonsgegevens van websitebezoekers, contactpersonen en klanten.',
  breadcrumbs: [{ name: 'Privacyverklaring', path: '/privacyverklaring/' }],
  noindex: !L.final,
  render: () => `
<section class="page-hero" aria-labelledby="pagina-titel">
  <div class="container container--narrow">
    ${breadcrumbs([{ name: 'Privacyverklaring', path: '/privacyverklaring/' }])}
    <h1 id="pagina-titel">Privacyverklaring</h1>
    <p class="lead">Laatst bijgewerkt: ${ph(L.lastUpdated)}</p>
  </div>
</section>
<section class="section">
  <div class="container container--narrow">
    ${draftNote}
    <div class="prose">
      <h2>1. Wie wij zijn</h2>
      <p>In deze privacyverklaring lees je hoe Yukify omgaat met persoonsgegevens. Yukify is gevestigd in Suriname en richt zich op organisaties in Nederland. Op de verwerking van persoonsgegevens van personen in de Europese Unie kan daardoor de Algemene verordening gegevensbescherming (AVG) van toepassing zijn.</p>
      ${identity}

      <h2>2. Op wie deze verklaring van toepassing is</h2>
      <p>Deze privacyverklaring geldt voor persoonsgegevens die Yukify zelf verwerkt als verwerkingsverantwoordelijke, zoals gegevens van websitebezoekers, mensen die contact met ons opnemen en contactpersonen van (potentiële) klanten.</p>
      <p>Wanneer Yukify in opdracht van een klant (bijvoorbeeld een administratie- of accountantskantoor) administraties verwerkt, treedt Yukify op als <strong>verwerker</strong>. De klant is dan verwerkingsverantwoordelijke. Afspraken over die verwerking leggen we vast in een verwerkersovereenkomst met de klant.</p>

      <h2>3. Welke gegevens we verwerken</h2>
      <h3>Contactformulier en e-mail</h3>
      <p>Als je het contactformulier invult of ons mailt, verwerken we de gegevens die je zelf verstrekt: je naam, bedrijfsnaam, e-mailadres, eventueel je telefoonnummer, het type organisatie, de gewenste ondersteuning, een indicatie van het aantal uren en de inhoud van je bericht. Ook slaan we op via welke pagina het formulier is verstuurd.</p>
      <p>Stuur via het formulier geen financiële documenten of gegevens van je klanten mee.</p>
      <h3>Klantrelatie</h3>
      <p>Als we gaan samenwerken, verwerken we de contact- en factuurgegevens van de contactpersonen bij de klant die nodig zijn om de overeenkomst uit te voeren.</p>
      <h3>Technische gegevens</h3>
      <p>Bij het bezoeken van de website verwerkt de server tijdelijk technische gegevens, zoals je IP-adres, om de website te tonen en misbruik van het contactformulier te beperken. Ook onze hostingpartij ${ph('[naam hostingpartij]')} kan technische logbestanden bijhouden. ${ph('[Bewaartermijn logbestanden aanvullen]')}</p>

      <h2>4. Doeleinden en grondslagen</h2>
      <ul>
        <li><strong>Beantwoorden van je vraag of aanvraag</strong> en het plannen van een kennismaking: op basis van ons gerechtvaardigd belang om op vragen te reageren, of omdat je ons vraagt maatregelen te nemen voorafgaand aan een overeenkomst.</li>
        <li><strong>Uitvoeren van een overeenkomst</strong>, inclusief communicatie en facturering: omdat dit nodig is voor de uitvoering van de overeenkomst.</li>
        <li><strong>Voldoen aan wettelijke verplichtingen</strong>, zoals fiscale bewaarplichten.</li>
        <li><strong>Beveiliging van de website</strong> en het voorkomen van misbruik: op basis van ons gerechtvaardigd belang.</li>
      </ul>
      <p>We gebruiken je gegevens niet voor geautomatiseerde besluitvorming en verkopen ze niet aan derden.</p>

      <h2>5. Bewaartermijnen</h2>
      <p>We bewaren persoonsgegevens niet langer dan nodig voor het doel waarvoor ze zijn verzameld:</p>
      <ul>
        <li>Contactaanvragen die niet tot een samenwerking leiden: ${ph('[bewaartermijn, bijv. maximaal 12 maanden]')}.</li>
        <li>Gegevens van klantrelaties: zolang de samenwerking duurt en daarna zolang wettelijke bewaarplichten dat vereisen ${ph('[termijn bevestigen]')}.</li>
        <li>Administraties die we voor klanten verwerken: volgens de afspraken in de verwerkersovereenkomst.</li>
      </ul>

      <h2>6. Delen met derden</h2>
      <p>We delen persoonsgegevens alleen met partijen die nodig zijn voor onze dienstverlening, zoals onze hostingpartij en e-mailprovider ${ph('[namen dienstverleners aanvullen]')}, of als we daartoe wettelijk verplicht zijn. Met partijen die in onze opdracht persoonsgegevens verwerken, maken we afspraken over beveiliging en vertrouwelijkheid.</p>

      <h2>7. Doorgifte buiten de Europese Economische Ruimte</h2>
      <p>Yukify is gevestigd in Suriname, buiten de Europese Economische Ruimte (EER). Gegevens die je aan ons verstrekt, worden daardoor in Suriname verwerkt. Voor Suriname bestaat geen adequaatheidsbesluit van de Europese Commissie. Voor doorgiften van persoonsgegevens vanuit de EER maken we gebruik van ${ph('[passende waarborgen, bijvoorbeeld de standaardcontractbepalingen van de Europese Commissie — vóór publicatie vaststellen]')}. Je kunt contact met ons opnemen voor meer informatie over deze waarborgen.</p>

      <h2>8. Beveiliging</h2>
      <p>We nemen passende technische en organisatorische maatregelen om persoonsgegevens te beschermen tegen verlies en onrechtmatig gebruik. Denk aan versleutelde verbindingen (https), persoonlijke accounts met beperkte toegangsrechten en afspraken over de veilige overdracht van documenten. ${ph('[Maatregelen aanvullen, bijv. tweestapsverificatie en beleid voor apparaten]')}</p>

      <h2>9. Cookies</h2>
      <p>Deze website plaatst geen cookies en maakt geen gebruik van analyse- of advertentiediensten van derden. Lettertypen worden vanaf onze eigen server geladen. Als dit verandert, passen we deze privacyverklaring aan.</p>
      <p>Klik je op een link naar een externe dienst, zoals WhatsApp, dan is het privacybeleid van die dienst van toepassing.</p>

      <h2>10. Jouw rechten</h2>
      <p>Je hebt het recht om je persoonsgegevens in te zien, te laten corrigeren of te laten verwijderen. Ook kun je bezwaar maken tegen de verwerking, de verwerking laten beperken en vragen om overdracht van je gegevens. Stuur je verzoek naar <a href="mailto:${site.email}">${site.email}</a>. We reageren binnen de wettelijke termijn van één maand.</p>
      <p>Heb je een klacht over hoe we met je gegevens omgaan? Neem dan eerst contact met ons op. Je hebt daarnaast het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens.</p>

      <h2>11. Wijzigingen</h2>
      <p>We kunnen deze privacyverklaring aanpassen. De meest actuele versie staat altijd op deze pagina.</p>
    </div>
  </div>
</section>`,
};

export const termsPage = {
  path: '/algemene-voorwaarden/',
  title: 'Algemene voorwaarden | Yukify',
  description: 'De algemene voorwaarden van Yukify — Administratie & Support voor administratieve ondersteuning op afstand.',
  breadcrumbs: [{ name: 'Algemene voorwaarden', path: '/algemene-voorwaarden/' }],
  noindex: !L.final,
  render: () => `
<section class="page-hero" aria-labelledby="pagina-titel">
  <div class="container container--narrow">
    ${breadcrumbs([{ name: 'Algemene voorwaarden', path: '/algemene-voorwaarden/' }])}
    <h1 id="pagina-titel">Algemene voorwaarden</h1>
    <p class="lead">Versie: ${ph(L.lastUpdated)}</p>
  </div>
</section>
<section class="section">
  <div class="container container--narrow">
    ${draftNote}
    <div class="prose">
      <h2>1. Gegevens van Yukify</h2>
      ${identity}

      <h2>2. Toepasselijkheid</h2>
      <p>Deze voorwaarden zijn van toepassing op alle offertes, opdrachten en overeenkomsten tussen Yukify en de opdrachtgever voor administratieve ondersteuning. Afwijkingen gelden alleen als ze schriftelijk zijn overeengekomen. ${ph('[Bepaling over algemene voorwaarden van de opdrachtgever laten vaststellen]')}</p>

      <h2>3. Offertes en totstandkoming</h2>
      <p>Een offerte of voorstel beschrijft de werkzaamheden, de verwachte omvang, het tarief en de planning. Een overeenkomst komt tot stand ${ph('[wijze van totstandkoming vaststellen, bijv. na schriftelijke of digitale bevestiging door de opdrachtgever]')}. Offertes zijn ${ph('[geldigheidsduur]')} geldig.</p>

      <h2>4. Uitvoering van de werkzaamheden</h2>
      <p>Yukify voert de overeengekomen werkzaamheden zorgvuldig en naar beste inzicht en vermogen uit, volgens de afspraken over werkzaamheden, uren, deadlines en werkwijze. Yukify signaleert ontbrekende informatie, vragen en afwijkingen volgens de afgesproken werkwijze.</p>

      <h2>5. Verantwoordelijkheden van de opdrachtgever</h2>
      <p>De opdrachtgever zorgt ervoor dat Yukify tijdig beschikt over de gegevens, documenten en toegang die nodig zijn voor de uitvoering. Tenzij schriftelijk anders overeengekomen, blijven de inhoudelijke beoordeling, goedkeuring, fiscaal en juridisch advies, het indienen van aangiften en de verantwoordelijkheid richting de eigen klanten bij de opdrachtgever. Yukify verleent geen fiscaal of juridisch advies.</p>

      <h2>6. Tarieven en betaling</h2>
      <p>De tarieven zijn opgenomen in de offerte of overeenkomst. ${ph('[Facturatiefrequentie, betalingstermijn, valuta en eventuele tariefaanpassingen vaststellen]')}</p>

      <h2>7. Vertrouwelijkheid</h2>
      <p>Yukify behandelt alle informatie van de opdrachtgever en diens klanten vertrouwelijk en gebruikt deze uitsluitend voor de uitvoering van de opdracht. ${ph('[Reikwijdte en duur van de geheimhoudingsplicht vaststellen]')}</p>

      <h2>8. Verwerking van persoonsgegevens</h2>
      <p>Als Yukify bij de uitvoering persoonsgegevens verwerkt in opdracht van de opdrachtgever, sluiten partijen vóór de start een verwerkersovereenkomst. Daarin worden onder meer de beveiligingsmaatregelen, bewaartermijnen en de doorgifte van gegevens buiten de EER geregeld.</p>

      <h2>9. Aansprakelijkheid</h2>
      <p>${ph('[Aansprakelijkheidsregeling laten opstellen door een jurist, afgestemd op de bedrijfsstructuur en een eventuele beroepsaansprakelijkheidsverzekering]')}</p>

      <h2>10. Duur en beëindiging</h2>
      <p>${ph('[Looptijd, opzegtermijnen en gevolgen van beëindiging vaststellen, waaronder het teruggeven of verwijderen van gegevens en het intrekken van toegang]')}</p>

      <h2>11. Toepasselijk recht en geschillen</h2>
      <p>${ph('[Toepasselijk recht en bevoegde rechter vaststellen]')}</p>

      <p class="mt-7">Vragen over deze voorwaarden? Neem contact op via <a href="mailto:${site.email}">${site.email}</a> of bekijk onze <a href="${routes.privacy}">privacyverklaring</a>.</p>
    </div>
  </div>
</section>`,
};
