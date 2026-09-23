let loading;

export async function openQuiltPortal() {
  if (!loading) {
    loading = (async () => {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = '/modules/portal/portal.css';
      document.head.append(style);
      const { mountPortal } = await import('./portal.mjs');
      await mountPortal();
      return window.myr5Portal;
    })().catch(error => {
      loading = null;
      throw error;
    });
  }
  const portal = await loading;
  portal.show();
  return portal;
}
