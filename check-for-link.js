// check-for-link.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID;
const STATE_FILE = path.join(__dirname, 'telegram-link-state.json');
const EPISODES_FILE = path.join(__dirname, 'episodes.json');
const YOUTUBE_URL_REGEX = /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/i;

if (!BOT_TOKEN || !ALLOWED_CHAT_ID) { console.error('Missing Telegram env vars. Skipping.'); process.exit(0); }

function apiGet(method, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}${query ? '?' + query : ''}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''; res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}
function apiPost(method, body) {
  const payload = JSON.stringify(body);
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  return new Promise((resolve, reject) => {
    const req = require('https').request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, (res) => {
      let data = ''; res.on('data', (c) => (data += c)); res.on('end', () => resolve(data));
    });
    req.on('error', reject); req.write(payload); req.end();
  });
}
function sendMessage(text) { return apiPost('sendMessage', { chat_id: ALLOWED_CHAT_ID, text }); }
function loadJson(file, fallback) {
  if (fs.existsSync(file)) { try { return { ...fallback, ...JSON.parse(fs.readFileSync(file, 'utf-8')) }; } catch { return fallback; } }
  return fallback;
}
function saveJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

async function main() {
  const state = loadJson(STATE_FILE, { lastUpdateId: 0 });
  const episodes = loadJson(EPISODES_FILE, { queue: [] });
  const result = await apiGet('getUpdates', { offset: state.lastUpdateId + 1, timeout: 0 });
  if (!result.ok) { console.error('Telegram API error:', result.description || result); process.exit(0); }
  let maxUpdateId = state.lastUpdateId, found = 0;
  for (const update of result.result) {
    maxUpdateId = Math.max(maxUpdateId, update.update_id);
    const message = update.message;
    if (!message || !message.text) continue;
    if (String(message.chat.id) !== String(ALLOWED_CHAT_ID)) continue;
    const match = message.text.match(YOUTUBE_URL_REGEX);
    if (match) {
      episodes.queue.push({ url: match[0], status: 'pending', addedAt: new Date().toISOString() });
      found += 1;
      console.log(`Queued episode: ${match[0]}`);
    }
  }
  state.lastUpdateId = maxUpdateId;
  saveJson(STATE_FILE, state);
  saveJson(EPISODES_FILE, episodes);
  if (found > 0) await sendMessage(`Got ${found} new episode link(s). Processing starts next run.`);
  console.log(`Done. ${found} new episode(s) found.`);
}
main().catch((err) => { console.error('check-for-link.js failed:', err.message); process.exit(0); });
