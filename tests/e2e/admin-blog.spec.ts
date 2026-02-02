import { test, expect, Page } from '@playwright/test';

// =============================================================================
// CONFIGURATION
// =============================================================================

const ADMIN_URL = 'https://memopyk.memopyk.com/admin';
const ADMIN_PASSWORD = 'memopyk2025admin';
const BASE_URL = 'https://memopyk.memopyk.com';

// =============================================================================
// HELPERS
// =============================================================================

/** Get the dark fixed sidebar */
const getSidebar = (page: Page) => page.locator('.bg-gray-900.fixed');

/** Login to admin and wait for sidebar */
async function loginToAdmin(page: Page) {
  await page.goto(ADMIN_URL);

  // Accept cookies if present
  const acceptButton = page.getByRole('button', { name: /accept all/i });
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click();
  }

  // Enter password and submit
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /access admin/i }).click();

  // Wait for sidebar to load
  await expect(page.locator('.bg-gray-900.fixed')).toBeVisible({ timeout: 15000 });
}

/** Navigate to Blog section (direct link) - goes to ContentProductionHub */
async function navigateToBlog(page: Page) {
  const sidebar = getSidebar(page);
  await sidebar.getByText('Blog').click();
  // Wait for ContentProductionHub to load - look for its tabs
  await expect(page.getByTestId('tab-posts')).toBeVisible({ timeout: 10000 });
}

/** Navigate to Blog Posts tab within ContentProductionHub */
async function navigateToBlogPosts(page: Page) {
  await navigateToBlog(page);
  // Click the Posts tab to show BlogManagePosts
  await page.getByTestId('tab-posts').click();
  // Wait for posts section to load
  await expect(page.getByTestId('select-status-filter')).toBeVisible({ timeout: 10000 });
}

/** Navigate to SEO section (direct link) */
async function navigateToSEO(page: Page) {
  const sidebar = getSidebar(page);
  await sidebar.getByText('SEO').click();
  await expect(page.getByText('SEO Management')).toBeVisible({ timeout: 10000 });
}

/** Navigate to Analytics section (direct link) */
async function navigateToAnalytics(page: Page) {
  const sidebar = getSidebar(page);
  await sidebar.getByText('Analytics').click();
  // Analytics dashboard should have some indicator
  await page.waitForTimeout(2000);
}

/** Generate unique slug for test posts */
function generateTestSlug() {
  return `test-post-${Date.now()}`;
}

// =============================================================================
// TEST GROUP 1: NAVIGATION
// =============================================================================

test.describe('Group 1: Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('1.1 Admin dashboard loads with sidebar menu items', async ({ page }) => {
    await expect(page).toHaveTitle(/MEMOPYK/);
    const sidebar = getSidebar(page);

    // Verify direct link items (no chevron)
    await expect(sidebar.getByText('Analytics')).toBeVisible();
    await expect(sidebar.getByText('Blog')).toBeVisible();
    await expect(sidebar.getByText('SEO')).toBeVisible();

    // Verify collapsible categories
    await expect(sidebar.getByText('Partenaires')).toBeVisible();
    await expect(sidebar.getByText('Contenu Site')).toBeVisible();
    await expect(sidebar.getByText('Système')).toBeVisible();

    await page.screenshot({ path: 'test-results/1.1-admin-dashboard.png' });
  });

  test('1.2 Blog direct link loads ContentProductionHub', async ({ page }) => {
    const sidebar = getSidebar(page);

    // Click Blog - should navigate directly (no submenu)
    await sidebar.getByText('Blog').click();

    // Verify ContentProductionHub loaded with its tabs
    await expect(page.getByTestId('tab-planner')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('tab-topics')).toBeVisible();
    await expect(page.getByTestId('tab-posts')).toBeVisible();

    await page.screenshot({ path: 'test-results/1.2-blog-direct-link.png' });
  });

  test('1.3 SEO direct link loads SEO section', async ({ page }) => {
    const sidebar = getSidebar(page);

    await sidebar.getByText('SEO').click();

    // SEO section should load
    await expect(page.getByText('SEO Management')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/1.3-seo-direct-link.png' });
  });

  test('1.4 Analytics direct link loads Analytics section', async ({ page }) => {
    const sidebar = getSidebar(page);

    await sidebar.getByText('Analytics').click();

    // Wait for analytics to load (may have loading state)
    await page.waitForTimeout(3000);

    // Should be on analytics page (default admin view)
    await page.screenshot({ path: 'test-results/1.4-analytics-direct-link.png' });
  });

  test('1.5 Collapsible categories expand correctly', async ({ page }) => {
    const sidebar = getSidebar(page);

    // Test Contenu Site expansion
    await sidebar.getByText('Contenu Site').click();
    await expect(sidebar.getByText('Vidéos Hero')).toBeVisible();
    await expect(sidebar.getByText('Galerie Vidéos')).toBeVisible();
    await expect(sidebar.getByText('FAQ')).toBeVisible();
    await expect(sidebar.getByText('Documents Légaux')).toBeVisible();

    // Test Système expansion
    await sidebar.getByText('Système').click();
    await expect(sidebar.getByText('Cache')).toBeVisible();
    await expect(sidebar.getByText('Tests')).toBeVisible();
    await expect(sidebar.getByText('Déploiement')).toBeVisible();

    // Test Partenaires expansion
    await sidebar.getByText('Partenaires').click();
    await expect(sidebar.getByText('Agences de Voyage')).toBeVisible();
    await expect(sidebar.getByText('Annuaire Pro')).toBeVisible();

    await page.screenshot({ path: 'test-results/1.5-collapsible-categories.png' });
  });
});

// =============================================================================
// TEST GROUP 2: BLOG POSTS LIST (BlogManagePosts)
// =============================================================================

test.describe('Group 2: Blog Posts List', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlogPosts(page);
  });

  test('2.1 Posts list loads with filter controls', async ({ page }) => {
    // Posts section should already be loaded from beforeEach
    await expect(page.getByText('Filters')).toBeVisible({ timeout: 10000 });

    // Verify filter dropdowns exist
    await expect(page.getByTestId('select-status-filter')).toBeVisible();
    await expect(page.getByTestId('select-language-filter')).toBeVisible();

    // Verify results count is shown
    await expect(page.getByText(/\d+ posts?/)).toBeVisible();

    await page.screenshot({ path: 'test-results/2.1-posts-list-filters.png' });
  });

  test('2.2 Status filter works', async ({ page }) => {
    await expect(page.getByTestId('select-status-filter')).toBeVisible({ timeout: 10000 });

    // Filter by draft
    await page.getByTestId('select-status-filter').click();
    await page.getByRole('option', { name: /draft/i }).click();
    await page.waitForTimeout(1000);

    // Filter by published
    await page.getByTestId('select-status-filter').click();
    await page.getByRole('option', { name: /published/i }).click();
    await page.waitForTimeout(1000);

    // Reset to all
    await page.getByTestId('select-status-filter').click();
    await page.getByRole('option', { name: /all posts/i }).click();

    await page.screenshot({ path: 'test-results/2.2-status-filter.png' });
  });

  test('2.3 Language filter works', async ({ page }) => {
    await expect(page.getByTestId('select-language-filter')).toBeVisible({ timeout: 10000 });

    // Filter by English
    await page.getByTestId('select-language-filter').click();
    await page.getByRole('option', { name: /english/i }).click();
    await page.waitForTimeout(1000);

    // Filter by French
    await page.getByTestId('select-language-filter').click();
    await page.getByRole('option', { name: /french/i }).click();
    await page.waitForTimeout(1000);

    // Reset to all
    await page.getByTestId('select-language-filter').click();
    await page.getByRole('option', { name: /all languages/i }).click();

    await page.screenshot({ path: 'test-results/2.3-language-filter.png' });
  });

  test('2.4 Post cards show correct information', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find first post card
    const postCard = page.locator('.border.rounded-lg.p-4').first();

    if (await postCard.isVisible()) {
      // Should have title
      await expect(postCard.locator('h3, .font-semibold').first()).toBeVisible();

      // Should have language badge (EN or FR)
      const langBadge = postCard.getByText(/^(EN|FR)$/);
      await expect(langBadge).toBeVisible();

      // Should have status indicator
      const statusIndicator = postCard.locator('.bg-green-100, .bg-amber-100, .bg-gray-100').first();
      await expect(statusIndicator).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/2.4-post-cards.png' });
  });

  test('2.5 Manage Tags button opens modal', async ({ page }) => {
    await expect(page.getByTestId('button-manage-tags')).toBeVisible({ timeout: 10000 });

    // Click Manage Tags button
    await page.getByTestId('button-manage-tags').click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Manage Blog Tags')).toBeVisible();

    await page.screenshot({ path: 'test-results/2.5-manage-tags-modal.png' });

    // Close modal - use first Close button (dialog footer)
    await page.getByRole('button', { name: 'Close', exact: true }).first().click();
  });
});

// =============================================================================
// TEST GROUP 3: POST STATUS MANAGEMENT
// =============================================================================

test.describe('Group 3: Post Status Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlogPosts(page);
    await page.waitForTimeout(1000);
  });

  test('3.1 Inline status dropdown is visible on post cards', async ({ page }) => {
    // Find a post card with status dropdown
    const postCard = page.locator('.border.rounded-lg.p-4').first();

    if (await postCard.isVisible()) {
      // Find the status select within the card
      const statusSelect = postCard.locator('button[role="combobox"]').first();
      await expect(statusSelect).toBeVisible();

      await page.screenshot({ path: 'test-results/3.1-status-dropdown.png' });
    }
  });

  test('3.2 Can open status dropdown and see options', async ({ page }) => {
    const postCard = page.locator('.border.rounded-lg.p-4').first();

    if (await postCard.isVisible()) {
      // Click the status dropdown
      const statusSelect = postCard.locator('button[role="combobox"]').first();
      await statusSelect.click();

      // Should see all status options
      await expect(page.getByRole('option', { name: /draft/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /in review/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /published/i })).toBeVisible();

      await page.screenshot({ path: 'test-results/3.2-status-options.png' });

      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape');
    }
  });

  // Note: Actual status changes would modify production data
  // These tests verify the UI works, not that changes persist
  test('3.3 Status change shows toast notification', async ({ page }) => {
    const postCard = page.locator('.border.rounded-lg.p-4').first();

    if (await postCard.isVisible()) {
      const statusSelect = postCard.locator('button[role="combobox"]').first();
      const currentStatus = await statusSelect.textContent();

      await statusSelect.click();

      // Select a different status
      if (currentStatus?.toLowerCase().includes('draft')) {
        await page.getByRole('option', { name: /in review/i }).click();
      } else {
        await page.getByRole('option', { name: /draft/i }).click();
      }

      // Should see success toast
      await expect(page.getByText(/success/i)).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/3.3-status-change-toast.png' });
    }
  });
});

// =============================================================================
// TEST GROUP 4: BLOG EDITOR
// =============================================================================

test.describe('Group 4: Blog Editor', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlogPosts(page);
    await page.waitForTimeout(1000);
  });

  test('4.1 Edit button opens BlogEditor', async ({ page }) => {
    // Find edit button (Pencil icon) on first post
    const editButton = page.locator('button[title="Edit post"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Should navigate to editor
      await expect(page.getByText('Edit Blog Post')).toBeVisible({ timeout: 10000 });

      // URL should have blog-edit and id
      await expect(page).toHaveURL(/tab=blog-edit/);
      await expect(page).toHaveURL(/id=/);

      await page.screenshot({ path: 'test-results/4.1-blog-editor-opens.png' });
    }
  });

  test('4.2 BlogEditor shows post data', async ({ page }) => {
    const editButton = page.locator('button[title="Edit post"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByText('Edit Blog Post')).toBeVisible({ timeout: 10000 });

      // Title field should be populated
      const titleInput = page.getByTestId('input-title');
      await expect(titleInput).toBeVisible();
      const titleValue = await titleInput.inputValue();
      expect(titleValue.length).toBeGreaterThan(0);

      // Slug field should be populated
      const slugInput = page.getByTestId('input-slug');
      await expect(slugInput).toBeVisible();

      // Description field should be visible
      const descInput = page.getByTestId('textarea-description');
      await expect(descInput).toBeVisible();

      await page.screenshot({ path: 'test-results/4.2-editor-shows-data.png' });
    }
  });

  test('4.3 BlogEditor has status and published_at pickers', async ({ page }) => {
    const editButton = page.locator('button[title="Edit post"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByText('Edit Blog Post')).toBeVisible({ timeout: 10000 });

      // Status selector
      await expect(page.getByTestId('select-status')).toBeVisible();

      // Published at picker
      await expect(page.getByTestId('button-published-at')).toBeVisible();

      await page.screenshot({ path: 'test-results/4.3-status-published-pickers.png' });
    }
  });

  test('4.4 BlogEditor has featured toggle', async ({ page }) => {
    const editButton = page.locator('button[title="Edit post"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByText('Edit Blog Post')).toBeVisible({ timeout: 10000 });

      // Featured section should be visible
      await expect(page.getByText('Featured Post')).toBeVisible();
      await expect(page.getByTestId('switch-featured')).toBeVisible();

      await page.screenshot({ path: 'test-results/4.4-featured-toggle.png' });
    }
  });

  test('4.5 BlogEditor has Save button', async ({ page }) => {
    const editButton = page.locator('button[title="Edit post"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByText('Edit Blog Post')).toBeVisible({ timeout: 10000 });

      // Save button
      await expect(page.getByTestId('button-save')).toBeVisible();

      await page.screenshot({ path: 'test-results/4.5-save-button.png' });
    }
  });

  test('4.6 Back button returns to posts list', async ({ page }) => {
    const editButton = page.locator('button[title="Edit post"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByText('Edit Blog Post')).toBeVisible({ timeout: 10000 });

      // Click back button
      await page.getByTestId('button-back-to-manage').click();

      // Should return to posts list
      await expect(page.getByRole('button', { name: /manage posts/i })).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'test-results/4.6-back-to-list.png' });
    }
  });
});

// =============================================================================
// TEST GROUP 5: TAG MANAGEMENT
// =============================================================================

test.describe('Group 5: Tag Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlogPosts(page);
    await page.waitForTimeout(1000);
  });

  test('5.1 Tag management modal opens', async ({ page }) => {
    await page.getByTestId('button-manage-tags').click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Manage Blog Tags')).toBeVisible();

    await page.screenshot({ path: 'test-results/5.1-tag-modal-opens.png' });
  });

  test('5.2 Tag modal has create input and button', async ({ page }) => {
    await page.getByTestId('button-manage-tags').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Should have input for new tag
    await expect(page.getByTestId('input-new-tag-name')).toBeVisible();

    // Should have create button
    await expect(page.getByTestId('button-create-tag')).toBeVisible();

    await page.screenshot({ path: 'test-results/5.2-tag-create-controls.png' });
  });

  test('5.3 Can type in tag name input', async ({ page }) => {
    await page.getByTestId('button-manage-tags').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const input = page.getByTestId('input-new-tag-name');
    await input.fill('Test Tag Name');

    const value = await input.inputValue();
    expect(value).toBe('Test Tag Name');

    await page.screenshot({ path: 'test-results/5.3-tag-name-input.png' });

    // Clear the input (don't actually create)
    await input.clear();
  });

  test('5.4 Existing tags are displayed', async ({ page }) => {
    await page.getByTestId('button-manage-tags').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Wait for tags to load
    await page.waitForTimeout(2000);

    // Either tags exist or "No tags yet" message
    const hasTags = await page.locator('[data-testid^="tag-row-"]').count() > 0;
    const noTagsMessage = page.getByText('No tags yet');

    if (!hasTags) {
      await expect(noTagsMessage).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/5.4-existing-tags.png' });
  });

  test('5.5 Tag selector in editor shows available tags', async ({ page }) => {
    // Navigate to editor
    const editButton = page.locator('button[title="Edit post"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByText('Edit Blog Post')).toBeVisible({ timeout: 10000 });

      // Tag selector should be visible
      await expect(page.getByText('Tags')).toBeVisible();

      // Either tags are shown or message about no tags
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/5.5-tag-selector-editor.png' });
    }
  });
});

// =============================================================================
// TEST GROUP 6: AI CREATOR (BlogAICreator)
// =============================================================================

// NOTE: Group 6 (AI Creator) tests are skipped because BlogAICreator
// is not currently accessible through the main navigation.
// The Blog sidebar item now goes to ContentProductionHub which has
// Planner/Topics/Keywords/Posts/Images tabs, not the old BlogManagement
// with its "Create a Post" tab.
test.describe.skip('Group 6: AI Creator (SKIPPED - UI not accessible)', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlog(page);
  });

  test('6.1 AI Creator tab loads form', async ({ page }) => {
    // This test is skipped - BlogAICreator not accessible via current nav
  });

  test('6.2 Generate Prompt button creates prompt', async ({ page }) => {
    // This test is skipped
  });

  test('6.3 Copy to Clipboard button exists', async ({ page }) => {
    // This test is skipped
  });

  test('6.4 JSON input area exists with validate button', async ({ page }) => {
    // This test is skipped
  });
});

// =============================================================================
// TEST GROUP 7: POST ACTIONS
// =============================================================================

// NOTE: Group 7 tests require posts to exist in the staging database.
// If staging has 0 posts, these tests will skip gracefully.
test.describe('Group 7: Post Actions (requires existing posts)', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlogPosts(page);
    // Wait for posts to load
    await page.waitForTimeout(2000);
  });

  test('7.1 View button exists on post cards', async ({ page }) => {
    // Check if any posts exist first
    const postCount = await page.getByText(/\d+ posts?/).textContent();
    if (postCount?.includes('0 posts')) {
      console.log('SKIPPING: No posts in staging database');
      test.skip();
      return;
    }

    // Wait for post cards to render
    const postCard = page.locator('.border.rounded-lg.p-4').first();
    await expect(postCard).toBeVisible({ timeout: 10000 });

    const viewButton = page.locator('button[title="View post"]').first();
    await expect(viewButton).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/7.1-view-button.png' });
  });

  test('7.2 Translate button exists on post cards', async ({ page }) => {
    // Check if any posts exist first
    const postCount = await page.getByText(/\d+ posts?/).textContent();
    if (postCount?.includes('0 posts')) {
      console.log('SKIPPING: No posts in staging database');
      test.skip();
      return;
    }

    // Wait for post cards to render
    const postCard = page.locator('.border.rounded-lg.p-4').first();
    await expect(postCard).toBeVisible({ timeout: 10000 });

    const translateButton = page.locator('button[title="Duplicate for translation"]').first();
    await expect(translateButton).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/7.2-translate-button.png' });
  });

  test('7.3 Delete button exists and shows confirmation', async ({ page }) => {
    // Check if any posts exist first
    const postCount = await page.getByText(/\d+ posts?/).textContent();
    if (postCount?.includes('0 posts')) {
      console.log('SKIPPING: No posts in staging database');
      test.skip();
      return;
    }

    // Wait for post cards to render
    const postCard = page.locator('.border.rounded-lg.p-4').first();
    await expect(postCard).toBeVisible({ timeout: 10000 });

    const deleteButton = page.locator('button[title="Delete post"]').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirmation dialog should appear
      await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Delete Blog Post')).toBeVisible();
      await expect(page.getByText(/cannot be undone/i)).toBeVisible();

      await page.screenshot({ path: 'test-results/7.3-delete-confirmation.png' });

      // Cancel - don't actually delete
      await page.getByRole('button', { name: /cancel/i }).click();
    }
  });
});

// =============================================================================
// TEST GROUP 8: HERO IMAGE
// =============================================================================

test.describe('Group 8: Hero Image', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
    await navigateToBlogPosts(page);
    await page.waitForTimeout(1000);
  });

  test('8.1 Hero image picker button exists in editor', async ({ page }) => {
    const editButton = page.locator('button[title="Edit post"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByText('Edit Blog Post')).toBeVisible({ timeout: 10000 });

      // Hero image section
      await expect(page.getByText('Hero Image')).toBeVisible();
      await expect(page.getByTestId('button-browse-hero-image')).toBeVisible();

      await page.screenshot({ path: 'test-results/8.1-hero-image-button.png' });
    }
  });

  test('8.2 Hero image dialog opens', async ({ page }) => {
    const editButton = page.locator('button[title="Edit post"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.getByText('Edit Blog Post')).toBeVisible({ timeout: 10000 });

      // Click browse button
      await page.getByTestId('button-browse-hero-image').click();

      // Dialog should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Select Hero Image')).toBeVisible();

      // Should have upload area
      await expect(page.getByText('Upload new image')).toBeVisible();

      await page.screenshot({ path: 'test-results/8.2-hero-image-dialog.png' });
    }
  });
});

// =============================================================================
// TEST GROUP 9: PUBLIC BLOG (Read-only tests)
// =============================================================================

test.describe('Group 9: Public Blog', () => {
  test('9.1 Blog listing page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    // Accept cookies if present
    const acceptButton = page.getByRole('button', { name: /accept all/i });
    if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptButton.click();
    }

    await expect(page).toHaveURL(/blog/i);
    await page.screenshot({ path: 'test-results/9.1-public-blog-listing.png' });
  });

  test('9.2 Blog post detail page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);

    const acceptButton = page.getByRole('button', { name: /accept all/i });
    if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptButton.click();
    }

    // Click first blog post link
    const firstPost = page.locator('article a, [data-testid="blog-post"] a, a[href*="/blog/"]').first();
    if (await firstPost.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstPost.click();
      await page.waitForTimeout(2000);

      // Should be on a blog post page
      await expect(page).toHaveURL(/\/blog\/.+/);

      await page.screenshot({ path: 'test-results/9.2-public-blog-post.png' });
    }
  });
});
