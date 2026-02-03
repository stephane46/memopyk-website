# Staging QA Seed Data & E2E Configuration

## Rate Limit Bypass for E2E Tests

E2E tests bypass staging rate limiting using a custom header to prevent 429 errors during automated testing.

### How It Works

1. **Middleware Check**: The rate limiting middleware in `server/middleware/security.middleware.ts` checks for the `X-E2E-Token` header
2. **Token Validation**: If the header value matches the `E2E_BYPASS_TOKEN` environment variable, rate limiting is skipped
3. **Playwright Configuration**: The `playwright.config.ts` automatically adds this header to all requests

### Environment Variables

**On Staging Server (Coolify):**
```
E2E_BYPASS_TOKEN=memopyk-e2e-2026
```

**In `.env.e2e` (local development):**
```
E2E_BYPASS_TOKEN=memopyk-e2e-2026
```

**In GitHub Actions Secrets:**
```
E2E_BYPASS_TOKEN=memopyk-e2e-2026
```

### Setup Instructions

1. **Staging Server**: Add `E2E_BYPASS_TOKEN=memopyk-e2e-2026` to Coolify environment variables and redeploy
2. **Local Testing**: Copy `.env.e2e.example` to `.env.e2e` and fill in values
3. **GitHub Actions**: Add `E2E_BYPASS_TOKEN` secret in repository settings

### Security Note

- The bypass token only skips rate limiting, not authentication
- Use a unique token value in production environments
- Never commit the actual `.env.e2e` file (it's in `.gitignore`)

---

## Staging QA Seed Data

The staging environment requires certain seed data for E2E tests to function properly.

### Current Data Status

| Table | Count | Seeding Needed |
|-------|-------|----------------|
| content_topics | 102 | No |
| blog_posts | ~20 | No |
| image_bank | 5+ (after seeding) | **Yes** |

### Seed Images

5 seed images are inserted into `image_bank` with:
- `alt_text` prefixed with `[SEED]`
- `tags` array containing `'qa-seed'`
- `uploaded_by`: `'claude-qa'`
- `notes`: `'QA seed image for E2E testing - do not delete'`

### Running the Seed Script

Run the seed script on the staging database:

```bash
# Option 1: Via psql directly
psql $DATABASE_URL -f scripts/seed-qa-data.sql

# Option 2: Copy and paste into Supabase SQL editor
# Open scripts/seed-qa-data.sql and run in Supabase dashboard
```

### Verifying Seed Data

```sql
-- Check seed images
SELECT id, filename, alt_text, category
FROM image_bank
WHERE alt_text LIKE '[SEED]%';

-- Check no E2E posts remain
SELECT COUNT(*) FROM blog_posts WHERE title LIKE '[E2E]%';
```

### Important Notes

1. **DO NOT DELETE** seed images with `[SEED]` prefix - they're needed for E2E tests
2. The `[E2E]` prefixed blog posts are automatically cleaned up after each test run
3. Re-run the seed script if seed data is accidentally deleted

---

## E2E Test Data Lifecycle

1. **Before Tests**: Seed images must exist for Flow 7 (hero image selection)
2. **During Tests**: Flow 4 creates `[E2E]` prefixed posts
3. **After Tests**: Cleanup function deletes all `[E2E]` posts
4. **Permanent**: Seed images remain for future test runs

---

## Troubleshooting

### Rate Limit Errors (429)

If tests still get 429 errors:
1. Verify `E2E_BYPASS_TOKEN` is set in Coolify environment
2. Verify the same token is in `.env.e2e` or CI secrets
3. Check that staging was redeployed after adding the env var

### Missing Seed Images

If Flow 7 fails due to no images:
1. Run `scripts/seed-qa-data.sql` on staging database
2. Verify with: `SELECT COUNT(*) FROM image_bank WHERE alt_text LIKE '[SEED]%';`

### Post Not Found Errors

If editor shows "Post not found" after creation:
1. This was a rate limiting issue - should be fixed with bypass token
2. If it persists, check server logs for errors
