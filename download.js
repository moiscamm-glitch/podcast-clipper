// download.js
// Downloads a YouTube video by URL using yt-dlp.
// If youtube-session.json (Playwright format, from Cookie-Editor) exists in
// this folder, it's automatically converted to the cookie format yt-dlp
// needs and passed along — this proves to YouTube we're a real logged-in
// user, avoiding the "Sign in to confirm you're not a bot" block.
//
// Usage: node download.js "https://youtube.com/watch?v=..." output.mp4

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const url = process.argv[2];
const outputPath = process.argv[3] || 'source.mp4';
const SESSION_FILE = path.join(__dirname, 'youtube-session.json');
const NETSCAPE_COOKIES_FILE = path.join(__dirname, 'work', 'youtube-cookies.txt');

if (!url) {
  console.error('Usage: node download.js <youtube-url> [output.mp4]');
  process.exit(1);
}

function convertSessionToNetscape() {
  const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
  const lines = ['# Netscape HTTP Cookie File'];

  for (const c of session.cookies || []) {
    const includeSubdomains = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    // yt-dlp ignores session cookies (expires = -1) if written as -1, so give
    // them a far-future expiry instead — they're short-lived anyway and this
    // just lets yt-dlp use them for this one run.
    const expires = c.expires && c.expires > 0 ? Math.floor(c.expires) : 2147483647;
    lines.push([c.domain, includeSubdomains, c.path || '/', secure, expires, c.name, c.value].join('\t'));
  }

  fs.mkdirSync(path.dirname(NETSCAPE_COOKIES_FILE), { recursive: true });
  fs.writeFileSync(NETSCAPE_COOKIES_FILE, lines.join('\n') + '\n');
  return NETSCAPE_COOKIES_FILE;
}

let cookiesFlag = '';
if (fs.existsSync(SESSION_FILE)) {
  console.log('Found youtube-session.json — using it to authenticate the download.');
  const cookiesPath = convertSessionToNetscape();
  cookiesFlag = `--cookies "${cookiesPath}"`;
} else {
  console.log('No youtube-session.json found — downloading without authentication (more likely to be blocked).');
}

const cmd = `yt-dlp ${cookiesFlag} -f "best[ext=mp4]/best" -o "${outputPath}" "${url}"`;
console.log('Running:', cmd);
execSync(cmd, { stdio: 'inherit' });
console.log(`Downloaded to ${outputPath}`);