// download-drive.js
// Downloads a video from a Google Drive share link (file must be set to
// "Anyone with the link can view"). No login, no API key, no signup needed.
//
// Handles Google's "this file is large, can't scan it for viruses" warning
// page that normally blocks a simple download for bigger files.
//
// Usage: node download-drive.js "<drive-share-link>" output.mp4

const { execSync } = require('child_process');
const fs = require('fs');

const shareLink = process.argv[2];
const outputPath = process.argv[3] || 'source.mp4';

if (!shareLink) {
  console.error('Usage: node download-drive.js <drive-share-link> [output.mp4]');
  process.exit(1);
}

function extractFileId(link) {
  // Matches /file/d/FILE_ID/ or ?id=FILE_ID
  const pathMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];
  const queryMatch = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  throw new Error(`Could not find a file ID in this link: ${link}`);
}

const fileId = extractFileId(shareLink);
console.log(`Extracted file ID: ${fileId}`);

const cookieJar = '/tmp/gdrive-cookies.txt';

// Step 1: hit the file once to get Google's confirmation token (needed for
// files too large to virus-scan, which is most videos).
const probeCmd = `curl -sc "${cookieJar}" "https://drive.google.com/uc?export=download&id=${fileId}" > /tmp/gdrive-probe.html`;
console.log('Running:', probeCmd);
execSync(probeCmd, { stdio: 'inherit', shell: '/bin/bash' });

const probeHtml = fs.readFileSync('/tmp/gdrive-probe.html', 'utf-8');
const tokenMatch = probeHtml.match(/confirm=([0-9A-Za-z_-]+)/);

let downloadCmd;
if (tokenMatch) {
  const token = tokenMatch[1];
  console.log(`Found confirmation token: ${token}`);
  downloadCmd = `curl -Lb "${cookieJar}" "https://drive.google.com/uc?export=download&confirm=${token}&id=${fileId}" -o "${outputPath}"`;
} else {
  // Small file — no confirmation page needed, the probe response IS the file.
  console.log('No confirmation token needed — small file, downloading directly.');
  downloadCmd = `curl -Lb "${cookieJar}" "https://drive.google.com/uc?export=download&id=${fileId}" -o "${outputPath}"`;
}

console.log('Running:', downloadCmd);
execSync(downloadCmd, { stdio: 'inherit', shell: '/bin/bash' });

// Sanity check: if Google returned an HTML error page instead of a video,
// the file is probably not actually publicly shared.
const stats = fs.statSync(outputPath);
if (stats.size < 100000) {
  const content = fs.readFileSync(outputPath, 'utf-8').slice(0, 200);
  if (content.includes('<html') || content.includes('<!DOCTYPE')) {
    throw new Error(
      'Download failed — got an HTML page instead of a video. Make sure the Drive file sharing is set to "Anyone with the link can view".'
    );
  }
}

console.log(`Downloaded to ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
