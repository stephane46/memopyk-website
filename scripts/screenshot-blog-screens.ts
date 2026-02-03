import { chromium } from 'playwright';

const BASE_URL = 'https://memopyk.memopyk.com/en-US';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const SCREENS = [
  { tab: 'blog', name: 'hub' },
  { tab: 'planner', name: 'planner' },
  { tab: 'topics', name: 'topics' },
  { tab: 'posts', name: 'posts' },
  { tab: 'images', name: 'images' },
  { tab: 'keywords', name: 'keywords' },
];

async function captureScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // Login first
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });

  // Accept cookies if banner appears
  try {
    const acceptButton = page.locator('button:has-text("Accept all")');
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      await acceptButton.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // No cookie banner, continue
  }

  // Enter password and login
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Access Admin Panel")');
  await page.waitForTimeout(2000);
  console.log('Logged in!');

  for (const screen of SCREENS) {
    const url = `${BASE_URL}/admin?tab=${screen.tab}`;
    console.log(`Capturing: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: `docs/help/screenshots/blog/${screen.name}.png`,
      fullPage: false
    });
  }

  await browser.close();
  console.log('Done! Screenshots saved to screenshots/');
}

captureScreenshots();
