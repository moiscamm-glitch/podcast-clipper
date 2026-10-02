// post-instagram.js
// Posts a video as an Instagram Reel, using the same browser-automation +
// saved-session approach as post.js (TikTok).
//
// IMPORTANT: Instagram's web upload flow changes often and is detected more
// aggressively than TikTok's — expect this to need fixing more frequently.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'instagram-session.json');
const FAILURE_SCREENSHOT = path.join(__dirname, 'instagram-failure.png');

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

async function postToInstagram(videoPath, caption) {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(`Missing ${SESSION_FILE}. Export your Instagram session first (same Cookie-Editor method as TikTok).`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();

  try {
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    if (page.url().includes('/accounts/login')) {
      throw new Error('Session expired — Instagram redirected to login. Re-export the session.');
    }

    await dismissIfPresent(page, /Not Now/i);

    const createButton = page.getByRole('link', { name: /New post|Create/i }).first();
    await createButton.click();
    await page.waitForTimeout(2000);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(videoPath);
    await page.waitForTimeout(8000);

    for (let i = 0; i < 2; i++) {
      const nextBtn = page.getByRole('button', { name: /^Next$/i });
      await nextBtn.click();
      await page.waitForTimeout(3000);
    }

    const captionBox = page.locator('div[aria-label="Write a caption..."]').first();
    await captionBox.click();
    await captionBox.type(caption, { delay: 30 });

    const shareBtn = page.getByRole('button', { name: /^Share$/i });
    await shareBtn.click();
    await page.waitForTimeout(10000);

    console.log('Posted to Instagram.');
  } catch (err) {
    await page.screenshot({ path: FAILURE_SCREENSHOT, fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

module.exports = { postToInstagram };
