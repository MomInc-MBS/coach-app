// Lightweight best-effort UX gate for optional documents. This is not a
// security boundary: APIs/server entitlements remain authoritative.
// It runs before editor modules are imported so denied direct navigation does
// not bootstrap Three.js/React or editor document resources.
(function () {
  // Vite's dev client can evaluate an external script after currentScript has
  // cleared; the tag remains the unambiguous contract for this document.
  const script = document.currentScript || document.querySelector('script[data-entry][data-module]');
  if (!script?.dataset.entry || !script.dataset.module) return;
  const entry = script.dataset.entry;
  const fallback = '/pose.html?optional=' + encodeURIComponent(entry);
  const denied = () => { document.body.replaceChildren(); location.replace(fallback); };
  fetch('/api/account', { credentials: 'same-origin', cache: 'no-store' })
    .then(response => response.ok ? response.json() : null)
    .then(account => {
      if (!account?.entitlements?.coachArmy || account.entitlements.coachArmy.status !== 'completed') return denied();
      // Keep this file usable as a classic external script; Vite otherwise
      // rewrites import() into module syntax before the browser executes it.
      return (new Function('path', 'return import(path)'))(script.dataset.module);
    })
    .catch(denied);
})();
