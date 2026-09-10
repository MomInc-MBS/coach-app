export function isInstalled(win=window){return win.matchMedia('(display-mode: standalone)').matches||win.navigator.standalone===true;}
// Installation is optional. Account and workout requirements are enforced separately.
export function setupAllowed(){return true;}
