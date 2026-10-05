#!/usr/bin/env node
/**
 * Re-render the 2D fallback poster pod/worlds/boards/cogs-poster.webp
 * from the final 3D board at rest.
 */

const path = require('node:path');
const fs = require('node:fs').promises;
const sharp = require('sharp');

const PORT = '5197';
const TARGET_WIDTH = 1024;
const VIEWPORT = { width: 1400, height: 1900, deviceScaleFactor: 1 };
const URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_PATH = path.join(__dirname, '..', 'pod', 'worlds', 'boards', 'cogs-poster.webp');

async function main() {
  // Set environment and start preview server in-process
  process.env.MYR5_GRIMOIRE_PORT = PORT;
  const server = require('./mechanical-grimoire-preview.cjs');

  // Wait briefly for server to start
  await new Promise(r => setTimeout(r, 100));

  let browser, page;
  try {
    // Launch playwright
    const { chromium } = require('playwright');
    browser = await chromium.launch();
    page = await browser.newPage();

    // Set viewport
    await page.setViewportSize(VIEWPORT);

    // Navigate
    await page.goto(URL, { waitUntil: 'networkidle' });

    // Wait until window.board exists, window.errors.length === 0, plus 1500 ms
    await page.waitForFunction(() => {
      return window.board && window.errors.length === 0;
    }, { timeout: 10000 });

    await new Promise(r => setTimeout(r, 1500));

    // Screenshot the #board canvas element
    const boardElement = await page.$('#board');
    if (!boardElement) {
      throw new Error('#board element not found');
    }

    const screenshot = await boardElement.screenshot({ type: 'png' });

    // Convert to webp with sharp, resize to width 1024 keeping aspect
    const sharpImage = sharp(screenshot);
    const metadata = await sharpImage.metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    const newHeight = Math.round((TARGET_WIDTH / originalWidth) * originalHeight);

    const webpBuffer = await sharpImage
      .resize(TARGET_WIDTH, newHeight, {
        fit: 'fill',
        withoutEnlargement: false,
      })
      .webp({ quality: 82 })
      .toBuffer();

    // Write output
    await fs.writeFile(OUTPUT_PATH, webpBuffer);

    // Report
    const stats = await fs.stat(OUTPUT_PATH);
    console.log(`Poster regenerated: ${TARGET_WIDTH}x${newHeight} (${stats.size} bytes)`);

  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
