import {authTransitions} from './auth-transition.mjs';
import {loadLogin, authSettings} from './auth-client.mjs';
import {safeReturn} from './auth-paths.mjs';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const returnTo = safeReturn(params.get('return_to'));
const here = '/signin.html?return_to=' + encodeURIComponent(returnTo);

let currentClerk = null;
let currentListener = null;
let pendingLogin = false;

function error(e) {
  $('loginStatus').textContent = e.message || 'Login could not connect. Please retry.';
  $('retry').hidden = false;
}

async function startLogin({ fresh = false } = {}) {
  if (pendingLogin) return;
  pendingLogin = true;
  $('retry').hidden = true;
  $('loginStatus').textContent = 'Connecting...';
  try {
    const config = await authSettings({ force: fresh });
    if (!config.enabled) {
      authTransitions().invalidate();
      localStorage.removeItem('myr5-login-provider');
      error(Error('Sign-in is not available here yet.'));
      return;
    }
    if (!config.frontend || !config.publishableKey) {
      error(Error('Invalid Clerk configuration: frontend or publishableKey missing.'));
      return;
    }
    if (fresh) {
      if (currentClerk && typeof currentClerk.unmountSignIn === 'function') {
        try { currentClerk.unmountSignIn($('login')); } catch (_) {}
      }
      if (currentListener) {
        try { currentListener(); } catch (_) {}
        currentListener = null;
      }
      currentClerk = null;
    }
    if (!currentClerk) {
      currentClerk = await loadLogin();
    }

    const show = () => {
      $('loginStatus').textContent = '';
      if (currentClerk.user) {
        $('login').hidden = true;
        $('connected').hidden = false;
        $('who').textContent =
          'Signed in as ' +
          (currentClerk.user.primaryEmailAddress?.emailAddress || 'your Mom Inc account');
      } else {
        $('login').hidden = false;
        $('connected').hidden = true;
      }
    };

    if (!currentClerk.user) {
      $('login').hidden = false;
      $('connected').hidden = true;
      currentClerk.mountSignIn($('login'), {
        routing: 'hash',
        forceRedirectUrl: here,
        signUpForceRedirectUrl: here,
        appearance: { variables: { colorPrimary: '#9561c5', borderRadius: '12px' } }
      });
    }

    if (typeof currentClerk.addListener === 'function') {
      if (currentListener) {
        try { currentListener(); } catch (_) {}
      }
      currentListener = currentClerk.addListener(show);
    }

    $('continue').onclick = async () => {
      const button = $('continue');
      button.disabled = true;
      try {
        const transitions = authTransitions();
        transitions.invalidate();
        const ticket = transitions.capture();
        transitions.assertCurrent(ticket);
        localStorage.setItem('myr5-login-provider', 'clerk');
        transitions.invalidate();
        location.assign(returnTo);
      } catch (e) {
        error(e);
        button.disabled = false;
      }
    };

    $('switchAccount').onclick = async () => {
      try {
        authTransitions().invalidate();
        if (currentClerk && typeof currentClerk.signOut === 'function') {
          await currentClerk.signOut();
        }
        localStorage.removeItem('myr5-login-provider');
        location.replace(here);
      } catch (e) {
        error(e);
      }
    };

  } catch (e) {
    error(e);
  } finally {
    pendingLogin = false;

  }
}

$('retry').onclick = () => startLogin({ fresh: true });
startLogin({ fresh: true });
