# Language Detection Testing Guide

## Console Testing (Recommended Start)

Open your browser's Developer Console (F12) and run these commands:

### Test Scenarios

**1. English User Overseas (Common Problem)**
```javascript
// Simulate: English primary, French secondary (Canada/Belgium user)
testLanguageDetection(['en-US', 'en', 'fr-CA', 'fr']);
// Expected: Shows English

// Apply the test:
localStorage.removeItem('memopyk-language');
location.reload();
```

**2. French User**
```javascript
// Simulate: French primary
testLanguageDetection(['fr-FR', 'fr', 'en-US']);
// Expected: Shows French

// Apply the test:
localStorage.removeItem('memopyk-language');
location.reload();
```

**3. English User with Belgian French**
```javascript
// Simulate: English primary, Belgian French secondary
testLanguageDetection(['en-GB', 'en', 'fr-BE', 'nl']);
// Expected: Shows English

// Apply the test:
localStorage.removeItem('memopyk-language');
location.reload();
```

**4. Other Language User**
```javascript
// Simulate: German primary
testLanguageDetection(['de-DE', 'de', 'en-US']);
// Expected: Shows English (default)

// Apply the test:
localStorage.removeItem('memopyk-language');
location.reload();
```

**5. Reset to Original**
```javascript
// Clear test and restore original behavior
localStorage.removeItem('memopyk-language');
delete Object.getOwnPropertyDescriptor(navigator, 'languages');
location.reload();
```

## What to Look For

1. **Console Logs**: Check for "🌍 LANGUAGE DETECTION" messages showing:
   - `allLanguages`: Full browser language array
   - `primaryLanguage`: The first language being used for detection
   - Result: Whether French or English was selected

2. **URL Changes**: Watch the URL change from `/` to `/fr-FR` or `/en-US`

3. **Page Content**: Verify the navigation and content match the detected language

## Browser Language Settings (Alternative)

### Chrome:
1. Settings > Advanced > Languages
2. Add languages and reorder (drag to change priority)
3. Restart browser

### Firefox:
1. Settings > General > Language and Appearance
2. Choose languages and reorder
3. Restart browser

## Expected Results

- **Primary `en-*`**: English content, URL starts with `/en-US`
- **Primary `fr-*`**: French content, URL starts with `/fr-FR`
- **Other primary**: English content (default), URL starts with `/en-US`

## Testing Edge Cases

```javascript
// Empty languages array
testLanguageDetection([]);

// Only non-supported languages
testLanguageDetection(['de-DE', 'es-ES', 'it-IT']);

// Mixed case
testLanguageDetection(['EN-US', 'FR-ca']);
```

The fix ensures only the FIRST language in the browser's preference list determines the site language, preventing overseas English users from accidentally seeing French content due to secondary language preferences.