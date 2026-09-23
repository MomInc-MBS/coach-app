let loading,mounted;

export async function openQuiltPortal({shouldShow=()=>true}={}) {
  if(mounted?.disposed)loading=null;
  if (!loading) {
    loading = (async () => {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = '/modules/portal/portal.css';
      const styled=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=()=>reject(new Error('Portal styles unavailable.'));});
      document.head.append(style);
      try{
        const [{mountPortal}]=await Promise.all([import('./portal.mjs'),styled]);
        mounted=await mountPortal();
        const dispose=mounted.dispose;mounted.dispose=()=>{dispose();style.remove();};
        return mounted;
      }catch(error){style.remove();throw error;}
    })().catch(error => {
      loading = null;
      throw error;
    });
  }
  const portal = await loading;
  if(!shouldShow())return null;
  portal.show();
  return portal;
}
