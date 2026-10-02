// post-youtube.js
// Posts a video as a YouTube Short, using the same browser-automation +
// saved-session approach as TikTok and Instagram.
//
// IMPORTANT: Like Instagram, this is the browser-trick method, not YouTube's
// official upload API — expect it to need occasional fixing as YouTube
// updates their upload page.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'youtube-session.json');
const FAILURE_SCREENSHOT = path.join(__dirname, 'youtube-failure.png');

async function dismissIfPresent(page, name, timeout = 3000) {
  const btn = page.getByRole('button', { name });
  const visible = await btn.first().isVisible({ timeout }).catch(() => false);
  if (visible) {
    await btn.first().click().catch(() => {});
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

async function postToYouTube(videoPath, title, description) {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(`Missing ${SESSION_FILE}. Export your YouTube/Google session first (same Cookie-Editor method as TikTok).`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();

  try {
    await page.goto('https://www.youtube.com/upload', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    if (page.url().includes('accounts.google.com')) {
      throw new Error('Session expired — redirected to Google login. Re-export the session.');
    }

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(videoPath);
    await page.waitForTimeout(10000);

    // Title field
    const titleBox = page.locator('#textbox').first();
    await titleBox.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await titleBox.type(title, { delay: 30 });

    // Description field (second textbox on the details page)
    const descBox = page.locator('#textbox').nth(1);
    await descBox.click();
    await descBox.type(description, { delay: 20 });

    await page.waitForTimeout(1500);

    // "Made for Kids" step — select "No" (standard for this kind of content; change if needed)
    const notMadeForKids = page.getByRole('radio', { name: /No, it's not/i });
    if (await notMadeForKids.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notMadeForKids.click();
    }

    // Click through "Next" steps (details -> video elements -> checks -> visibility)
    for (let i = 0; i < 3; i++) {
      const nextBtn = page.getByRole('button', { name: /^Next$/i });
      await nextBtn.click();
      await page.waitForTimeout(2000);
    }

    // Set visibility to Public
    const publicRadio = page.getByRole('radio', { name: /Public/i });
    await publicRadio.click();

    const publishBtn = page.getByRole('button', { name: /Publish|Done/i });
    await publishBtn.click();
    await page.waitForTimeout(10000);

    console.log('Posted to YouTube Shorts.');
  } catch (err) {
    await page.screenshot({ path: FAILURE_SCREENSHOT, fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

module.exports = { postToYouTube };
