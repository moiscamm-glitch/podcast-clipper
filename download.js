// download.js
const { execSync } = require('child_process');
const url = process.argv[2];
const outputPath = process.argv[3] || 'source.mp4';
if (!url) { console.error('Usage: node download.js <youtube-url> [output.mp4]'); process.exit(1); }
const cmd = `yt-dlp -f "best[ext=mp4]/best" -o "${outputPath}" "${url}"`;
console.log('Running:', cmd);
execSync(cmd, { stdio: 'inherit' });
console.log(`Downloaded to ${outputPath}`);
