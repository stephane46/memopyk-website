# Travel Upload Portal SOP

**Location:** `/travel-upload` (public page)  
**Admin:** `/admin/travel`

---

## Overview

The Travel Upload Portal allows travel agency clients to submit their photos/videos for MEMOPYK film creation. The system:

1. Validates agency codes
2. Collects client information
3. Creates a Nextcloud shared folder
4. Sends confirmation emails
5. Tracks submissions in database

---

## How It Works

### Client Flow

```
Client visits /travel-upload
         │
         ▼
    Enter agency code
         │
         ▼
    Code validated? ──No──► Error message
         │
        Yes
         │
         ▼
    Fill contact form
    (name, email, phone)
         │
         ▼
    Submit form
         │
         ▼
    System creates:
    • Nextcloud folder
    • Share link
    • Database record
    • Sends emails
         │
         ▼
    Client sees success page
    with upload link
```

### Backend Flow

```
POST /api/travel/submit
         │
         ▼
    Validate agency code
         │
         ▼
    Create Nextcloud folder
    /Travel/{Agency}/{ClientName}_{Date}/
         │
         ▼
    Create public share link
         │
         ▼
    Save to database
    (travel_upload_submissions)
         │
         ▼
    Send confirmation email to client
         │
         ▼
    Send notification to Ngoc
         │
         ▼
    Return share URL to client
```

---

## Agency Code Management

### View Existing Codes

1. Login to admin panel
2. Go to Travel Portal → Agency Codes
3. View list of all codes

### Create New Agency Code

1. Click "Add Agency Code"
2. Fill form:
   - **Agency Name:** Full company name
   - **Agency Code:** Unique code (uppercase, no spaces)
   - **Contact Email:** Agency's email
   - **Contact Phone:** Optional
   - **Notes:** Internal notes
3. Click "Save"

**Code Format:**
- Uppercase letters and numbers only
- 4-10 characters recommended
- Examples: `AGENCY1`, `TRAVEL2024`, `MEMOPYK`

### Edit Agency Code

1. Click agency name in list
2. Update fields
3. Click "Save"

**Note:** Changing the code will invalidate any printed materials using the old code.

### Deactivate Agency Code

1. Click agency name
2. Toggle "Active" to off
3. Save

Deactivated codes will show "Invalid code" error on the form.

---

## Submission Management

### View Submissions

1. Go to Travel Portal → Submissions
2. View list with filters:
   - By agency
   - By date range
   - By status

### Submission Details

Each submission shows:
- Client name and contact info
- Agency code used
- Submission date
- Nextcloud folder path
- Share URL
- Email status

### Email Notifications

| Recipient | When | Content |
|-----------|------|---------|
| Client | On submit | Thank you + share link |
| Agency | On submit (if configured) | Notification of submission |
| Ngoc (internal) | On submit | Full details + share link |

---

## Nextcloud Integration

### Folder Structure

```
Nextcloud/
└── Travel/
    └── {AgencyName}/
        └── {LastName}_{FirstName}_{Date}/
            └── (client uploads here)
```

**Example:** `Travel/SunTours/Doe_John_20260131/`

### Share Settings

- **Share type:** Public link
- **Permissions:** Upload only (can't see other files)
- **Expiration:** None (permanent)
- **Password:** None

### Accessing Uploads

1. Login to Nextcloud as admin
2. Navigate to Travel folder
3. Find agency subfolder
4. Open client folder
5. Download files

---

## Configuration

### Required Environment Variables

```env
NC_ADMIN_USER=admin
NC_ADMIN_PASS=password
```

### Nextcloud Setup Requirements

1. Admin account with folder creation permission
2. `Travel` folder created at root
3. Sharing enabled (public links)
4. Upload-only permission available

---

## Troubleshooting

### "Invalid Agency Code"

**Causes:**
- Code doesn't exist
- Code deactivated
- Typo in code

**Solutions:**
- Verify code in admin panel
- Check code is active
- Try uppercase version

### Folder Creation Failed

**Causes:**
- Nextcloud credentials invalid
- Nextcloud server down
- Disk space full
- Travel folder doesn't exist

**Solutions:**
- Verify NC_ADMIN_USER/PASS
- Check Nextcloud status
- Clear Nextcloud disk space
- Create Travel folder manually

### Emails Not Sending

**Causes:**
- RESEND_API_KEY invalid
- Email address invalid
- Resend rate limit

**Solutions:**
- Verify Resend API key
- Check email format
- Wait and retry

### Share Link Not Working

**Causes:**
- Sharing disabled in Nextcloud
- Link expired (if expiration set)
- Folder deleted

**Solutions:**
- Enable sharing in Nextcloud admin
- Remove expiration on shares
- Recreate submission

---

## Client Instructions

### What to Tell Clients

1. Visit the upload page (URL provided by agency)
2. Enter agency code (provided by agency)
3. Fill in contact information
4. Click Submit
5. Use the link provided to upload files
6. No account needed
7. Supported formats: Photos (JPG, PNG), Videos (MP4, MOV)

### Upload Best Practices

Tell clients:
- Upload original quality files
- Include all photos/videos they want in the film
- Organize by event/date if possible
- Large files may take time to upload

---

## Security Considerations

### Data Handling

- Client data stored in PostgreSQL (encrypted at rest)
- Nextcloud files on secure server
- Share links are unguessable UUIDs
- No passwords required (trade-off: convenience vs security)

### Access Control

- Only admins can view submissions
- Agency codes should be shared privately
- Share links should not be posted publicly

---

## Reporting

### Submission Statistics

Admin can view:
- Total submissions (all time, by period)
- Submissions by agency
- Email delivery status
- Active vs inactive submissions

### Export Data

1. Go to Submissions list
2. Apply filters
3. Click "Export CSV"
4. Opens in Excel/Sheets

---

## Related Documentation

- [API.md](../architecture/API.md) — Travel API endpoints
- [DATABASE.md](../architecture/DATABASE.md) — Travel tables schema
- [ENVIRONMENT.md](../deployment/ENVIRONMENT.md) — Nextcloud configuration

---

*Keep agency codes confidential. They control who can create upload folders.*
