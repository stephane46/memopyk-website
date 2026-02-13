import { createRoot } from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import App from "./App";
import "./index.css";

// Remove server-injected SEO meta tags before React mounts.
// The server injects OG/Twitter tags for crawlers (which don't run JS).
// In browsers, react-helmet-async manages these tags — but it can't deduplicate
// server-injected tags that lack data-rh attributes. Removing them here lets
// Helmet be the sole owner, preventing duplicate og:title etc.
(function cleanupSsrSeoTags() {
  const marker = document.querySelector('meta[name="ssr-seo"][content="true"]');
  if (!marker) return;
  marker.remove();

  // Remove all server-injected OG, Twitter, and description meta tags
  // that don't have data-rh (i.e., not managed by react-helmet-async)
  const selectors = [
    'meta[property^="og:"]',
    'meta[name^="twitter:"]',
    'meta[name="description"]',
    'meta[name="keywords"]',
    'meta[name="robots"]',
    'link[rel="canonical"]',
    'link[rel="alternate"][hreflang]',
    'script[type="application/ld+json"]',
  ];
  for (const sel of selectors) {
    document.head.querySelectorAll(sel).forEach((el) => {
      if (!el.getAttribute('data-rh')) {
        el.remove();
      }
    });
  }
})();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
