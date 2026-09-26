import {authTransitions} from './auth-transition.mjs';
import {loadLogin,authSettings} from './auth-client.mjs';
import {safeReturn} from './auth-paths.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),returnTo=safeReturn(params.get('return_to'));
const here='/signin.html?return_to='+encodeURIComponent(returnTo);
$('retry').onclick=()=>location.reload();
function error(e){$('loginStatus').textContent=e.message||'Login could not connect. Please retry.';$('retry').hidden=false;}
try{
  const config=await authSettings();
  // Clerk is the only sign-in. Without its configuration there is nowhere else to send the user.
  if(!config.enabled){authTransitions().invalidate();localStorage.removeItem('myr5-login-provider');error(Error('Sign-in is not available here yet.'));}else{
    const clerk=await loadLogin();
    const show=()=>{
      $('loginStatus').textContent='';
      if(clerk.user){$('login').hidden=true;$('connected').hidden=false;$('who').textContent='Signed in as '+(clerk.user.primaryEmailAddress?.emailAddress||'your Mom Inc account');}
    };
    if(clerk.user)show();else clerk.mountSignIn($('login'),{routing:'hash',forceRedirectUrl:here,signUpForceRedirectUrl:here,appearance:{variables:{colorPrimary:'#9561c5',borderRadius:'12px'}}});
    clerk.addListener(show);
    $('continue').onclick=async()=>{const button=$('continue');button.disabled=true;try{
      const transitions=authTransitions();transitions.invalidate();const ticket=transitions.capture();
      transitions.assertCurrent(ticket);localStorage.setItem('myr5-login-provider','clerk');transitions.invalidate();location.assign(returnTo);
    }catch(e){error(e);button.disabled=false;}};
    $('switchAccount').onclick=async()=>{try{authTransitions().invalidate();await clerk.signOut();localStorage.removeItem('myr5-login-provider');location.replace(here);}catch(e){error(e);}};
  }
}catch(e){error(e);}
