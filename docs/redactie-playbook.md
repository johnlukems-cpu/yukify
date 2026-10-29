# Draaiboek automatische redactie (voor geplande Claude-sessies)

Dit draaiboek wordt gevolgd door de geplande redactiesessies. Het is de enige bron van instructies voor die sessies; wijzigingen in de werkwijze worden hier vastgelegd.

## Altijd eerst

1. Werk in de repository `johnlukems-cpu/yukify` op branch `main`: `git fetch origin main && git checkout main && git reset --hard origin/main && npm ci`.
2. Lees `content/redactie.json`. Staat `autopublish` op `false` of ligt de datum van vandaag (Europe/Amsterdam) ná `autopublishUntil`, publiceer dan niets. Maak alleen eventueel het weekrapport.
3. Lees de bestaande artikelen (`content/nieuws/*.md`) om dubbele onderwerpen te voorkomen.

## Run "artikel" (twee keer per week)

1. **Onderzoek.** Zoek actuele ontwikkelingen (laatste 4 weken) in Nederlandse accountancy, financiële administratie, btw, loonadministratie, jaarafsluiting, boekhoudsoftware en automatisering die relevant zijn voor mkb-ondernemers en administratie- en accountantskantoren. Kies één onderwerp dat past bij Yukify en nog niet behandeld is. Is er geen geschikt actueel onderwerp, kies dan een tijdloos praktisch onderwerp, zoals een checklist of uitleg, dat met officiële bronnen te onderbouwen is.
2. **Bronnen controleren.**
   - Gebruik primaire bronnen: Belastingdienst, Rijksoverheid, wetten.overheid.nl, Ondernemersplein, KVK, EUR-Lex, AP, AFM of NBA.
   - Aanvullend mag vakpers die in `content/redactie.json` staat.
   - Lees de bron zelf: via WebFetch, of via zoekresultaten die de inhoud van de officiële pagina tonen.
   - Noteer per bron "Geraadpleegd op <datum>" en de publicatie- of wijzigingsdatum als die bekend is.
   - Een claim die alleen in secundaire bronnen te vinden is, is **onbevestigd**.
3. **Schrijven** in het Nederlands, in de u-vorm, zakelijk en praktisch, 600–1200 woorden.
   - **Opbouw:** introductie, minimaal drie `##`-tussenkoppen, waar zinvol een checklist (`- [ ]`), `## Conclusie` en als laatste `## Bronnen`.
   - **Interne link:** neem minimaal één link op naar een dienstpagina, bijvoorbeeld `/diensten/#financiele-administratie`, `/administratiekantoren/` of `/mkb/`.
   - **Cijfers en bedragen** krijgen een bronlink in dezelfde alinea.
   - **Toekomstige regels** krijgen altijd hun status: geldend, aangenomen of vastgesteld, voorstel of plan, of verwachting.
   - **Fiscale onderwerpen** krijgen de zin: "Dit artikel bevat algemene informatie en is geen persoonlijk fiscaal advies."
   - **Nooit verzinnen:** geen statistieken, citaten, regelgeving of bronnen.
   - **Geen persoonsgegevens** of klantinformatie.
4. **Bestand.** Schrijf het artikel naar `content/nieuws/<slug>.md` met status `concept`.
   - Gebruik een bestaand artikel als voorbeeld voor de frontmatter, met deze velden: `title`, `slug`, `category`, `description` (110–160 tekens), `intro`, `imageAlt`, `author: "Yukify Administratie & Support"` en `factcheck: |`.
   - In `factcheck` komt één regel per kernclaim: welke bron de claim bevestigt en wanneer die is gecontroleerd.
   - Wat onzeker is, komt in `reviewNotes: |`.
5. **Controleren en publiceren.** Draai `node scripts/redactie.mjs publiceer <slug>`. Of plan het artikel in met `--op <ISO-tijd>` (geschikte momenten: dinsdag of donderdag tussen 07:00 en 09:00 Nederlandse tijd).
   - Exitcode 0 betekent gepubliceerd of ingepland.
   - Exitcode 2 betekent niet geslaagd. Het artikel blijft concept met de redenen in `reviewNotes`. Los alleen op wat met betrouwbare bronnen op te lossen is en probeer het opnieuw. Lukt dat niet, laat het artikel als concept staan. **Nooit** controles omzeilen of `reviewNotes` leegmaken zonder het punt echt op te lossen.
   - Probeer ook bestaande concepten opnieuw als hun open punten nu op te lossen zijn.
6. **Socialmedia.** Schrijf `content/social/<slug>.json` met eigen teksten voor `linkedin` (150–3000 tekens, met de artikellink), `facebook` (100–2000 tekens, met de artikellink) en `instagram` (100–2200 tekens, "link in bio", maximaal 6 hashtags). Alle drie krijgen status `concept`. Draai daarna `node scripts/redactie.mjs social <slug>`.
   - Er is nog **geen** geautoriseerde integratie gekoppeld. Plaats dus niets en markeer niets als geplaatst. Berichten met de status "goedgekeurd" staan klaar in de wachtrij.
7. **Testen.** Draai `npm test`. Faalt er iets, herstel dan de oorzaak of zet het artikel terug naar concept. Push nooit met falende tests.
8. **Commit en push** naar `main`: één commit per run, met een bericht als `Nieuws: <titel> (automatische redactie)`. Gebruik `git pull --rebase origin main` vóór de push. Nooit force-pushen. Bij een conflict: opnieuw beginnen vanaf stap 1.
9. **Controle.** Wacht op de Vercel-status van de commit: `gh api repos/johnlukems-cpu/yukify/commits/<sha>/status`. Is die `failure`, zoek de oorzaak (meestal de buildcontrole), herstel met een nieuwe commit en noteer de fout in het weekrapport. De live site is vanuit de sessie mogelijk niet bereikbaar. Verzin dan geen controle, maar meld het.

## Run "weekrapport" (maandag)

1. Draai `node scripts/redactie.mjs rapport`. Dat maakt het rapport over de afgelopen ISO-week; gebruik `--week JJJJ-Www` als het om de vorige week moet gaan.
2. Vul het rapport aan met:
   - de onderwerpen van de week en de afgekeurde concepten met reden;
   - fouten uit de deploys;
   - de status van de socialmediaberichten, zonder geplaatste berichten te veinzen;
   - aanbevelingen.
3. Commit en push naar `main` (`rapportages/<week>.md`). Let op: de repository is openbaar, dus zet geen vertrouwelijke gegevens in het rapport.
4. Onderhoud: los kleine fouten in de contentworkflow op, en houd dit draaiboek en `docs/redactie-workflow.md` actueel. Draai altijd eerst `npm test`.

## Grenzen

- Raak geen geheimen, DNS of Vercel-instellingen aan. Verander niets aan de beveiliging van `/beheer`.
- Geen wijzigingen aan de kwaliteitsregels in `lib/quality.mjs` om een artikel erdoor te krijgen. Regels mogen alleen strenger worden, of verbeterd bij een aantoonbare fout, en dan met tests.
- Na `autopublishUntil` niets meer publiceren.
