# Yukify — website (yukifyadministratie.nl)

Website voor **Yukify — Administratie & Support**. Statische pagina's gegenereerd met Node.js (zonder framework) en een kleine Node-server die de site serveert en het contactformulier via SMTP verstuurt.

## Snel starten

```bash
npm install
npm run build      # bouwt de site naar dist/
npm start          # serveert dist/ en /api/contact op http://localhost:3000
npm test           # bouwt en draait alle end-to-end tests (Playwright + test-SMTP)
npm run images     # genereert logo-PNG's, favicon en OG-afbeelding opnieuw
```

Vereist Node.js 20 of hoger.

## Structuur

| Pad | Inhoud |
| --- | --- |
| `site.config.mjs` | Bedrijfsgegevens en **publicatieschakelaars** (telefoon/WhatsApp, sociale profielen, tarief, dienst 5, oprichter, juridische gegevens) |
| `src/lib/components.mjs` | Herbruikbare componenten: layout, header, footer, logo, knoppen, dienstkaarten, CTA, prijzen, formulier |
| `src/lib/icons.mjs`, `src/lib/visuals.mjs` | Lijn-iconen en illustraties (inline SVG) |
| `src/pages/*.mjs` | Inhoud per pagina, inclusief SEO-titel en meta description |
| `src/assets/` | CSS (design system) en JavaScript (menu, formulier) |
| `src/static/` | Favicon, manifest, OG-afbeelding, logo-PNG |
| `lib/contact.mjs`, `lib/security.mjs` | Formulierverwerking (SMTP) en beveiligingsheaders, gedeeld door beide hostingvarianten |
| `api/contact.mjs`, `api/health.mjs`, `vercel.json` | Serverless functies en configuratie voor Vercel |
| `serve.mjs` | Webserver voor eigen Node-hosting (serveert `dist/` + `/api/contact`) |
| `tests/run-tests.mjs` | End-to-end tests |

## Contactformulier configureren

Het formulier verstuurt e-mail via SMTP (nodemailer) vanuit Google Workspace. Zonder geldige configuratie toont het een foutmelding ("niet verzonden"); er wordt nooit een succes gesimuleerd.

| Variabele | Verplicht | Waarde |
| --- | --- | --- |
| `SMTP_HOST` | ja | `smtp.gmail.com` |
| `SMTP_USER` | ja | `info@yukifyadministratie.nl` |
| `SMTP_PASS` | ja | app-wachtwoord van dat account (geheim, in Vercel als *Sensitive*) |
| `SMTP_PORT` / `SMTP_SECURE` | nee | standaard `465` / `true` |
| `MAIL_TO` | nee | standaard `info@yukifyadministratie.nl` |
| `MAIL_FROM` | nee | standaard `Yukify website <SMTP_USER>`; alleen het account zelf of een geverifieerde Gmail-alias |

Controle: `https://<domein>/healthz` toont `"mail": true` en een lege `missing`-lijst. Lokaal testen van inloggen en verzenden: zet de variabelen in `.env.local` (niet committen) en draai `npm run mail:check` (alleen inloggen) of `node --env-file=.env.local scripts/check-mail.mjs --send` (testbericht).

## Hosting

**Vercel (aanbevolen):** koppel de GitHub-repository. `vercel.json` regelt de build (`npm run build` → `dist/`), de beveiligingsheaders en de functie `/api/contact`. Stel de e-mailvariabelen in onder *Project → Settings → Environment Variables* en deploy opnieuw. Controleer daarna `https://<domein>/healthz`.

**Eigen Node-hosting (VPS e.d.):** `npm ci && npm run build && npm start`. Zet de server achter https en stel daarna `HSTS=true` in. Achter een reverse proxy: `TRUST_PROXY=true`.

## Domein en e-mail (yukifyadministratie.nl)

Het voorkeursdomein is `https://yukifyadministratie.nl` (zonder www), ingesteld in `site.config.mjs` (`url`, `domain`, `email`). Canonical URL's, sitemap, robots.txt, Open Graph en JSON-LD volgen automatisch.

Handmatig in Vercel (*Project → Settings → Domains*):
1. Voeg `yukifyadministratie.nl` toe en markeer het als productiedomein.
2. Voeg `www.yukifyadministratie.nl` toe en kies **Redirect to `yukifyadministratie.nl`** (308). Stel de redirect alléén hier in; `vercel.json` bevat bewust geen host-redirect, zodat er geen redirect-loop kan ontstaan.
3. Optioneel: laat het oude domein (`yukify.nl`, `www.yukify.nl`) gekoppeld en stel het in als redirect naar `yukifyadministratie.nl`, zodat oude links blijven werken.
4. Neem de DNS-records over die Vercel bij elk domein toont (meestal een A-record voor `@` en een CNAME voor `www`) in Squarespace. Voeg alleen deze records toe of pas alleen bestaande A/CNAME-records voor `@`/`www` aan; laat MX-, SPF-, DKIM- en DMARC-records ongemoeid.

Voor het contactformulier: zie *Contactformulier configureren* hierboven.

## Vóór publicatie te bevestigen

Zie de schakelaars in `site.config.mjs`:

- `social.linkedin` / `social.instagram` — vul de volledige https-URL van het officiële profiel in; de knoppen verschijnen dan automatisch in de footer en het mobiele menu. Ongeldige of lege URL's worden niet getoond.
- `pricing.confirmed` — tarief "vanaf € 15 per uur".
- `offersProcessImprovement` — dienst 5 (procesverbetering en automatisering).
- `founder` — persoonlijke introductie en foto.
- `legal.*` en `legal.final` — juridische naam, adres, inschrijvingsnummer, en controle van privacyverklaring en algemene voorwaarden (tot dan `noindex` met conceptmelding).
- Logo: het logo is als vector nagebouwd op basis van de aangeleverde visuals. Vervang het bij voorkeur door het originele bronbestand (SVG/AI) en draai `npm run images`.
