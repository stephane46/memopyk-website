# Puppeteer Screenshots Guide

Reference for taking reliable screenshots with Puppeteer, especially for React/Vite SPAs like MEMOPYK.

---

## Puppeteer MCP Tool (Claude's Tool)

Claude has access to a Puppeteer MCP tool for taking screenshots. This section documents its capabilities and limitations discovered through testing.

### Available Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Required. Name for the screenshot |
| `width` | number | Viewport width in pixels (default: 800) |
| `height` | number | Viewport height in pixels (default: 600) |
| `selector` | string | CSS selector to capture specific element |
| `encoded` | boolean | If true, returns base64 string instead of image |

### Missing Parameters (Not Exposed by MCP Wrapper)

| Parameter | Native Puppeteer | Workaround |
|-----------|------------------|------------|
| `path` | Save directly to disk | Use `encoded: true`, extract base64, decode manually |
| `clip` | `{x, y, width, height}` crop | Use `selector` to target specific element |
| `deviceScaleFactor` | 2x retina/zoom | None available |
| `fullPage` | Capture entire scrollable page | Increase `height` parameter significantly |

### Key Behaviors

1. **Screenshots appear in Artifacts panel** - Users see Puppeteer MCP screenshots in the Artifacts panel (bottom of screen), NOT inline in the chat conversation.

2. **Runs on Claude's remote environment** - The Puppeteer browser runs on Claude's Linux server, NOT on the user's machine. This means:
   - Cannot access `localhost` URLs from user's dev server
   - Must use publicly accessible URLs (staging/production)
   - Separate browser session (no access to user's logged-in state)

3. **For scrollable elements** - Increase viewport height to capture full content:
   ```
   # Short sidebar (cuts off)
   height: 600
   
   # Full sidebar (complete)
   height: 1500
   ```

4. **Element screenshots work** - The `selector` parameter successfully captures specific elements:
   ```
   selector: ".w-64"  # Captures sidebar only
   selector: "#root"  # Captures React root
   ```

### Usage Examples

**Full page screenshot:**
```
puppeteer_screenshot({
  name: "admin_dashboard",
  width: 1440,
  height: 900
})
```

**Element screenshot:**
```
puppeteer_screenshot({
  name: "sidebar",
  selector: ".w-64"
})
```

**Tall scrollable element:**
```
puppeteer_screenshot({
  name: "full_sidebar",
  selector: ".w-64",
  height: 1500
})
```

### Saving Screenshots Locally

The MCP tool cannot save directly to user's filesystem. Workaround options:

1. **User saves from Artifacts** - Right-click image in Artifacts panel, save as
2. **Base64 approach** (problematic) - Large base64 strings cause command timeouts
3. **User takes native screenshot** - Most reliable for local saving

### Tool Comparison

| Tool | Pros | Cons | Best For |
|------|------|------|----------|
| **Puppeteer MCP** | Automated, works on staging/prod URLs | No local save, can't reach user's localhost | Quick previews in Artifacts |
| **Claude in Chrome** | Accesses user's actual browser, sees localhost | Can't easily save to user's disk | Verification with auth |
| **Native browser** | 100% reliable, full control, saves locally | Manual | Production documentation |

---

## Basic Screenshots

### 1) Basic page screenshot (viewport only)

```javascript
import puppeteer from "puppeteer";

const browser = await puppeteer.launch();
const page = await browser.newPage();

await page.goto("https://example.com", { waitUntil: "networkidle2" });
await page.screenshot({ path: "page.png" });

await browser.close();
```

### 2) Full page screenshot (entire scroll height)

```javascript
await page.screenshot({
  path: "fullpage.png",
  fullPage: true
});
```

### 3) Set viewport size

Desktop:
```javascript
await page.setViewport({ width: 1440, height: 900 });
```

Mobile:
```javascript
await page.setViewport({ width: 375, height: 812, isMobile: true });
```

### 4) Screenshot of a specific element

```javascript
const element = await page.$("#hero");
await element.screenshot({ path: "hero.png" });
```

Or with selector:
```javascript
await page.waitForSelector(".card");
await page.locator(".card").screenshot({ path: "card.png" });
```

### 5) High-DPI / Retina screenshot

```javascript
await page.setViewport({
  width: 1440,
  height: 900,
  deviceScaleFactor: 2
});
```

### 6) Clip to exact coordinates

```javascript
await page.screenshot({
  path: "clip.png",
  clip: { x: 100, y: 200, width: 400, height: 300 }
});
```

### 7) Transparent background (PNG)

```javascript
await page.screenshot({
  path: "transparent.png",
  omitBackground: true
});
```

---

## React/Vite SPA Screenshots

React apps need extra waits for rendering, hydration, and lazy loads.

### 1) Launch + wait for React to finish

```javascript
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();

await page.setViewport({
  width: 1440,
  height: 900,
  deviceScaleFactor: 2
});

await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });

// Wait for React root to exist
await page.waitForSelector("#root", { visible: true });

// Wait for real UI (not skeleton)
await page.waitForFunction(() => {
  return document.querySelectorAll("img, video, canvas").length > 0;
});

// Give React one extra render frame
await page.waitForTimeout(300);
```

### 2) Kill animations + loaders before capture

```javascript
await page.addStyleTag({
  content: `
    * { animation: none !important; transition: none !important; }
    [data-loading], .skeleton, .spinner { display: none !important; }
  `
});
```

### 3) Screenshot (full page or component)

Full page:
```javascript
await page.screenshot({ path: "react-full.png", fullPage: true });
```

Single React component:
```javascript
await page.waitForSelector(".Card");
const card = await page.$(".Card");
await card.screenshot({ path: "card.png" });
```

### 4) React hydration-safe (Next.js, SSR)

```javascript
await page.goto(url, { waitUntil: "networkidle2" });

await page.waitForFunction(() => {
  return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
         document.querySelector("[data-reactroot], #__next, #root");
});
```

### 5) SPA route changes

```javascript
await page.click("a[href='/pricing']");
await page.waitForNavigation({ waitUntil: "networkidle2" });
await page.waitForTimeout(300);

await page.screenshot({ path: "pricing.png", fullPage: true });
```

### 6) Headless CI-safe flags

```javascript
const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});
```

---

## Production Helpers

### General screenshot helper

```javascript
async function screenshot(url, path) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "networkidle2" });

  await page.addStyleTag({
    content: "*{animation:none!important;transition:none!important}"
  });

  await page.screenshot({ path, fullPage: true });
  await browser.close();
}
```

### React-optimized helper

```javascript
export async function shotReact(url, file) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "domcontentloaded" });

  await page.waitForSelector("#root, #__next", { visible: true });
  await page.waitForTimeout(400);

  await page.addStyleTag({
    content: "*{animation:none!important;transition:none!important}"
  });

  await page.screenshot({ path: file, fullPage: true });
  await browser.close();
}
```

---

## MEMOPYK-Specific Usage

For the admin dashboard:

```javascript
// Navigate
await page.goto("http://localhost:5173/en-US/admin", { waitUntil: "networkidle2" });

// Wait for sidebar + content
await page.waitForSelector("#root", { visible: true });
await page.waitForSelector(".sidebar, nav", { visible: true });
await page.waitForTimeout(500);

// Kill cookie banner, modals, animations
await page.addStyleTag({
  content: `
    * { animation: none !important; transition: none !important; }
    [class*="cookie"], [class*="modal"], [class*="banner"] { display: none !important; }
  `
});

// Full page capture
await page.screenshot({ path: "admin-dashboard.png", fullPage: true });
```

---

## Quick Reference

| Goal | Method |
|------|--------|
| Viewport only | `screenshot({ path })` |
| Full scroll | `screenshot({ fullPage: true })` |
| Element only | `element.screenshot({ path })` |
| Retina quality | `setViewport({ deviceScaleFactor: 2 })` |
| Wait for React | `waitForSelector("#root")` + `waitForTimeout(300)` |
| Kill animations | `addStyleTag({ content: "*{animation:none!important}" })` |
| Hide modals | `addStyleTag({ content: ".modal{display:none!important}" })` |

---

**Created:** 2026-02-01  
**Updated:** 2026-02-02 - Added Puppeteer MCP Tool section with capabilities/limitations  
**Source:** Stéphane's Puppeteer reference collection
