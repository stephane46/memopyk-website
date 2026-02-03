import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loginToAdmin, config } from './helpers/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Contenu Site pages to screenshot
const contenuSitePages = [
  { id: 'hero-management', name: 'Videos Hero' },
  { id: 'gallery', name: 'Galerie Videos' },
  { id: 'faq', name: 'FAQ' },
  { id: 'why-memopyk', name: 'Pourquoi MEMOPYK' },
  { id: 'cta', name: 'Boutons CTA' },
  { id: 'legal-docs', name: 'Documents Legaux' },
];

test.describe('Contenu Site Discovery Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  for (const pageDef of contenuSitePages) {
    test(`Screenshot: ${pageDef.name}`, async ({ page }) => {
      // Navigate to the page via sidebar click
      const sidebar = page.locator('.bg-gray-900.fixed');

      // Click "Contenu Site" to expand it
      await sidebar.getByText('Contenu Site').click();
      await page.waitForTimeout(300);

      // Click the specific menu item
      await sidebar.getByText(pageDef.name.replace('Videos', 'Vidéos').replace('Legaux', 'Légaux')).click();

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Take full page screenshot
      const screenshotDir = path.join(__dirname, '../../docs/screenshots/contenu-site');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      await page.screenshot({
        path: path.join(screenshotDir, `${pageDef.id}.png`),
        fullPage: true
      });

      console.log(`Screenshot saved: ${pageDef.id}.png`);
    });
  }
});
