# GA4 Test Mode - External Activation Guide

## Problem
The current system has a chicken-and-egg problem: you need to visit the site to enable test mode, but visiting the site already triggers analytics events that contaminate production data.

## Solution: External Test Mode Activation

### Method 1: URL Parameter Activation (RECOMMENDED)
Visit MEMOPYK with the `?ga_dev=1` parameter to automatically enable test mode:

```
https://memopyk.com/?ga_dev=1
https://memopyk.com/fr-FR/?ga_dev=1
https://memopyk.com/en-US/?ga_dev=1
```

**What happens:**
1. URL parameter is detected BEFORE any analytics fire
2. Test mode is automatically saved to localStorage
3. All GA4 events get `debug_mode: true` parameter
4. Console shows "🧪 MEMOPYK Test" branding
5. Events appear in GA4 Realtime with debug flag

### Method 2: Bookmarklet from External Site
1. Go to any other website (e.g., google.com)
2. Use the existing MEMOPYK Test bookmarklet
3. Then navigate to MEMOPYK manually

### Method 3: Direct localStorage (Advanced)
Open browser console on any site and run:
```javascript
localStorage.setItem('ga_dev', '1');
```

## How Test Mode Works

### Technical Details
- **Detection**: `/[?#&]ga_dev=1\b/.test(location.href) || localStorage.getItem('ga_dev') === '1'`
- **Persistence**: URL parameter auto-saves to localStorage
- **Debug Flag**: All events include `debug_mode: true`
- **Console**: Video events show with 📹 GA4 Video prefix
- **GA4**: Events visible in Realtime → Debug View

### Visual Indicators
- ✅ **Test Mode ON**: Console shows "🧪 MEMOPYK Test" 
- ❌ **Test Mode OFF**: No test branding, normal production analytics

## Testing Workflow

### Step 1: Activate Test Mode
Use Method 1 (URL parameter) - most reliable:
```
https://your-memopyk-url/?ga_dev=1
```

### Step 2: Verify Activation
Check browser console for:
```
🧪 MEMOPYK Test
```

### Step 3: Test Video Analytics
1. Open gallery video → expect `📹 GA4 Video: video_open`
2. Click play → expect `📹 GA4 Video: video_start`
3. Pause → expect `📹 GA4 Video: video_pause`
4. Continue watching → expect `📹 GA4 Video: video_progress` at 25/50/75/100%
5. Watch to end → expect `📹 GA4 Video: video_complete`

### Step 4: Verify in GA4
- GA4 → Realtime → Debug View
- Look for events with `debug_mode: true`
- Events should appear within 1-2 minutes

## Disable Test Mode
```javascript
localStorage.removeItem('ga_dev');
```
Then refresh the page.

## Notes
- Test mode persists across browser sessions until manually disabled
- URL parameter method is safest - no risk of production contamination
- All 6 video events use the same debug flag system
- Cross-language testing works the same way