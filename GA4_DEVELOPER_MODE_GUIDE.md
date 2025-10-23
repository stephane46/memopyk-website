# GA4 Developer Mode - Exclude Your Traffic from Analytics

## Overview
This system allows you to exclude your own visits from Google Analytics 4 data by marking your sessions as "developer traffic" using the `debug_mode` parameter.

## How It Works
When `debug_mode=true` is sent with GA4 events, these events can be filtered out in your GA4 reports using the built-in "Developer traffic" filter.

## Quick Setup
1. **Visit with URL parameter**: Add `?ga_dev=1` to any page URL
   - Example: `https://memopyk.com/?ga_dev=1`
   - This enables developer mode for the current session

2. **Enable permanently**: Run in browser console:
   ```javascript
   localStorage.setItem('ga_dev','1')
   ```
   
3. **Disable**: Run in browser console:
   ```javascript
   localStorage.removeItem('ga_dev')
   ```

## Using Helper Functions
The analytics library provides convenient functions:

```javascript
// Enable developer mode
import { enableDeveloperMode, disableDeveloperMode, isDeveloperMode } from './src/lib/analytics';

enableDeveloperMode();    // Excludes your traffic
disableDeveloperMode();   // Includes your traffic  
isDeveloperMode();        // Check current status
```

## Verification
After enabling developer mode:

1. Open DevTools → Network tab
2. Filter for "collect" requests
3. Click on a GA4 request
4. Confirm `debug_mode=1` or `ep.debug_mode=1` is present in the request

## GA4 Configuration
In your GA4 property:
1. Go to Data Settings → Data Filters
2. Create or enable "Developer traffic" filter
3. Set to "Exclude" to remove debug traffic from reports

## Implementation Details
- **Static HTML**: Initial page view includes debug_mode when URL parameter or localStorage is detected
- **SPA Navigation**: Route changes automatically include debug_mode for subsequent page views
- **Custom Events**: All tracked events include debug_mode when developer mode is active
- **Persistence**: localStorage setting persists across browser sessions until manually removed

## Current Status
✅ Implemented and active - your traffic can now be excluded from analytics reports.