import {loadLogin,authSettings} from './auth-client.mjs';
import {safeReturn} from './auth-paths.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),returnTo=safeReturn(params.get('return_to')),linking=params.get('link')==='1';
const here='/signin.html?return_to='+encodeURIComponent(returnTo)+(linking?'&link=1':'');
$('legacyContinue').href='/signin-with-chatgpt?return_to='+encodeURIComponent(returnTo);
$('legacyContinue').onclick=()=>localStorage.removeItem('myr5-login-provider');
$('legacyLink').href='/signin-with-chatgpt?return_to='+encodeURIComponent('/signin.html?link=1&return_to='+encodeURIComponent(returnTo));
$('retry').onclick=()=>location.reload();
function error(e){$('loginStatus').textContent=e.message||'Login could not connect. Please retry.';$('retry').hidden=false;}
try{
  const config=await authSettings();
  if(!config.enabled){location.replace($('legacyContinue').href);}else{
    const clerk=await loadLogin();
    if(linking)$('intro').textContent='Sign in below, then connect this login to your saved ChatGPT Coach.';
    const show=()=>{
      $('loginStatus').textContent='';
      if(clerk.user){$('login').hidden=true;$('connected').hidden=false;$('who').textContent='Signed in as '+(clerk.user.primaryEmailAddress?.emailAddress||'your Mom Inc account');$('continue').textContent=linking?'Connect and open my saved Coach':'Continue to Coach';}
    };
    if(clerk.user)show();else clerk.mountSignIn($('login'),{routing:'hash',forceRedirectUrl:here,signUpForceRedirectUrl:here,appearance:{variables:{colorPrimary:'#9561c5',borderRadius:'12px'}}});
    clerk.addListener(show);
    $('continue').onclick=async()=>{const button=$('continue');button.disabled=true;try{
      if(linking){const token=await clerk.session.getToken();const r=await fetch('/api/auth/link',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({confirm:true})});const v=await r.json();if(!r.ok)throw Error(v.error);}
      localStorage.setItem('myr5-login-provider','clerk');location.assign(returnTo);
    }catch(e){error(e);button.disabled=false;}};
    $('switchAccount').onclick=async()=>{await clerk.signOut();localStorage.removeItem('myr5-login-provider');location.replace(here);};
  }
}catch(e){error(e);}
