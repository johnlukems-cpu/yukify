// Controleert de e-mailinstellingen van het contactformulier zonder geheimen te tonen.
// Gebruik:  node --env-file=.env.local scripts/check-mail.mjs          (alleen inloggen testen)
//           node --env-file=.env.local scripts/check-mail.mjs --send   (ook een testbericht naar MAIL_TO sturen)
// .env.local nooit committen; deze staat in .gitignore.
const { checkMail, mailSummary } = await import('../lib/contact.mjs');

console.log(`Afzender: ${mailSummary.from}\nOntvanger: ${mailSummary.to}\nPoort: ${mailSummary.port} (${mailSummary.secure ? 'TLS' : 'STARTTLS'})`);
const result = await checkMail({ sendTest: process.argv.includes('--send') });
console.log(`${result.ok ? 'OK' : 'MISLUKT'} — stap: ${result.step}${result.detail ? ' — ' + result.detail : ''}`);
process.exit(result.ok ? 0 : 1);
