// Maakt lokaal een hash voor ADMIN_PASSWORD_HASH. Het wachtwoord wordt niet opgeslagen of getoond.
// Gebruik: npm run beheer:wachtwoord  (daarna de uitvoer als Vercel-omgevingsvariabele instellen)
import { createInterface } from 'node:readline';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../lib/admin/auth.mjs';

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = (s) => rl.output.write(s.includes('Wachtwoord') ? s : '');
rl.question('Wachtwoord (min. 12 tekens): ', (pw) => {
  rl.close();
  process.stdout.write('\n');
  if (pw.length < 12) {
    console.error('Te kort: kies minimaal 12 tekens.');
    process.exit(1);
  }
  console.log(`ADMIN_PASSWORD_HASH=${hashPassword(pw)}`);
  console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString('base64url')}   (alleen nodig bij eerste installatie)`);
});
