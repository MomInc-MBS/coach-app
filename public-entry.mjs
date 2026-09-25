// Deferred bootstrap for optional editor documents. Open to guests and every
// account (no Coach Army gate); account-owned saves still go through the APIs.
(function () {
  // Vite's dev client can evaluate an external script after currentScript has
  // cleared; the tag remains the unambiguous contract for this document.
  const script = document.currentScript || document.querySelector('script[data-entry][data-module]');
  if (!script?.dataset.entry || !script.dataset.module) return;
  // Keep this file usable as a classic external script; Vite otherwise
  // rewrites import() into module syntax before the browser executes it.
  (new Function('path', 'return import(path)'))(script.dataset.module);
})();
