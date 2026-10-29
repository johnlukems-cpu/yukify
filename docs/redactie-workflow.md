# Nieuws & Inzichten: redactie- en publicatieworkflow

Dit document beschrijft hoe artikelen en socialmediaberichten van concept tot publicatie gaan, wie wat mag en wat er nog moet worden ingericht.

## Uitgangspunten

- **Niets wordt openbaar zonder expliciete goedkeuring van de eigenaar.** Een artikel staat alleen op de website als het in `/beheer` is goedgekeurd (naam + tijdstip vastgelegd) én de status *Gepubliceerd* heeft, of *Ingepland* is en het publicatiemoment is verstreken. Deze regel staat op één plek: `isPublic()` in `lib/news.mjs`.
- Concepten worden niet gebouwd: ze komen niet in `dist/`, niet in de sitemap en niet in de zoekindex. Een conceptadres geeft een 404.
- Er wordt **niets automatisch op sociale media geplaatst**. Berichten worden voorbereid en door de eigenaar goedgekeurd. Plaatsen gebeurt handmatig of via een integratie die u zelf koppelt en autoriseert.
- Geheimen staan alleen in server-side omgevingsvariabelen (Vercel). Er staat niets geheims in de frontend of in Git.

## Statussen

| Status | Betekenis | Op website? |
| --- | --- | --- |
| Concept | In bewerking (door de eigenaar of de redactie-API) | Nee |
| Ter goedkeuring | Klaar voor controle door de eigenaar | Nee |
| Goedgekeurd | Eigenaar heeft de inhoud goedgekeurd; nog niet vrijgegeven | Nee |
| Ingepland | Goedgekeurd, met een publicatiemoment | Ja, vanaf dat moment (zie *Inplannen*) |
| Gepubliceerd | Goedgekeurd en vrijgegeven | Ja |

Toegestane overgangen (alleen in `/beheer`):

- *Ter goedkeuring aanbieden*: concept → ter goedkeuring.
- *Goedkeuren*: concept of ter goedkeuring → goedgekeurd. U moet daarbij bevestigen dat u inhoud, feiten en bronnen hebt gecontroleerd. Het artikel moet compleet en geldig zijn.
- *Nu publiceren* of *Inplannen*: alleen vanuit goedgekeurd of ingepland.
- *Terug naar concept / Offline halen*: wist de goedkeuring en haalt het artikel van de website.

Wijzigt u in `/beheer` de tekst van een goedgekeurd of gepubliceerd artikel, dan geldt het opslaan als nieuwe goedkeuring door u. Bij een gepubliceerd artikel wordt dan ook de datum *bijgewerkt* gezet.

## Werkwijze per artikel

1. **Onderzoek en concept met bronnen**: door Claude via de redactie-API, of door uzelf via *Nieuw artikel*. Gebruik alleen controleerbare bronnen en verzin geen cijfers of citaten. Maak in de tekst onderscheid tussen geldende regels en plannen of verwachtingen. Wat u nog moet nalopen, staat in *Redactie-aantekeningen*; die zijn alleen in het beheer zichtbaar.
2. **Goedkeuring door de eigenaar**: in `/beheer` → artikel → *Voorbeeld bekijken*, de aantekeningen nalopen en dan *Goedkeuren*.
3. **Publicatie op de website**: *Nu publiceren* of *Inplannen*. Elke wijziging is een commit in GitHub; Vercel bouwt de site daarna automatisch opnieuw, wat enkele minuten duurt.
4. **Socialmediaversies**: per artikel een tekst voor LinkedIn, Instagram en Facebook. Claude kan concepten aanleveren via de API, of u schrijft ze zelf in `/beheer`.
5. **Goedkeuring van de socialmediaberichten** door de eigenaar in `/beheer`. Dat kan pas nadat het artikel zelf is goedgekeurd. Wijzigt u daarna de tekst, dan moet het bericht opnieuw worden goedgekeurd.
6. **Plaatsen** gebeurt alleen via een geautoriseerde integratie of handmatig. Daarna legt u de link van het geplaatste bericht vast met *Markeren als geplaatst*, of de integratie meldt het via de API.
7. **Koppeling**: per artikel staat in `content/social/<slug>.json` de tekst, de status, wie het bericht heeft goedgekeurd en wanneer, en de link van elk geplaatst bericht.

## Inplannen

Een artikel met de status *Ingepland* wordt opgenomen bij de eerste build na het publicatiemoment. Vercel Cron draait dagelijks om 05:17 UTC (06:17 of 07:17 Nederlandse tijd) en zet artikelen waarvan het moment is verstreken op *Gepubliceerd*. Die commit start een nieuwe build. Op het Vercel Hobby-abonnement draait een cron maximaal één keer per dag. Het publicatiemoment werkt dus per dag, niet per minuut. Kies *Nu publiceren* als het direct moet.

## Beheer (`/beheer`)

- Inloggen met wachtwoord. De server bewaart alleen een scrypt-hash.
- Na het inloggen krijgt u een ondertekende sessiecookie (`HttpOnly`, `Secure`, `SameSite=Strict`, alleen geldig onder `/beheer`, 8 uur). Elke wijziging vereist een CSRF-token en een verzoek vanaf dezelfde origin. Na 10 mislukte inlogpogingen per kwartier wordt het IP-adres tijdelijk geblokkeerd.
- De pagina's worden nooit gecachet of geïndexeerd (`X-Robots-Tag: noindex`, `Disallow: /beheer` in robots.txt) en staan niet in de navigatie of de sitemap.
- Zonder volledige configuratie toont `/beheer` alleen welke variabelen nog ontbreken; de waarden worden nooit getoond.

## Redactie-API (voor Claude of andere automatisering)

Alle verzoeken gebruiken `Authorization: Bearer <REDACTIE_TOKEN>`. De API kan **niet** goedkeuren, inplannen of publiceren.

| Methode en pad | Doel |
| --- | --- |
| `GET /api/redactie/artikelen` | Lijst van alle artikelen (slug, titel, status) |
| `GET /api/redactie/artikelen?slug=…` | Eén artikel, inclusief tekst |
| `POST /api/redactie/artikelen` | Concept aanmaken of bijwerken (JSON: `title`, `category`, `description`, `intro`, `body`, `reviewNotes`, optioneel `slug`, `status: "ter-goedkeuring"`). Alleen voor artikelen met de status concept of ter goedkeuring. Velden voor goedkeuring en datum worden geweigerd. |
| `GET /api/redactie/social?slug=…` | Socialmediaberichten van een artikel |
| `POST /api/redactie/social` | Concepttekst voor één platform (`slug`, `platform`, `text`). Alleen zolang het bericht nog een concept is. |
| `GET /api/redactie/social` | Wachtrij: alleen door de eigenaar **goedgekeurde**, nog niet geplaatste berichten |
| `POST /api/redactie/social/gepubliceerd` | Link vastleggen nadat een geautoriseerde integratie een goedgekeurd bericht heeft geplaatst (`slug`, `platform`, `url`) |

Categorieën: `financiele-administratie`, `btw-en-belastingen`, `accountancy-en-regelgeving`, `ai-en-automatisering`, `boekhoudsoftware`, `ondernemen-en-cashflow`, `jaarafsluiting`.

Artikeltekst is Markdown: `##` en `###` voor tussenkoppen, `- [ ]` voor checklistpunten, tabellen en links (alleen https of interne links). Ruwe HTML en afbeeldingen in de tekst worden niet doorgelaten. Een H1 (`#`) is niet toegestaan, want de titel is al de H1.

## Nog in te richten (eenmalig)

1. **GitHub-token**: GitHub → Settings → Developer settings → *Fine-grained tokens*. Kies alleen de repository `johnlukems-cpu/yukify`, met de permissie *Contents: Read and write* en een vervaldatum. Zet het token als `GITHUB_TOKEN` in Vercel.
2. **Wachtwoord**: draai lokaal `npm run beheer:wachtwoord`. Zet de uitvoer als `ADMIN_PASSWORD_HASH` en `ADMIN_SESSION_SECRET` in Vercel. Optioneel: `ADMIN_NAME` met uw naam, die bij goedkeuringen wordt vastgelegd.
3. **`GITHUB_REPO`** = `johnlukems-cpu/yukify`. Optioneel `GITHUB_BRANCH`; standaard is dat `main`.
4. **`CRON_SECRET`** (minimaal 32 willekeurige tekens) voor de dagelijkse publicatieronde. Vercel stuurt dit automatisch mee aan de cron.
5. **`REDACTIE_TOKEN`** (minimaal 32 willekeurige tekens), alleen als Claude of andere automatisering concepten mag aanleveren. Geef dit token alleen aan die integratie.
6. Zet alle variabelen in Vercel → *Settings → Environment Variables* als **Sensitive**, voor Production (en eventueel Preview), en deploy opnieuw.
7. **Socialmedia-integraties**: nog niet gekoppeld. Als u dat wilt, verbindt u een plannings- of publicatietool (bijvoorbeeld via de officiële API's van LinkedIn of Meta) met uw eigen accounts. Laat die tool alleen berichten uit de wachtrij `GET /api/redactie/social` plaatsen en daarna `POST /api/redactie/social/gepubliceerd` aanroepen. Inloggegevens van sociale media horen in die tool, niet in deze website.

Controle: of de publicatieronde goed draait, ziet u in Vercel → *Cron Jobs* → *Logs*.
