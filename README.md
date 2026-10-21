# Yukify — website (www.yukify.nl)

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
| `site.config.mjs` | Bedrijfsgegevens en **publicatieschakelaars** (telefoon/WhatsApp, tarief, dienst 5, oprichter, juridische gegevens) |
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

Het formulier verstuurt e-mail via SMTP. Zonder configuratie geeft het formulier een eerlijke foutmelding ("niet verzonden") — er wordt nooit een succes gesimuleerd. Stel deze omgevingsvariabelen in bij de hosting (zie `.env.example`):

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO` (standaard `info@yukify.nl`).

Controleer `/healthz`: `"mail": true` betekent dat SMTP is ingesteld. Stuur na livegang één echt testbericht.

## Hosting

**Vercel (aanbevolen):** koppel de GitHub-repository. `vercel.json` regelt de build (`npm run build` → `dist/`), de beveiligingsheaders en de functie `/api/contact`. Stel de SMTP-variabelen in onder *Project → Settings → Environment Variables* en deploy opnieuw. Controleer daarna `https://<domein>/healthz`.

**Eigen Node-hosting (VPS e.d.):** `npm ci && npm run build && npm start`. Zet de server achter https en stel daarna `HSTS=true` in. Achter een reverse proxy: `TRUST_PROXY=true`.

## Vóór publicatie te bevestigen

Zie de schakelaars in `site.config.mjs`:

- `phone.confirmed` — telefoonnummer. Opgegeven als "+3106 14856469"; vermoedelijk `+31 6 14856469`. Pas na bevestiging komen tel:- en WhatsApp-links online.
- `pricing.confirmed` — tarief "vanaf € 15 per uur".
- `offersProcessImprovement` — dienst 5 (procesverbetering en automatisering).
- `founder` — persoonlijke introductie en foto.
- `legal.*` en `legal.final` — juridische naam, adres, inschrijvingsnummer, en controle van privacyverklaring en algemene voorwaarden (tot dan `noindex` met conceptmelding).
- Logo: het logo is als vector nagebouwd op basis van de aangeleverde visuals. Vervang het bij voorkeur door het originele bronbestand (SVG/AI) en draai `npm run images`.
