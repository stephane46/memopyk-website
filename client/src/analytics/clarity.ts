/**
 * Microsoft Clarity SDK initialization
 *
 * Loads the Clarity tracking script dynamically when a project ID is configured.
 * Requires VITE_CLARITY_PROJECT_ID environment variable.
 */

let clarityInitialized = false;

export function initClarity(): void {
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
  if (!projectId || clarityInitialized) return;

  clarityInitialized = true;

  // Standard Clarity bootstrap snippet (async, non-blocking)
  (function (c: any, l: any, a: string, r: string, i: string) {
    c[a] = c[a] || function (...args: any[]) {
      (c[a].q = c[a].q || []).push(args);
    };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = 'https://www.clarity.ms/tag/' + i;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode!.insertBefore(t, y);
  })(window, document, 'clarity', 'script', projectId);

  console.log('[Clarity] Initialized with project:', projectId);
}
