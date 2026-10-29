# Nieuws & Inzichten: redactie- en publicatieworkflow

Sinds 29 oktober 2026 werkt de redactie **automatisch**, op verzoek van de eigenaar. Artikelen worden zonder handmatige goedkeuring gepubliceerd als ze alle automatische kwaliteitscontroles doorstaan. Bij twijfel blijft een artikel concept, met een lijst van wat ontbreekt. De eigenaar kan alles in `/beheer` aanpassen of offline halen, of de automatische modus uitzetten.

## Onderdelen

| Onderdeel | Waar |
| --- | --- |
| Instellingen (aan/uit, einddatum, betrouwbare brondomeinen) | `content/redactie.json` |
| Kwaliteitscontrole en automatische taal- en opmaakcorrecties | `lib/quality.mjs` |
| Publiceren, inplannen, socialmedia klaarzetten en weekrapport | `scripts/redactie.mjs` |
| Werkinstructies voor de geplande redactiesessies | `docs/redactie-playbook.md` |
| Weekrapporten | `rapportages/<JJJJ-Www>.md` |
| Artikelen en socialmediaberichten | `content/nieuws/*.md`, `content/social/*.json` |
| Handmatig beheer en toezicht | `/beheer` (zie hieronder) |

## Automatische werkwijze

1. **Onderzoek**: actuele ontwikkelingen in Nederlandse accountancy en financiële administratie.
2. **Bronnen controleren**: primaire, officiële bronnen, met de datum waarop elke bron is geraadpleegd.
3. **Schrijven**, met een factcheck per kernclaim.
4. **Corrigeren**: taal- en opmaakfouten worden automatisch gecorrigeerd (`autofix`).
5. **Publiceren** zodra alle controles slagen (`node scripts/redactie.mjs publiceer`). Na de commit naar `main` bouwt Vercel de site. De build controleert automatisch gepubliceerde artikelen nog een keer; faalt die controle, dan blijft de vorige versie van de site online.
6. **Socialmedia**: teksten voor LinkedIn, Instagram en Facebook worden gecontroleerd en klaargezet. Plaatsen gebeurt **alleen via een gekoppelde, geautoriseerde integratie**. Die is er nog niet, dus er wordt nu niets geplaatst en niets als geplaatst gemarkeerd.
7. **Controle**: de Vercel-status van elke commit wordt nagekeken en fouten komen in het weekrapport.
8. **Rapportage** elke week.

### Kwaliteitsregels

Een artikel wordt alleen automatisch gepubliceerd als het aan alles hieronder voldoet. Anders blijft het concept.

- **Volledig:** alle velden zijn ingevuld en geldig (titel, slug, categorie, description, intro, tekst). Het artikel heeft minimaal drie tussenkoppen, een `## Conclusie` en als laatste `## Bronnen`.
- **Geen open punten:** `reviewNotes` is leeg. Wat onzeker is, staat daar en blokkeert publicatie.
- **Factcheck aanwezig**, met per kernclaim de bevestigende bron.
- **Bronnen:**
  - minimaal twee, allemaal via https en van een domein op de lijst in `content/redactie.json`;
  - minimaal één primaire of officiële bron;
  - elke bron heeft "Geraadpleegd op <datum>", niet ouder dan 30 dagen bij publicatie.
- **Cijfers en bedragen** hebben een bronlink in dezelfde alinea.
- **Toekomstige data** hebben altijd een status: geldend, aangenomen of vastgesteld, voorstel of plan, of verwachting.
- **Geen gevoelige gegevens:** geen e-mailadressen (behalve info@), telefoonnummers, IBAN's of BSN-achtige nummers.
- **Geen ongeoorloofde inhoud:** geen placeholders, geen garantieclaims.
- **Fiscale onderwerpen** vermelden dat het algemene informatie is en geen persoonlijk advies.
- **Doelgroep:** Nederlandstalig.
- **Geen dubbele publicatie:** geen gelijke titel of description en geen sterk overlappend onderwerp met een bestaand artikel. Een artikel dat al gepubliceerd of ingepland is, wordt nooit opnieuw gepubliceerd.

## Planning

De geplande redactiesessies lopen tot en met **31 december 2026**:

| Wanneer (Nederlandse tijd) | Wat |
| --- | --- |
| Dinsdag en donderdag, 07:47 | Onderzoek, schrijven, controleren en publiceren van één hoofdartikel, plus socialmediaberichten |
| Maandag, 08:37 | Weekrapport en onderhoud |

Na 31 december 2026 publiceert het script niets meer (`autopublishUntil`). Verlengen kan door die datum aan te passen en de geplande taken te verlengen.

## Automatische modus uitzetten

- **Direct stoppen:** zet `"autopublish": false` in `content/redactie.json` en commit. Daarna publiceert het script niets meer.
- **Eén artikel offline halen:** in `/beheer` → artikel → *Offline halen*, of zet de status in het bestand op `concept`.
- **De geplande sessies stoppen:** in claude.ai onder *Scheduled tasks*.

## Statussen

| Status | Betekenis | Op website? |
| --- | --- | --- |
| Concept | In bewerking, of niet door de automatische controle (zie `reviewNotes`) | Nee |
| Ter goedkeuring | Klaar voor handmatige controle (optioneel) | Nee |
| Goedgekeurd | Goedgekeurd, nog niet vrijgegeven | Nee |
| Ingepland | Goedgekeurd, met publicatiemoment | Ja, vanaf dat moment |
| Gepubliceerd | Vrijgegeven | Ja |

`approvedBy` laat zien wie goedkeurde: "Automatische redactie Yukify" of de naam van de eigenaar. Een artikel kan alleen openbaar worden mét een vastgelegde goedkeuring (`isPublic()` in `lib/news.mjs`).

## Beheer (`/beheer`)

Toezicht en handmatige ingrepen: artikelen bekijken, bewerken, zelf goedkeuren, inplannen en offline halen, en socialmediaberichten beheren.

- **Toegang:** wachtwoord (de server bewaart alleen een scrypt-hash), een ondertekende sessiecookie (`HttpOnly`, `Secure`, `SameSite=Strict`, 8 uur) en een CSRF-token. Er geldt een inlogbeperking.
- **Afscherming:** de pagina's staan in `noindex` en zijn uitgesloten in robots.txt.
- **Opslag:** wijzigingen worden commits via de GitHub-API (`GITHUB_TOKEN`).
- **Zonder configuratie** toont `/beheer` alleen welke variabelen ontbreken.

## Redactie-API

Bedoeld voor externe automatisering, zoals een socialmediatool. Elk verzoek stuurt de header `Authorization: Bearer <REDACTIE_TOKEN>` mee. Via de API kan niets worden gepubliceerd.

| Methode en pad | Doel |
| --- | --- |
| `GET /api/redactie/artikelen[?slug=…]` | Artikelen opvragen |
| `POST /api/redactie/artikelen` | Concept aanmaken of bijwerken (alleen concept of ter goedkeuring) |
| `GET /api/redactie/social[?slug=…]` | Wachtrij met klaargezette (goedgekeurde) berichten, of de berichten van één artikel |
| `POST /api/redactie/social` | Concepttekst per platform |
| `POST /api/redactie/social/gepubliceerd` | Link vastleggen nadat een geautoriseerde integratie een bericht heeft geplaatst |

## Vercel-instellingen (eenmalig, door de eigenaar)

De sessie heeft geen toegang tot Vercel. Zet daarom zelf in Vercel → *Settings → Environment Variables* de volgende waarden, als **Sensitive** voor Production, en deploy daarna opnieuw (*Deployments → Redeploy*).

| Variabele | Waarde |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | scrypt-hash van het beheerwachtwoord (`npm run beheer:wachtwoord`) |
| `ADMIN_SESSION_SECRET` | minimaal 32 willekeurige tekens |
| `GITHUB_TOKEN` | fine-grained token: alleen repo `johnlukems-cpu/yukify`, *Contents: Read and write*, met vervaldatum |
| `GITHUB_REPO` | `johnlukems-cpu/yukify` |
| `GITHUB_BRANCH` | `main` |
| `CRON_SECRET` | minimaal 32 willekeurige tekens (voor de dagelijkse publicatie van ingeplande artikelen) |
| `REDACTIE_TOKEN` | minimaal 32 willekeurige tekens (alleen nodig voor externe integraties) |
| `ADMIN_NAME` | optioneel: naam bij handmatige goedkeuringen |

De automatische redactie werkt via Git-commits en heeft deze variabelen **niet** nodig. Ze zijn alleen nodig voor `/beheer`, de dagelijkse cron en de redactie-API.

## Nog af te handelen (externe autorisatie)

1. **Vercel-variabelen** instellen (zie hierboven), inclusief het aanmaken van het GitHub-token.
2. **Netwerktoegang** van de cloudomgeving: de redactiesessies kunnen bronsites (belastingdienst.nl, rijksoverheid.nl, overheid.nl, kvk.nl, europa.eu e.d.) en de eigen site nu niet rechtstreeks openen; ze werken met zoekresultaten. Daardoor blijven claims die alleen op die sites te bevestigen zijn concept. Voeg deze domeinen toe onder *Network access → Allowed domains* van de omgeving: https://code.claude.com/docs/en/cloud-environments#network-access
3. **Socialmedia-integratie**: koppel een geautoriseerde tool of API aan uw eigen LinkedIn-, Instagram- en Facebook-accounts, bijvoorbeeld een planningstool met officiële API-koppeling. Laat die tool de wachtrij `GET /api/redactie/social` lezen en na het plaatsen `POST /api/redactie/social/gepubliceerd` aanroepen. Tot die koppeling er is, wordt er niets geplaatst.
4. **Statistieken**: er is nog geen analytics-koppeling, zoals Vercel Web Analytics of Search Console. Het rapport vermeldt dat eerlijk.
