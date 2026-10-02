// convert-cookies.js
// Converts a Cookie-Editor export into Playwright's storageState format.
// Usage: node convert-cookies.js cookies.json tiktok-session.json
//    (or instagram-session.json / youtube-session.json as the output name)
const fs = require('fs');
const [, , inputFile, outputFile] = process.argv;
if (!inputFile || !outputFile) { console.error('Usage: node convert-cookies.js <cookies.json> <output-session.json>'); process.exit(1); }

const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
function mapSameSite(value) {
  if (value === 'no_restriction') return 'None';
  if (value === 'lax') return 'Lax';
  if (value === 'strict') return 'Strict';
  return 'Lax';
}
const cookies = raw.map((c) => ({
  name: c.name, value: c.value, domain: c.domain, path: c.path || '/',
  expires: c.session ? -1 : Math.floor(c.expirationDate || -1),
  httpOnly: !!c.httpOnly, secure: !!c.secure, sameSite: mapSameSite(c.sameSite),
}));
fs.writeFileSync(outputFile, JSON.stringify({ cookies, origins: [] }, null, 2));
console.log(`Converted ${cookies.length} cookies -> ${outputFile}`);
console.log('You can now delete the input cookies file — it is no longer needed.');
