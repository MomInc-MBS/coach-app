// Minimal, standalone inbox surface for D12 Armie letters (D23). Deliberately
// small: a badge button + a plain list dialog. The owner is building the
// battle-pass/achievements menu himself (D26) -- this is not that, and never
// grows into it. Hidden outright during camera-only mode (the
// `body[data-camera-workout]` rule below), matching "nothing appears during
// camera-only mode."
import {armieInbox,canOfferArmiePush,maybeRequestArmiePushPermission} from './armie-letters-client.mjs';

const STYLE = `
.armie-inbox-launcher{position:fixed;right:12px;bottom:12px;z-index:40;min-width:40px;height:40px;padding:0 10px;border-radius:20px;border:none;background:#1b1030;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35);}
.armie-inbox-launcher[data-unread="0"]{opacity:.55;}
body[data-camera-workout] .armie-inbox-launcher{display:none;}
.armie-inbox-dialog{max-width:360px;width:92vw;border:none;border-radius:12px;padding:0;color:#1b1030;}
.armie-inbox-dialog::backdrop{background:rgba(0,0,0,.4);}
.armie-inbox-dialog header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #e3ddf2;font:600 14px system-ui,sans-serif;}
.armie-inbox-dialog header button{border:none;background:none;font-size:18px;line-height:1;cursor:pointer;}
.armie-inbox-dialog ul{list-style:none;margin:0;padding:0;max-height:60vh;overflow:auto;}
.armie-inbox-dialog li{padding:10px 14px;border-bottom:1px solid #e3ddf2;font:13px system-ui,sans-serif;cursor:pointer;}
.armie-inbox-dialog li[data-read="0"]{background:#f2effa;font-weight:600;}
.armie-inbox-dialog li strong{display:block;margin-bottom:4px;}
.armie-inbox-dialog li p{margin:2px 0;opacity:.85;font-weight:400;}
.armie-inbox-notice{margin:0;padding:10px 14px;font:12px system-ui,sans-serif;background:#fff4d6;}
`;

let mountPromise = null;

// D23: iOS delivers web push only to the installed home-screen app. Explain
// that once here rather than nagging every time the inbox opens.
const isIosBrowserTab = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !navigator.standalone;

export function mountArmieInboxUI({root = document.body} = {}) {
 return mountPromise ??= (async () => {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.append(style);

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'armie-inbox-launcher';
  launcher.setAttribute('aria-label', 'Letters from Armie');
  const dialog = document.createElement('dialog');
  dialog.className = 'armie-inbox-dialog';
  root.append(launcher, dialog);

  const store = await armieInbox();

  async function refreshBadge() {
   const unread = await store.unreadCount();
   launcher.dataset.unread = String(unread);
   launcher.textContent = unread ? `✉ ${unread}` : '✉';
  }

  async function render() {
   const letters = await store.listLetters();
   const showNotice = isIosBrowserTab() && !(await store.hasSeenIosNotice());
   // D23: the permission ask exists only once a letter does, and runs from this tap.
   const offerPush = letters.length > 0 && canOfferArmiePush();
   dialog.innerHTML = `<header><strong>Armie</strong><button type="button" data-close aria-label="Close">×</button></header>`
    + (showNotice ? `<p class="armie-inbox-notice" data-ios-notice>On iPhone, add Coach to your Home Screen (Share → Add to Home Screen) to get these as notifications.</p>` : '')
    + (offerPush ? `<p class="armie-inbox-notice"><button type="button" data-push>Get Armie's letters as notifications</button></p>` : '')
    + `<ul>${letters.length ? letters.map(l => `<li data-read="${l.read}" data-id="${l.id}"><strong>${l.header}</strong>${l.lines.map(line => `<p>${line}</p>`).join('')}</li>`).join('') : '<li>No letters yet.</li>'}</ul>`;
   dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
   if (showNotice) void store.markIosNoticeSeen(); // shown once, never again
   dialog.querySelector('[data-push]')?.addEventListener('click', event => { event.currentTarget.parentElement.remove(); void maybeRequestArmiePushPermission(); }, {once: true});
   for (const li of dialog.querySelectorAll('li[data-id]')) {
    li.addEventListener('click', async () => { await store.markRead(li.dataset.id); li.dataset.read = '1'; await refreshBadge(); }, {once: true});
   }
  }

  launcher.addEventListener('click', async () => { await render(); dialog.showModal(); await refreshBadge(); });
  window.addEventListener('myr5:armie-inbox-updated', () => void refreshBadge());
  await refreshBadge();
  return {launcher, dialog};
 })();
}
