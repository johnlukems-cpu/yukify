// Tests voor de automatische redactie: kwaliteitscontrole, correcties, publicatiescript, social en rapport.
import { spawnSync } from 'node:child_process';
import { mkdir, rm, cp, readFile, writeFile, readdir } from 'node:fs/promises';
import { loadArticles, parseArticle, serializeArticle, isPublic } from '../lib/news.mjs';
import { qualityCheck, autofix, socialCheck, isOfficial, parseDutchDate, redactieConfig } from '../lib/quality.mjs';

const results = [];
const check = (cond, msg) => results.push({ ok: Boolean(cond), msg });
const NOW = new Date('2026-10-29T12:00:00Z');

const all = await loadArticles('content/nieuws');
const good = all.find((a) => a.slug === 'financiele-administratie-op-orde-7-controles');
const base = { ...good, status: 'concept', approvedBy: undefined, approvedAt: undefined };
const run = (a, opts = {}) => qualityCheck(a, { now: NOW, ...opts });
const has = (r, re) => r.errors.some((e) => re.test(e));

/* ---------- Kwaliteitscontrole ---------- */
check(run(base).ok, 'gepubliceerd voorbeeldartikel doorstaat de controle');
for (const slug of ['btw-aangifte-voorbereiden-fouten-voorkomen', 'ai-en-automatisering-financiele-administratie']) {
  const r = run(all.find((a) => a.slug === slug));
  check(!r.ok && has(r, /reviewNotes/), `${slug}: niet publiceerbaar, open punten blokkeren`);
}
const withBody = (body) => ({ ...base, body });
const srcLine = (url, date = '20 oktober 2026') => `- Bron, [Titel](${url}) — toelichting. Geraadpleegd op ${date}.`;
const bodyWith = (extra, sources) =>
  base.body.replace(/## Bronnen[\s\S]*$/, `${extra}\n\n## Bronnen\n\n${(sources || [srcLine('https://www.belastingdienst.nl/a'), srcLine('https://ondernemersplein.overheid.nl/b')]).join('\n')}\n`);

check(has(run({ ...base, factcheck: '' }), /Factcheck/), 'zonder factcheck: geblokkeerd');
check(has(run({ ...base, reviewNotes: 'Nog nagaan' }), /open punten/), 'open punten in reviewNotes: geblokkeerd');
check(has(run(withBody(bodyWith('', [srcLine('https://www.belastingdienst.nl/a')]))), /twee bronnen/), 'minder dan twee bronnen: geblokkeerd');
check(has(run(withBody(bodyWith('', [srcLine('https://www.accountant.nl/a'), srcLine('https://www.taxence.nl/b')]))), /officiële bron/), 'geen officiële bron: geblokkeerd');
check(has(run(withBody(bodyWith('', [srcLine('https://www.belastingdienst.nl/a'), srcLine('https://randomblog.example/b')]))), /niet op de lijst/), 'onbetrouwbaar brondomein: geblokkeerd');
check(has(run(withBody(bodyWith('', [srcLine('https://www.belastingdienst.nl/a', '1 augustus 2026'), srcLine('https://ondernemersplein.overheid.nl/b')]))), /langer dan 30 dagen/), 'verouderde broncontrole: geblokkeerd');
check(has(run(withBody(bodyWith('', ['- Bron, [Titel](https://www.belastingdienst.nl/a).', srcLine('https://ondernemersplein.overheid.nl/b')]))), /controledatum/), 'bron zonder controledatum: geblokkeerd');
check(has(run(withBody(bodyWith('', [srcLine('https://www.belastingdienst.nl/a', '30 november 2026'), srcLine('https://ondernemersplein.overheid.nl/b')]))), /toekomst/), 'controledatum in de toekomst: geblokkeerd');
check(has(run(withBody(bodyWith('Het tarief stijgt naar 23% voor alle ondernemers.'))), /Cijfer of bedrag/), 'percentage zonder bronlink: geblokkeerd');
check(!has(run(withBody(bodyWith('Het algemene tarief is 21% ([Belastingdienst](https://www.belastingdienst.nl/tarief)).'))), /Cijfer of bedrag/), 'percentage mét bronlink: toegestaan');
check(has(run(withBody(bodyWith('Vanaf 1 januari 2028 moeten alle facturen digitaal.'))), /Toekomstige datum/), 'toekomstige regel zonder status: geblokkeerd');
check(!has(run(withBody(bodyWith('Het kabinet wil dat vanaf 1 januari 2028 alle facturen digitaal zijn; dit is een voorstel.'))), /Toekomstige datum/), 'toekomstige regel als voorstel benoemd: toegestaan');
check(has(run(withBody(bodyWith('Mail jan.jansen@voorbeeld.nl voor vragen.'))), /E-mailadres/), 'persoonsgegeven (e-mail): geblokkeerd');
check(has(run(withBody(bodyWith('Betaal op NL91 ABNA 0417 1643 00.'))), /IBAN/), 'IBAN: geblokkeerd');
check(has(run(withBody(bodyWith('BSN 123456782 van de klant.'))), /BSN/), 'BSN-achtig nummer: geblokkeerd');
check(has(run(withBody(bodyWith('Bel 06-12345678 voor een afspraak.'))), /telefoonnummer/), 'telefoonnummer: geblokkeerd');
check(has(run(withBody(bodyWith('TODO: bron toevoegen.'))), /placeholder/), 'placeholder: geblokkeerd');
check(has(run(withBody(bodyWith('Met ons pakket bent u gegarandeerd van een correcte aangifte.'))), /stellige belofte/), 'garantieclaim: geblokkeerd');
check(has(run({ ...base, category: 'btw-en-belastingen' }), /algemene informatie/), 'fiscaal artikel zonder disclaimer: geblokkeerd');
check(has(run(withBody(bodyWith('', [srcLine('http://www.belastingdienst.nl/a'), srcLine('https://ondernemersplein.overheid.nl/b')]))), /https/), 'bron zonder https: geblokkeerd');
check(has(run(base, { others: [{ ...base, slug: 'ander' }] }), /dezelfde titel/), 'dubbele titel: geblokkeerd');
check(has(run({ ...base, body: base.body.replace('## Conclusie', '## Slot') }), /Conclusie/), 'zonder conclusie: geblokkeerd');
check(has(run({ ...base, body: base.body + '\n## Extra\n\nTekst.\n' }), /laatste sectie/), 'Bronnen niet als laatste sectie: geblokkeerd');
check(isOfficial('https://eur-lex.europa.eu/x') && isOfficial('https://wetten.overheid.nl/x') && !isOfficial('https://belastingdienst.nl.evil.example/x'), 'officiële domeinen: subdomeinen ja, nagemaakte domeinen nee');
check(parseDutchDate('29 oktober 2026')?.toISOString().startsWith('2026-10-29') && parseDutchDate('2026-10-29'), 'datums in tekst worden herkend');

const fx = autofix({ ...base, title: 'Titel  met  spaties .', description: 'Beschrijving zonder punt', body: 'Tekst  met  dubbele spaties , en meer.\n\n\n\nNieuwe alinea.   ' });
check(fx.article.title === 'Titel met spaties' && fx.article.description.endsWith('.') && !/ {2}/.test(fx.article.body) && !/\n{3}/.test(fx.article.body) && fx.article.body.includes('spaties, en'), `automatische taal-/opmaakcorrecties (${fx.fixes.length})`);

const url = 'https://www.yukifyadministratie.nl/nieuws/x/';
check(socialCheck('linkedin', `${'Tekst '.repeat(30)} ${url}`, url).length === 0, 'social: geldig LinkedIn-bericht');
check(socialCheck('linkedin', `${'Tekst '.repeat(30)}`, url).some((e) => /link/.test(e)), 'social: LinkedIn zonder artikellink geweigerd');
check(socialCheck('instagram', 'kort', url).length > 0, 'social: te kort bericht geweigerd');
check(socialCheck('facebook', `${'Tekst '.repeat(30)} ${url} mail piet@voorbeeld.nl`, url).some((e) => /e-mail/.test(e)), 'social: persoonsgegevens geweigerd');

/* ---------- Publicatiescript ---------- */
const T = 'test-results/redactie';
await rm(T, { recursive: true, force: true });
await mkdir(`${T}/nieuws`, { recursive: true });
await mkdir(`${T}/social`, { recursive: true });
await cp('content/nieuws', `${T}/nieuws`, { recursive: true });
// Testkopie van het goede artikel als concept
await writeFile(`${T}/nieuws/financiele-administratie-op-orde-7-controles.md`, serializeArticle({ ...base, approvedBy: undefined, approvedAt: undefined, date: undefined }));
const env = { NEWS_CONTENT_DIR: `${T}/nieuws`, SOCIAL_CONTENT_DIR: `${T}/social`, REPORT_DIR: `${T}/rapportages`, REDACTIE_NOW: NOW.toISOString() };
const cli = (args, extra = {}) => spawnSync(process.execPath, ['scripts/redactie.mjs', ...args], { env: { ...process.env, ...env, ...extra }, encoding: 'utf8' });
const read = async (slug) => parseArticle(await readFile(`${T}/nieuws/${slug}.md`, 'utf8'));

let r = cli(['publiceer', 'financiele-administratie-op-orde-7-controles']);
let a = await read('financiele-administratie-op-orde-7-controles');
check(r.status === 0 && a.status === 'gepubliceerd' && a.approvedBy === redactieConfig.editorName && a.date === '2026-10-29' && isPublic(a, NOW), 'publiceer: geslaagd artikel wordt gepubliceerd door de automatische redactie');
const before = await readFile(`${T}/nieuws/financiele-administratie-op-orde-7-controles.md`, 'utf8');
r = cli(['publiceer', 'financiele-administratie-op-orde-7-controles']);
check(r.status === 0 && /al gepubliceerd/.test(r.stdout) && before === (await readFile(`${T}/nieuws/financiele-administratie-op-orde-7-controles.md`, 'utf8')), 'publiceer: tweede keer = geen dubbele publicatie');
r = cli(['publiceer', 'btw-aangifte-voorbereiden-fouten-voorkomen']);
a = await read('btw-aangifte-voorbereiden-fouten-voorkomen');
check(r.status === 2 && a.status === 'concept' && /NIET gepubliceerd/.test(a.reviewNotes) && !a.approvedBy, 'publiceer: afgekeurd artikel blijft concept met lijst van wat ontbreekt');
await writeFile(`${T}/nieuws/ingepland-test.md`, serializeArticle({ ...base, slug: 'ingepland-test', title: 'Een tweede uniek testonderwerp voor inplannen', description: 'Unieke beschrijving voor het testen van ingeplande publicaties door de automatische redactie van Yukify.' }));
r = cli(['publiceer', 'ingepland-test', '--op', '2026-11-03T07:00:00Z']);
a = await read('ingepland-test');
check(r.status === 0 && a.status === 'ingepland' && a.publishAt === '2026-11-03T07:00:00.000Z' && !isPublic(a, NOW) && isPublic(a, new Date('2026-11-04')), 'publiceer --op: wordt ingepland en is pas daarna openbaar');
await writeFile(`${T}/nieuws/na-periode.md`, serializeArticle({ ...base, slug: 'na-periode', title: 'Nog een uniek testonderwerp na de periode', description: 'Beschrijving voor het testen van de einddatum van automatisch publiceren door de redactie van Yukify.' }));
r = cli(['publiceer', 'na-periode'], { REDACTIE_NOW: '2027-01-02T09:00:00Z' });
check(r.status === 3 && (await read('na-periode')).status === 'concept', 'publiceer: na de ingestelde einddatum wordt niets automatisch gepubliceerd');

// Social
const soc0 = JSON.parse(await readFile('content/social/financiele-administratie-op-orde-7-controles.json', 'utf8'));
for (const p of Object.values(soc0.platforms)) { p.status = 'concept'; delete p.approvedBy; delete p.approvedAt; }
soc0.platforms.facebook.text = 'te kort';
await writeFile(`${T}/social/financiele-administratie-op-orde-7-controles.json`, JSON.stringify(soc0));
r = cli(['social', 'financiele-administratie-op-orde-7-controles']);
const soc = JSON.parse(await readFile(`${T}/social/financiele-administratie-op-orde-7-controles.json`, 'utf8'));
check(soc.platforms.linkedin.status === 'goedgekeurd' && soc.platforms.instagram.status === 'goedgekeurd' && soc.platforms.facebook.status === 'concept' && soc.platforms.facebook.checkErrors?.length, 'social: geldige berichten klaar, afgekeurd bericht blijft concept met fout');
check(!JSON.stringify(soc).includes('"gepubliceerd"') && r.status === 2, 'social: niets wordt als geplaatst gemarkeerd zonder integratie');
await writeFile(`${T}/social/btw-aangifte-voorbereiden-fouten-voorkomen.json`, JSON.stringify({ article: 'btw-aangifte-voorbereiden-fouten-voorkomen', platforms: { linkedin: { text: 'x'.repeat(200), status: 'concept' } } }));
r = cli(['social', 'btw-aangifte-voorbereiden-fouten-voorkomen']);
check(r.status === 2 && JSON.parse(await readFile(`${T}/social/btw-aangifte-voorbereiden-fouten-voorkomen.json`, 'utf8')).platforms.linkedin.status === 'concept', 'social: geen berichten voor een niet-gepubliceerd artikel');

// Rapport
r = cli(['rapport', '--week', '2026-W44']);
const rep = await readFile(`${T}/rapportages/2026-W44.md`, 'utf8').catch(() => '');
check(r.status === 0 && rep.includes('Gepubliceerd deze week: 1') && rep.includes('NIET geplaatst') && rep.includes('niet beschikbaar'), 'rapport: weekrapport met publicaties, socialstatus en eerlijke melding over statistieken');

// Build-vangnet: automatisch gepubliceerd artikel dat niet (meer) door de controle komt → build faalt
await mkdir(`${T}/build-nieuws`, { recursive: true });
await writeFile(`${T}/build-nieuws/slecht.md`, serializeArticle({ ...base, slug: 'slecht', status: 'gepubliceerd', date: '2026-10-29', approvedBy: redactieConfig.editorName, approvedAt: NOW.toISOString(), factcheck: '' }));
r = spawnSync(process.execPath, ['scripts/build.mjs'], { env: { ...process.env, NEWS_CONTENT_DIR: `${T}/build-nieuws`, BUILD_OUT_DIR: `${T}/dist` }, encoding: 'utf8' });
check(r.status !== 0 && /kwaliteitscontrole/.test(r.stderr), 'build faalt als een automatisch gepubliceerd artikel de controle niet doorstaat');
// Echte content bouwt wel
check((await readdir('dist/nieuws')).includes('financiele-administratie-op-orde-7-controles'), 'echte build bevat het gepubliceerde artikel');

const failed = results.filter((x) => !x.ok);
for (const x of results) if (!x.ok || process.env.VERBOSE) console.log(`${x.ok ? '✔' : '✘'} ${x.msg}`);
console.log(`\nRedactie: ${results.length - failed.length}/${results.length} controles geslaagd.`);
process.exit(failed.length ? 1 : 0);
