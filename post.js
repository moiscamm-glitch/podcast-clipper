// post.js
// Posts a given video file to TikTok with a given caption.
// Usage: node post.js <videoPath> <caption>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'tiktok-session.json');
const FAILURE_SCREENSHOT = path.join(__dirname, 'tiktok-failure.png');

async function dismissIfPresent(page, name, timeout = 3000) {
  const btn = page.getByRole('button', { name });
  const visible = await btn.first().isVisible({ timeout }).catch(() => false);
  if (visible) { await btn.first().click().catch(() => {}); await page.waitForTimeout(500); return true; }
  return false;
}

async function postToTikTok(videoPath, caption) {
  if (!fs.existsSync(SESSION_FILE)) throw new Error(`Missing ${SESSION_FILE}.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();

  try {
    await page.goto('https://www.tiktok.com/tiktokstudio/upload?lang=en', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    if (page.url().includes('/login')) throw new Error('Session expired.');

    await page.locator('input[type="file"]').setInputFiles(videoPath);
    await page.waitForTimeout(15000);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1500);

    const captionBox = page.locator('div[contenteditable="true"]').first();
    await captionBox.click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await captionBox.type(caption, { delay: 50 });

    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1000);
    await page.mouse.click(20, 20).catch(() => {});
    await page.waitForTimeout(1000);
    await dismissIfPresent(page, /^Cancel$/i);
    await dismissIfPresent(page, /Got it/i);
    await page.waitForTimeout(1000);

    const postButton = page.getByRole('button', { name: /Post/i }).last();
    await postButton.scrollIntoViewIfNeeded();
    await postButton.click({ force: true });
    await page.waitForTimeout(15000);
    console.log('Posted to TikTok.');
  } catch (err) {
    await page.screenshot({ path: FAILURE_SCREENSHOT, fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  const [, , videoPath, caption] = process.argv;
  if (!videoPath || !caption) { console.error('Usage: node post.js <video> <caption>'); process.exit(1); }
  postToTikTok(videoPath, caption).catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { postToTikTok };
