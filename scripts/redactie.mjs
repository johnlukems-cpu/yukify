// Automatische redactie voor Nieuws & Inzichten (gebruikt door de geplande redactiesessies).
//
//   node scripts/redactie.mjs controleer [slug…]       Taal-/opmaakcorrecties tonen en kwaliteitscontrole draaien
//   node scripts/redactie.mjs publiceer <slug> [--op ISO]  Corrigeren, controleren en bij succes publiceren (of inplannen)
//   node scripts/redactie.mjs social <slug>             Socialmediateksten controleren en klaarzetten (niet plaatsen)
//   node scripts/redactie.mjs rapport [--week JJJJ-Www]  Weekrapport schrijven naar rapportages/
//
// Publiceren gebeurt uitsluitend door het artikelbestand bij te werken; de commit + push naar main laat Vercel
// de site opnieuw bouwen. De build controleert automatisch gepubliceerde artikelen nogmaals (zie scripts/build.mjs).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadArticles, serializeArticle, isPublic, publicationDate, NEWS_DIR, SOCIAL_DIR, statusLabel } from '../lib/news.mjs';
import { autofix, qualityCheck, socialCheck, redactieConfig as cfg } from '../lib/quality.mjs';
import { amsterdamDate } from '../lib/admin/workflow.mjs';
import site from '../site.config.mjs';

const root = new URL('..', import.meta.url).pathname;
const newsDir = join(root, process.env.NEWS_CONTENT_DIR || NEWS_DIR);
const socialDir = join(root, process.env.SOCIAL_CONTENT_DIR || SOCIAL_DIR);
const reportDir = join(root, process.env.REPORT_DIR || 'rapportages');
const now = process.env.REDACTIE_NOW ? new Date(process.env.REDACTIE_NOW) : new Date();
const [cmd, ...args] = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const all = await loadArticles(newsDir);
const bySlug = (slug) => {
  const a = all.find((x) => x.slug === slug);
  if (!a) fail(`Onbekend artikel: ${slug}`);
  return a;
};
function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}
const save = (a) => writeFile(join(newsDir, `${a.slug}.md`), serializeArticle(a));
const articleUrl = (slug) => `${site.url}/nieuws/${slug}/`;
const autopublishAllowed = () => cfg.autopublish === true && amsterdamDate(now) <= cfg.autopublishUntil;

function report(a, fixes, result) {
  console.log(`\n${a.slug} — ${result.ok ? 'GESLAAGD' : 'NIET GESLAAGD'}`);
  for (const f of fixes) console.log(`  correctie: ${f}`);
  for (const e of result.errors) console.log(`  ✘ ${e}`);
  for (const w of result.warnings) console.log(`  ! ${w}`);
}

if (cmd === 'controleer') {
  const list = args.length ? args.map(bySlug) : all.filter((a) => !isPublic(a, now));
  let ok = true;
  for (const a of list) {
    const { article, fixes } = autofix(a);
    const r = qualityCheck(article, { now, others: all.filter((o) => isPublic(o, now)) });
    report(a, fixes, r);
    ok &&= r.ok;
  }
  process.exit(ok ? 0 : 1);
}

if (cmd === 'publiceer') {
  const a = bySlug(args[0]);
  if (isPublic(a, now) || a.status === 'ingepland') {
    console.log(`${a.slug} is al ${statusLabel[a.status].toLowerCase()}; niets gedaan (geen dubbele publicatie).`);
    process.exit(0);
  }
  if (!autopublishAllowed()) fail(`Automatisch publiceren staat uit of de periode (t/m ${cfg.autopublishUntil}) is voorbij. Zie content/redactie.json.`, 3);
  const { article, fixes } = autofix(a);
  const r = qualityCheck(article, { now, others: all.filter((o) => isPublic(o, now)) });
  report(a, fixes, r);
  if (!r.ok) {
    // Niet publiceren: concept houden en vastleggen wat ontbreekt.
    const notes = [`Automatische controle ${amsterdamDate(now)}: NIET gepubliceerd. Ontbreekt of onjuist:`, ...r.errors.map((e) => `- ${e}`)].join('\n');
    await save({ ...article, status: 'concept', reviewNotes: notes, approvedBy: undefined, approvedAt: undefined });
    fail(`\n${a.slug} blijft concept; de punten staan in reviewNotes.`, 2);
  }
  const at = flag('--op');
  const when = at ? new Date(at) : now;
  if (Number.isNaN(when.getTime())) fail('Ongeldig tijdstip bij --op.');
  const scheduled = when.getTime() > now.getTime() + 60_000;
  await save({
    ...article,
    status: scheduled ? 'ingepland' : 'gepubliceerd',
    date: amsterdamDate(when),
    publishAt: scheduled ? when.toISOString() : undefined,
    approvedBy: cfg.editorName,
    approvedAt: now.toISOString(),
    reviewNotes: undefined,
  });
  console.log(`\n${a.slug}: ${scheduled ? `ingepland voor ${when.toISOString()}` : 'gepubliceerd'} → ${articleUrl(a.slug)}`);
  process.exit(0);
}

if (cmd === 'social') {
  const a = bySlug(args[0]);
  const file = join(socialDir, `${a.slug}.json`);
  const social = JSON.parse(await readFile(file, 'utf8').catch(() => fail(`Geen socialmediabestand: ${file}`)));
  if (!isPublic(a, now) && a.status !== 'ingepland') fail('Het artikel is (nog) niet gepubliceerd of ingepland; berichten worden niet klaargezet.', 2);
  let ok = true;
  for (const [platform, p] of Object.entries(social.platforms || {})) {
    if (p.status !== 'concept') continue;
    const errors = socialCheck(platform, p.text, articleUrl(a.slug));
    if (errors.length) {
      ok = false;
      p.checkErrors = errors;
      console.log(`✘ ${errors.join(' ')}`);
    } else {
      delete p.checkErrors;
      // "Goedgekeurd" = klaar voor plaatsing door een geautoriseerde integratie. Er wordt hier niets geplaatst.
      Object.assign(p, { status: 'goedgekeurd', approvedBy: cfg.editorName, approvedAt: now.toISOString() });
      console.log(`✔ ${platform}: klaar voor plaatsing (wacht op een gekoppelde integratie)`);
    }
  }
  await writeFile(file, `${JSON.stringify(social, null, 2)}\n`);
  process.exit(ok ? 0 : 2);
}

if (cmd === 'rapport') {
  const week = flag('--week') || isoWeek(now);
  const [y, w] = week.split('-W').map(Number);
  const start = isoWeekStart(y, w);
  const end = new Date(start.getTime() + 7 * 86400000);
  const inWeek = (d) => d && new Date(`${d}T12:00:00Z`) >= start && new Date(`${d}T12:00:00Z`) < end;
  const pub = all.filter((a) => isPublic(a, now));
  const published = pub.filter((a) => inWeek(publicationDate(a)));
  const scheduled = all.filter((a) => a.status === 'ingepland' && !isPublic(a, now));
  const drafts = all.filter((a) => !isApproved(a));
  const socials = [];
  for (const f of await readdir(socialDir).catch(() => [])) {
    if (!f.endsWith('.json')) continue;
    const s = JSON.parse(await readFile(join(socialDir, f), 'utf8'));
    for (const [platform, p] of Object.entries(s.platforms || {})) socials.push({ article: s.article, platform, ...p });
  }
  const count = (st) => socials.filter((s) => s.status === st).length;
  const deploy = deployStatus();
  const lines = [
    `# Weekrapport Nieuws & Inzichten — ${week}`,
    '',
    `Periode: ${start.toISOString().slice(0, 10)} t/m ${new Date(end.getTime() - 86400000).toISOString().slice(0, 10)}. Gegenereerd: ${now.toISOString()}.`,
    '',
    '## Website',
    '',
    `- Gepubliceerd deze week: ${published.length}`,
    ...published.map((a) => `  - [${a.title}](${articleUrl(a.slug)}) (${publicationDate(a)}, ${a.approvedBy === cfg.editorName ? 'automatisch' : 'handmatig'})`),
    `- Ingepland: ${scheduled.length}`,
    ...scheduled.map((a) => `  - ${a.title} — ${a.publishAt}`),
    `- Totaal openbaar: ${pub.length}`,
    `- Concepten / niet door de controle: ${drafts.length}`,
    ...drafts.map((a) => `  - ${a.title}: ${String(a.reviewNotes || 'geen notities').split('\n')[0]}`),
    `- Laatste productiedeploy: ${deploy}`,
    '',
    '## Sociale media',
    '',
    `- Klaar voor plaatsing (goedgekeurd door de controle): ${count('goedgekeurd')}`,
    `- Geplaatst (met link vastgelegd): ${count('gepubliceerd')}`,
    `- Concept/afgekeurd: ${count('concept')}`,
    ...socials.filter((s) => s.status === 'gepubliceerd').map((s) => `  - ${s.platform}: ${s.publishedUrl}`),
    count('goedgekeurd') ? '- Let op: er is nog geen geautoriseerde integratie gekoppeld; klaarstaande berichten zijn NIET geplaatst.' : '',
    '',
    '## Statistieken',
    '',
    '- Bezoekersstatistieken: niet beschikbaar (geen analytics-koppeling voor de redactie).',
    '',
  ];
  await mkdir(reportDir, { recursive: true });
  const out = join(reportDir, `${week}.md`);
  await writeFile(out, lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n'));
  console.log(`Rapport geschreven: ${out}`);
  process.exit(0);
}

function isApproved(a) {
  return ['goedgekeurd', 'ingepland', 'gepubliceerd'].includes(a.status) && a.approvedBy && a.approvedAt;
}
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function isoWeekStart(y, w) {
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const day = jan4.getUTCDay() || 7;
  return new Date(Date.UTC(y, 0, 4 - day + 1 + (w - 1) * 7));
}
function deployStatus() {
  try {
    const sha = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: root, encoding: 'utf8' }).trim();
    const out = execFileSync('gh', ['api', `repos/johnlukems-cpu/yukify/commits/${sha}/status`, '--jq', '.state + " (" + (.statuses[0].description // "") + ")"'], { encoding: 'utf8', timeout: 15000 }).trim();
    return `${sha.slice(0, 7)}: ${out}`;
  } catch {
    return 'onbekend (status niet op te vragen)';
  }
}

fail('Gebruik: node scripts/redactie.mjs controleer|publiceer|social|rapport …');
