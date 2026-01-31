# Memopyk.com → Nextcloud Integration

## Overview

This document describes the complete integration between **memopyk.com** (web form) and **media.memopyk.com** (Nextcloud) for file uploads from travel agencies.

---

## Part 1: Technical Design

### Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Travel Agency  │────▶│  memopyk.com     │────▶│  media.memopyk.com  │
│  (Browser)      │     │  (Form Handler)  │     │  (Nextcloud)        │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
        │                       │                         │
        │ 1. Submit form        │                         │
        │    (email, agency,    │                         │
        │     message)          │                         │
        │──────────────────────▶│                         │
        │                       │ 2. Validate input       │
        │                       │ 3. Check rate limit     │
        │                       │                         │
        │                       │ 4. Create folder ───────▶│ WebDAV MKCOL
        │                       │                         │
        │                       │ 5. Create share link ───▶│ OCS API
        │                       │◀─── Share URL ──────────│
        │                       │                         │
        │                       │ 6. Send emails          │
        │                       │    - To agency (link)   │
        │                       │    - To admin (BCC)     │
        │                       │                         │
        │◀── Success page ──────│                         │
```

### Folder Naming Convention

Each submission creates a unique folder:

```
/Travel-Agencies/{timestamp}_{sanitized-email}_{agency-name}/
```

**Example:**
```
/Travel-Agencies/20260121-143052_contact_travelco.com_TravelCo-Agency/
```

**Components:**
| Part | Format | Example |
|------|--------|---------|
| Timestamp | `YYYYMMDD-HHMMSS` | `20260121-143052` |
| Email | Sanitized (@ → `_`, special chars removed) | `contact_travelco.com` |
| Agency | Slugified (spaces → `-`, max 30 chars) | `TravelCo-Agency` |

### Security Measures

| Measure | Implementation |
|---------|----------------|
| **Input Validation** | Email format, max lengths, sanitize all inputs |
| **CSRF Protection** | Token in form, validate on submit |
| **Rate Limiting** | Max 5 requests/IP/hour, max 3 requests/email/day |
| **Honeypot Field** | Hidden field, reject if filled (bots) |
| **App Password** | Never expose Nextcloud admin password, use app-specific token |
| **HTTPS Only** | All communications over TLS |
| **Email Verification** | Optional: send confirmation code first |

### Anti-Spam Strategy

```php
// 1. Honeypot field (hidden via CSS)
<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">

// 2. Time-based check (form must take >3 seconds to fill)
<input type="hidden" name="timestamp" value="<?= time() ?>">

// 3. Rate limiting (Redis/database)
$key = "upload_form:" . $_SERVER['REMOTE_ADDR'];
if ($redis->incr($key) > 5) {
    $redis->expire($key, 3600);
    die("Too many requests");
}
```

---

## Part 2: Code for memopyk.com

### PHP Implementation

#### File: `/api/travel-upload.php`

```php
<?php
/**
 * Travel Agency Upload Form Handler
 * Creates Nextcloud folder + share link, sends confirmation emails
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

define('NC_BASE', 'https://media.memopyk.com');
define('NC_USER', 'admin');  // Consider creating a dedicated 'memopyk-bot' user
define('NC_PASS', 'xxxxx-xxxxx-xxxxx-xxxxx-xxxxx');  // EXAMPLE ONLY – replace with your app password
define('NC_FOLDER', 'Travel-Agencies');

define('ADMIN_EMAIL', 'admin@memopyk.com');
define('FROM_EMAIL', 'noreply@memopyk.com');
define('FROM_NAME', 'Memopyk');

define('RATE_LIMIT_MAX', 5);       // Max requests per IP per hour
define('RATE_LIMIT_WINDOW', 3600); // 1 hour in seconds

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize email for folder name (replace @ and special chars)
 */
function sanitizeEmailForFolder(string $email): string {
    $email = strtolower(trim($email));
    $email = str_replace('@', '_', $email);
    $email = preg_replace('/[^a-z0-9._-]/', '', $email);
    return substr($email, 0, 50);
}

/**
 * Slugify agency name for folder
 */
function slugifyAgency(string $name): string {
    $name = trim($name);
    $name = preg_replace('/[^a-zA-Z0-9\s-]/', '', $name);
    $name = preg_replace('/[\s]+/', '-', $name);
    return substr($name, 0, 30);
}

/**
 * Generate unique folder name
 */
function generateFolderName(string $email, string $agency): string {
    $timestamp = date('Ymd-His');
    $emailPart = sanitizeEmailForFolder($email);
    $agencyPart = slugifyAgency($agency);
    return "{$timestamp}_{$emailPart}_{$agencyPart}";
}

/**
 * Create folder in Nextcloud via WebDAV
 */
function createNextcloudFolder(string $folderName): bool {
    $url = NC_BASE . "/remote.php/dav/files/" . NC_USER . "/" . NC_FOLDER . "/" . $folderName;

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_CUSTOMREQUEST => 'MKCOL',
        CURLOPT_USERPWD => NC_USER . ':' . NC_PASS,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/xml'],
    ]);

    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $httpCode === 201;
}

/**
 * Create public share link via OCS API
 * Returns share URL or false on failure
 */
function createShareLink(string $folderName, int $permissions = 4): string|false {
    $url = NC_BASE . "/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json";
    $path = "/" . NC_FOLDER . "/" . $folderName;  // Leading slash for OCS API compatibility

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_USERPWD => NC_USER . ':' . NC_PASS,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['OCS-APIRequest: true'],
        CURLOPT_POSTFIELDS => http_build_query([
            'path' => $path,
            'shareType' => 3,        // Public link
            'permissions' => $permissions,  // 4 = create/upload only, 15 = full
        ]),
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);

    if (isset($data['ocs']['meta']['status']) && $data['ocs']['meta']['status'] === 'ok') {
        return $data['ocs']['data']['url'];
    }

    return false;
}

/**
 * Send email using PHP mail() or your preferred library
 */
function sendEmail(string $to, string $subject, string $body, string $bcc = ''): bool {
    $headers = [
        'From' => FROM_NAME . ' <' . FROM_EMAIL . '>',
        'Reply-To' => ADMIN_EMAIL,
        'Content-Type' => 'text/html; charset=UTF-8',
        'X-Mailer' => 'PHP/' . phpversion(),
    ];

    if ($bcc) {
        $headers['Bcc'] = $bcc;
    }

    $headerString = '';
    foreach ($headers as $key => $value) {
        $headerString .= "$key: $value\r\n";
    }

    return mail($to, $subject, $body, $headerString);
}

/**
 * Simple file-based rate limiting (use Redis in production)
 */
function checkRateLimit(string $ip): bool {
    $file = sys_get_temp_dir() . '/rate_limit_' . md5($ip) . '.json';

    $data = ['count' => 0, 'timestamp' => time()];
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true);

        // Reset if window expired
        if (time() - $data['timestamp'] > RATE_LIMIT_WINDOW) {
            $data = ['count' => 0, 'timestamp' => time()];
        }
    }

    if ($data['count'] >= RATE_LIMIT_MAX) {
        return false;
    }

    $data['count']++;
    file_put_contents($file, json_encode($data));

    return true;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

header('Content-Type: application/json');

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Rate limiting
if (!checkRateLimit($_SERVER['REMOTE_ADDR'])) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests. Please try again later.']);
    exit;
}

// Honeypot check
if (!empty($_POST['website'])) {
    // Bot detected, silently fail
    http_response_code(200);
    echo json_encode(['success' => true]);
    exit;
}

// Time-based check (form must take at least 3 seconds)
if (isset($_POST['timestamp']) && (time() - (int)$_POST['timestamp'] < 3)) {
    http_response_code(200);
    echo json_encode(['success' => true]);
    exit;
}

// Validate required fields
$email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
$agency = trim($_POST['agency'] ?? '');
$message = trim($_POST['message'] ?? '');

if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid email is required']);
    exit;
}

if (strlen($agency) < 2 || strlen($agency) > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'Agency name must be 2-100 characters']);
    exit;
}

// Generate folder name and create it
$folderName = generateFolderName($email, $agency);

if (!createNextcloudFolder($folderName)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create upload folder']);
    exit;
}

// Create share link (permissions=4 for upload-only, permissions=15 for full access)
$shareUrl = createShareLink($folderName, 4);

if (!$shareUrl) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create share link']);
    exit;
}

// Prepare email content
$emailBody = "
<html>
<body style='font-family: Arial, sans-serif; line-height: 1.6;'>
    <h2>Your Upload Link is Ready</h2>
    <p>Hello,</p>
    <p>Thank you for your interest in working with Memopyk. Please use the link below to upload your files:</p>
    <p style='margin: 20px 0;'>
        <a href='{$shareUrl}' style='background: #0082c9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;'>
            Upload Files
        </a>
    </p>
    <p>Or copy this link: <a href='{$shareUrl}'>{$shareUrl}</a></p>
    <p><strong>Agency:</strong> {$agency}<br>
    <strong>Message:</strong> " . nl2br(htmlspecialchars($message)) . "</p>
    <hr>
    <p style='color: #666; font-size: 12px;'>This link was generated automatically. If you did not request this, please ignore this email.</p>
</body>
</html>
";

// Send email to agency (with BCC to admin)
$emailSent = sendEmail(
    $email,
    'Your Memopyk Upload Link',
    $emailBody,
    ADMIN_EMAIL  // BCC
);

// Log the submission (optional)
error_log("Upload folder created: {$folderName} for {$email}");

// Return success
echo json_encode([
    'success' => true,
    'message' => 'Upload link has been sent to your email',
    // Don't expose shareUrl in response for security
]);
```

### HTML Form Example

#### File: `/contact/upload-form.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Request Upload Link - Memopyk</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        textarea { height: 100px; resize: vertical; }
        button { background: #0082c9; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #006aa3; }
        .honey { position: absolute; left: -9999px; }
        .message { padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .message.success { background: #d4edda; color: #155724; }
        .message.error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>Request Upload Link</h1>
    <p>Fill out this form to receive a secure link for uploading your files.</p>

    <div id="message" class="message" style="display: none;"></div>

    <form id="uploadForm">
        <!-- Honeypot field (hidden from users, visible to bots) -->
        <div class="honey">
            <label for="website">Website</label>
            <input type="text" name="website" id="website" tabindex="-1" autocomplete="off">
        </div>

        <!-- Timestamp for time-based check -->
        <input type="hidden" name="timestamp" id="timestamp">

        <div class="form-group">
            <label for="email">Email Address *</label>
            <input type="email" name="email" id="email" required placeholder="your@email.com">
        </div>

        <div class="form-group">
            <label for="agency">Agency / Company Name *</label>
            <input type="text" name="agency" id="agency" required placeholder="Your Company Name" maxlength="100">
        </div>

        <div class="form-group">
            <label for="message">Message (optional)</label>
            <textarea name="message" id="message-field" placeholder="Tell us about the files you'll be uploading..."></textarea>
        </div>

        <button type="submit">Request Upload Link</button>
    </form>

    <script>
        // Set timestamp when form loads
        document.getElementById('timestamp').value = Math.floor(Date.now() / 1000);

        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const messageDiv = document.getElementById('message');
            const form = e.target;
            const formData = new FormData(form);

            try {
                const response = await fetch('/api/travel-upload.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = 'Success! Check your email for the upload link.';
                    messageDiv.style.display = 'block';
                    form.reset();
                    document.getElementById('timestamp').value = Math.floor(Date.now() / 1000);
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = data.error || 'An error occurred. Please try again.';
                    messageDiv.style.display = 'block';
                }
            } catch (error) {
                messageDiv.className = 'message error';
                messageDiv.textContent = 'Network error. Please try again.';
                messageDiv.style.display = 'block';
            }
        });
    </script>
</body>
</html>
```

---

## Part 3: Server Configuration Commands

### On media.memopyk.com (Nextcloud Server)

```bash
# ============================================================================
# 1. CREATE DEDICATED SERVICE USER (Recommended)
# ============================================================================

# SSH into media.memopyk.com
ssh user@media.memopyk.com

# Create a new Nextcloud user via OCC (run as www-data or your web user)
sudo -u www-data php /var/www/nextcloud/occ user:add memopyk-bot \
    --display-name="Memopyk Bot" \
    --password-from-env

# Or create via web interface:
# Settings → Users → New User
# Username: memopyk-bot
# Display name: Memopyk Bot

# ============================================================================
# 2. CREATE PARENT FOLDER
# ============================================================================

# Option A: Via command line (WebDAV)
export NC_BASE="https://media.memopyk.com"
export NC_USER="admin"
export NC_PASS="YOUR_APP_PASSWORD_HERE"  # EXAMPLE ONLY

# Create Travel-Agencies folder if it doesn't exist
curl -sS -u "$NC_USER:$NC_PASS" -X MKCOL \
    "$NC_BASE/remote.php/dav/files/$NC_USER/Travel-Agencies" \
    -w "HTTP %{http_code}\n"

# Option B: Just create it in the Nextcloud web interface

# ============================================================================
# 3. SHARE FOLDER WITH SERVICE USER (if using memopyk-bot)
# ============================================================================

# Share Travel-Agencies folder with memopyk-bot (full permissions)
curl -sS -u "$NC_USER:$NC_PASS" \
    -H "OCS-APIRequest: true" \
    -X POST "$NC_BASE/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json" \
    --data-urlencode "path=Travel-Agencies" \
    --data-urlencode "shareType=0" \
    --data-urlencode "shareWith=memopyk-bot" \
    --data-urlencode "permissions=31"

# ============================================================================
# 4. CREATE APP PASSWORD FOR SERVICE USER
# ============================================================================

# Login as memopyk-bot in Nextcloud web interface
# Go to: Settings → Security → App passwords
# Create new: "memopyk-form"
# Save the generated password securely

# ============================================================================
# 5. SET FOLDER QUOTA (Optional)
# ============================================================================

# Set quota for the service user (e.g., 50GB)
sudo -u www-data php /var/www/nextcloud/occ user:setting memopyk-bot files quota "50 GB"

# ============================================================================
# 6. CLEANUP: DELETE TEST FOLDER
# ============================================================================

# Delete the _api_test folder we created earlier
curl -sS -u "$NC_USER:$NC_PASS" -X DELETE \
    "$NC_BASE/remote.php/dav/files/$NC_USER/Travel-Agencies/_api_test" \
    -w "DELETE HTTP %{http_code}\n"
```

### On memopyk.com (Web Server)

```bash
# ============================================================================
# 1. CREATE API DIRECTORY
# ============================================================================

ssh user@memopyk.com

# Create directory for the API endpoint
sudo mkdir -p /var/www/memopyk.com/api
sudo chown www-data:www-data /var/www/memopyk.com/api

# ============================================================================
# 2. DEPLOY THE PHP FILE
# ============================================================================

# Copy travel-upload.php to the server
# (Use scp, rsync, git, or paste directly)

sudo nano /var/www/memopyk.com/api/travel-upload.php
# Paste the PHP code from Part 2

# Set permissions
sudo chown www-data:www-data /var/www/memopyk.com/api/travel-upload.php
sudo chmod 640 /var/www/memopyk.com/api/travel-upload.php

# ============================================================================
# 3. CONFIGURE PHP (if needed)
# ============================================================================

# Ensure cURL is enabled
php -m | grep curl

# If not installed:
sudo apt-get install php-curl
sudo systemctl restart php8.2-fpm  # adjust version as needed

# ============================================================================
# 4. ENVIRONMENT VARIABLES (More Secure Alternative)
# ============================================================================

# Instead of hardcoding credentials in PHP, use environment variables

# Add to /etc/php/8.2/fpm/pool.d/www.conf (or Apache envvars):
# env[NC_USER] = "memopyk-bot"
# env[NC_PASS] = "APP_PASSWORD_HERE"

# Then in PHP:
# define('NC_USER', getenv('NC_USER'));
# define('NC_PASS', getenv('NC_PASS'));

# ============================================================================
# 5. SET UP RATE LIMITING DIRECTORY
# ============================================================================

# Create directory for rate limit files (or use Redis)
sudo mkdir -p /var/tmp/memopyk-ratelimit
sudo chown www-data:www-data /var/tmp/memopyk-ratelimit
sudo chmod 700 /var/tmp/memopyk-ratelimit

# Update PHP to use this directory instead of sys_get_temp_dir()

# ============================================================================
# 6. TEST THE ENDPOINT
# ============================================================================

# Test from command line
curl -X POST https://memopyk.com/api/travel-upload.php \
    -d "email=test@example.com" \
    -d "agency=Test Agency" \
    -d "message=Test message" \
    -d "timestamp=$(date +%s)"
```

---

## Security Checklist

- [ ] Create dedicated `memopyk-bot` user instead of using `admin`
- [ ] Generate new app password for production (revoke the test one)
- [ ] Store credentials in environment variables, not in code
- [ ] Set up HTTPS on both servers (already done)
- [ ] Configure rate limiting with Redis for production scale
- [ ] Add CSRF token validation
- [ ] Set up monitoring/alerting for failed API calls
- [ ] Review Nextcloud sharing settings (disable public uploads if not needed elsewhere)
- [ ] Set folder quota to prevent storage abuse
- [ ] Delete test folder `_api_test`

---

## Quick Reference

### API Endpoints

| Action | Method | URL |
|--------|--------|-----|
| Create folder | `MKCOL` | `https://media.memopyk.com/remote.php/dav/files/{user}/{path}` |
| Create share | `POST` | `https://media.memopyk.com/ocs/v2.php/apps/files_sharing/api/v1/shares` |
| Delete share | `DELETE` | `https://media.memopyk.com/ocs/v2.php/apps/files_sharing/api/v1/shares/{id}` |
| List folder | `PROPFIND` | `https://media.memopyk.com/remote.php/dav/files/{user}/{path}` |

### Share Types

| Type | Value | Description |
|------|-------|-------------|
| User | 0 | Share with specific user |
| Group | 1 | Share with group |
| Public Link | 3 | Anyone with link |
| Email | 4 | Share via email |
| Federated | 6 | Share with remote server |

### Permissions

| Permission | Value | Description |
|------------|-------|-------------|
| Read | 1 | View files |
| Update | 2 | Edit files |
| Create | 4 | Upload new files |
| Delete | 8 | Remove files |
| Share | 16 | Re-share |
| All | 31 | Full access |

**Recommended for upload form:** `permissions=4` (create/upload only - users can upload but not see other files)

> **Note:** Whether users can actually see the file list depends on Nextcloud's "File Drop" configuration. With `permissions=4`, the API restricts actions, but true "blind drop" behaviour (upload without seeing anything) may require enabling the "File Drop" feature in Nextcloud sharing settings.

---

## Cleanup Test Data

Run this to remove the test folder and share we created:

```bash
# Delete the test folder
curl -sS -u "admin:YOUR_APP_PASSWORD_HERE" -X DELETE \
    "https://media.memopyk.com/remote.php/dav/files/admin/Travel-Agencies/_api_test" \
    -w "DELETE HTTP %{http_code}\n"
# EXAMPLE ONLY – replace YOUR_APP_PASSWORD_HERE with actual token
```
